/**
 * Invoice orchestration — active provider + retry + email + admin alert.
 * Payment success must never be rolled back if invoicing fails.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { logCommerceEvent } from "@/lib/commerce/logging";
import { getSecrets } from "@/lib/commerce/secrets/store";
import { getCommerceSettings } from "@/lib/commerce/settings";
import { ensureInvoiceProvidersRegistered } from "@/lib/invoicing/providers";
import { getInvoiceProvider } from "@/lib/invoicing/registry";
import { getEmailProviderSettings } from "@/lib/notifications/email-provider";
import { getStoreSettings } from "@/lib/store/settings";
import { formatPublicOrderNumber } from "@/lib/shop/order-tracking-qr";
import type { ShopOrder } from "@/types/shop";

async function alertAdminInvoiceFailure(params: {
  order: ShopOrder;
  error: string;
  providerId: string;
}): Promise<void> {
  await logCommerceEvent({
    category: "invoice_failed",
    level: "error",
    providerId: params.providerId,
    orderId: params.order.id,
    message: params.error,
    details: { alert: true },
  });

  try {
    const emailSettings = await getEmailProviderSettings(true);
    const to =
      emailSettings.admin_notification_email?.trim() ||
      emailSettings.from_email?.trim();
    if (!to || emailSettings.mode !== "resend" || !emailSettings.resend_api_key) {
      console.error(
        "[invoicing] ADMIN ALERT — invoice failed for order",
        params.order.id,
        params.error
      );
      return;
    }

    const { Resend } = await import("resend");
    const resend = new Resend(emailSettings.resend_api_key);
    await resend.emails.send({
      from: `${emailSettings.from_name || "Nadeen Designs"} <${emailSettings.from_email}>`,
      to: [to],
      subject: `[Nadeen] Invoice failed — order ${formatPublicOrderNumber(params.order.id)}`,
      html: `<p>Invoice generation failed after payment.</p>
        <p><strong>Order:</strong> ${params.order.id}</p>
        <p><strong>Customer:</strong> ${params.order.name} / ${params.order.phone}</p>
        <p><strong>Provider:</strong> ${params.providerId}</p>
        <p><strong>Error:</strong> ${params.error}</p>
        <p>Order remains <strong>paid</strong>. Retry from Admin or wait for automatic retry.</p>`,
    });
  } catch (e) {
    console.error("[invoicing] admin alert email failed", e);
  }
}

async function storePdfLocally(
  orderId: string,
  documentNumber: string,
  pdfBytes: Uint8Array
): Promise<{ path: string; url: string }> {
  const dir = path.join(process.cwd(), "storage", "invoices");
  await mkdir(dir, { recursive: true });
  const safe = documentNumber.replace(/[^\w.-]+/g, "_") || orderId;
  const file = `${safe}.pdf`;
  const full = path.join(dir, file);
  await writeFile(full, pdfBytes);
  return {
    path: full,
    url: `/api/orders/${orderId}/invoice`,
  };
}

async function persistInvoiceDocument(row: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = createAdminClient();
    await supabase.from("invoice_documents").insert(row);
  } catch (e) {
    console.error("[invoicing] invoice_documents insert failed", e);
  }
}

async function enqueueRetry(params: {
  orderId: string;
  providerId: string;
  maxAttempts: number;
  backoffSeconds: number;
  error: string;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = createAdminClient();
    const next = new Date(
      Date.now() + params.backoffSeconds * 1000
    ).toISOString();
    await supabase.from("invoice_jobs").insert({
      order_id: params.orderId,
      provider_id: params.providerId,
      status: "pending",
      attempts: 0,
      max_attempts: params.maxAttempts,
      next_attempt_at: next,
      last_error: params.error,
    });
  } catch (e) {
    console.error("[invoicing] enqueue retry failed", e);
  }
}

async function emailInvoiceToCustomer(params: {
  order: ShopOrder;
  documentNumber: string;
  pdfBytes?: Uint8Array;
  subjectTpl: string;
  bodyTpl: string;
  storeName: string;
}): Promise<boolean> {
  const to = params.order.email?.trim();
  if (!to) return false;

  try {
    const emailSettings = await getEmailProviderSettings(true);
    if (emailSettings.mode !== "resend" || !emailSettings.resend_api_key) {
      return false;
    }

    const orderNumber = formatPublicOrderNumber(params.order.id);
    const replace = (s: string) =>
      s
        .replaceAll("{{order_number}}", orderNumber)
        .replaceAll("{{customer_name}}", params.order.name || "")
        .replaceAll("{{store_name}}", params.storeName)
        .replaceAll("{{document_number}}", params.documentNumber);

    const { Resend } = await import("resend");
    const resend = new Resend(emailSettings.resend_api_key);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      from: `${emailSettings.from_name || params.storeName} <${emailSettings.from_email}>`,
      to: [to],
      subject: replace(params.subjectTpl),
      html: replace(params.bodyTpl),
    };
    if (params.pdfBytes) {
      payload.attachments = [
        {
          filename: `${params.documentNumber || "invoice"}.pdf`,
          content: Buffer.from(params.pdfBytes),
        },
      ];
    }
    await resend.emails.send(payload);
    return true;
  } catch (e) {
    console.error("[invoicing] customer email failed", e);
    await logCommerceEvent({
      category: "api_error",
      level: "error",
      orderId: params.order.id,
      message: e instanceof Error ? e.message : "Invoice email failed",
    });
    return false;
  }
}

/** Issue via active provider after successful payment. */
export async function afterPaymentSucceeded(order: ShopOrder): Promise<void> {
  const commerce = await getCommerceSettings(true);
  if (!commerce.invoicing.auto_issue_on_payment) {
    return;
  }
  await issueInvoiceForOrder(order, { source: "payment" });
}

export async function issueInvoiceForOrder(
  order: ShopOrder,
  opts?: { source?: string; forceProviderId?: string }
): Promise<{ ok: boolean; error?: string }> {
  ensureInvoiceProvidersRegistered();
  const commerce = await getCommerceSettings(true);
  const store = await getStoreSettings(true);
  const providerId =
    opts?.forceProviderId || commerce.invoicing.active_provider_id || "internal";
  let provider = getInvoiceProvider(providerId);

  // Fallback to internal if selected provider missing / not ready
  if (!provider || (!provider.implementationReady && providerId !== "internal")) {
    await logCommerceEvent({
      category: "invoice",
      level: "warn",
      providerId,
      orderId: order.id,
      message: `Provider ${providerId} not ready — falling back to internal`,
    });
    provider = getInvoiceProvider("internal");
  }

  if (!provider) {
    return { ok: false, error: "No invoice provider available" };
  }

  const secrets = await getSecrets("invoice_provider", provider.id);
  const row = commerce.invoicing.providers.find((p) => p.id === provider!.id);
  const result = await provider.issueDocument({
    order,
    store,
    invoicing: commerce.invoicing,
    secrets,
    publicConfig: row?.public_config || {},
  });

  if (!result.ok) {
    await alertAdminInvoiceFailure({
      order,
      error: result.error,
      providerId: provider.id,
    });
    if (result.retryable !== false) {
      await enqueueRetry({
        orderId: order.id,
        providerId: provider.id,
        maxAttempts: commerce.invoicing.retry_max_attempts,
        backoffSeconds: commerce.invoicing.retry_backoff_seconds,
        error: result.error,
      });
    }
    return { ok: false, error: result.error };
  }

  let pdfUrl = result.pdfUrl || `/api/orders/${order.id}/invoice`;
  let pdfPath: string | undefined;
  if (result.pdfBytes) {
    try {
      const stored = await storePdfLocally(
        order.id,
        result.documentNumber,
        result.pdfBytes
      );
      pdfPath = stored.path;
      pdfUrl = stored.url;
    } catch (e) {
      console.error("[invoicing] local PDF store failed", e);
    }
  }

  await persistInvoiceDocument({
    order_id: order.id,
    provider_id: provider.id,
    status: "issued",
    document_number: result.documentNumber,
    external_id: result.externalId ?? null,
    pdf_storage_path: pdfPath ?? null,
    pdf_url: pdfUrl,
    metadata: result.metadata ?? {},
  });

  await logCommerceEvent({
    category: "invoice",
    providerId: provider.id,
    orderId: order.id,
    message: `Invoice issued ${result.documentNumber}`,
    details: { source: opts?.source },
  });

  if (commerce.invoicing.auto_email_on_issue) {
    const emailed = await emailInvoiceToCustomer({
      order,
      documentNumber: result.documentNumber,
      pdfBytes: result.pdfBytes,
      subjectTpl: commerce.invoicing.email_subject,
      bodyTpl: commerce.invoicing.email_body_html,
      storeName: store.general.store_name || "Nadeen Designs",
    });
    if (emailed && isSupabaseConfigured()) {
      try {
        const supabase = createAdminClient();
        await supabase
          .from("invoice_documents")
          .update({
            status: "emailed",
            email_sent_at: new Date().toISOString(),
          })
          .eq("order_id", order.id)
          .eq("document_number", result.documentNumber);
      } catch {
        /* non-fatal */
      }
    }
  }

  return { ok: true };
}

/** Process due invoice_jobs (call from cron / admin retry). */
export async function processDueInvoiceJobs(limit = 10): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  ensureInvoiceProvidersRegistered();

  const supabase = createAdminClient();
  const { data: jobs } = await supabase
    .from("invoice_jobs")
    .select("*")
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at", { ascending: true })
    .limit(limit);

  if (!jobs?.length) return 0;

  let done = 0;
  for (const job of jobs) {
    await supabase
      .from("invoice_jobs")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", job.id);

    const { data: order } = await supabase
      .from("shop_orders")
      .select("*")
      .eq("id", job.order_id)
      .maybeSingle();

    if (!order) {
      await supabase
        .from("invoice_jobs")
        .update({ status: "cancelled", last_error: "order missing" })
        .eq("id", job.id);
      continue;
    }

    const result = await issueInvoiceForOrder(order as ShopOrder, {
      source: "retry",
      forceProviderId: job.provider_id,
    });

    const attempts = Number(job.attempts || 0) + 1;
    if (result.ok) {
      await supabase
        .from("invoice_jobs")
        .update({
          status: "succeeded",
          attempts,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      done += 1;
    } else {
      const commerce = await getCommerceSettings(true);
      const max = Number(job.max_attempts) || commerce.invoicing.retry_max_attempts;
      const backoff = commerce.invoicing.retry_backoff_seconds * Math.max(1, attempts);
      const next = new Date(Date.now() + backoff * 1000).toISOString();
      await supabase
        .from("invoice_jobs")
        .update({
          status: attempts >= max ? "failed" : "pending",
          attempts,
          next_attempt_at: next,
          last_error: result.error,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }
  }

  return done;
}
