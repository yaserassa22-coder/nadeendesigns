/**
 * Payment orchestration — create intents, mark paid, process webhooks.
 * Provider-agnostic: only talks to PaymentProvider registry.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { logCommerceEvent } from "@/lib/commerce/logging";
import { getSecrets } from "@/lib/commerce/secrets/store";
import {
  getCommerceMode,
  getCommerceSettings,
  getPaymentRow,
} from "@/lib/commerce/settings";
import { ensurePaymentProvidersRegistered } from "@/lib/payments/providers";
import { getPaymentProvider } from "@/lib/payments/registry";
import { afterPaymentSucceeded } from "@/lib/invoicing/service";
import { sanitizePayPlusPayload } from "@/lib/payplus/client";
import type { ShopOrder } from "@/types/shop";

export type StartPaymentResult =
  | {
      ok: true;
      transactionId: string;
      status: string;
      redirectUrl?: string;
      clientSecret?: string;
    }
  | { ok: false; error: string };

async function insertTransaction(row: Record<string, unknown>): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return `mem-tx-${Date.now()}`;
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("payment_transactions")
      .insert(row)
      .select("id")
      .maybeSingle();
    if (error || !data) return null;
    return data.id as string;
  } catch {
    return null;
  }
}

async function updateTransaction(
  id: string,
  patch: Record<string, unknown>
): Promise<void> {
  if (!isSupabaseConfigured() || id.startsWith("mem-")) return;
  try {
    const supabase = createAdminClient();
    await supabase
      .from("payment_transactions")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
  } catch {
    /* non-fatal */
  }
}

async function patchOrderPayment(
  orderId: string,
  patch: Record<string, unknown>
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = createAdminClient();
    await supabase.from("shop_orders").update(patch).eq("id", orderId);
  } catch {
    /* column may be missing until migration */
  }
}

async function findTransactionId(params: {
  orderId: string;
  providerId: string;
  externalId?: string;
}): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createAdminClient();
    if (params.externalId) {
      const { data: byExternal } = await supabase
        .from("payment_transactions")
        .select("id")
        .eq("provider_id", params.providerId)
        .eq("external_id", params.externalId)
        .maybeSingle();
      if (byExternal?.id) return byExternal.id as string;
    }
    const { data } = await supabase
      .from("payment_transactions")
      .select("id")
      .eq("order_id", params.orderId)
      .eq("provider_id", params.providerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data?.id as string) || null;
  } catch {
    return null;
  }
}

async function getOrderPaymentStatus(orderId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("shop_orders")
      .select("payment_status")
      .eq("id", orderId)
      .maybeSingle();
    return (data?.payment_status as string) || null;
  } catch {
    return null;
  }
}

export async function startOrderPayment(params: {
  order: ShopOrder;
  providerId: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<StartPaymentResult> {
  ensurePaymentProvidersRegistered();
  const provider = getPaymentProvider(params.providerId);
  if (!provider) {
    return { ok: false, error: `Unknown payment provider: ${params.providerId}` };
  }

  const commerce = await getCommerceSettings(true);
  const row = getPaymentRow(commerce, params.providerId);
  if (!row?.enabled) {
    return { ok: false, error: "Payment method is disabled" };
  }

  const mode = getCommerceMode(commerce);
  const secrets = await getSecrets("payment_provider", params.providerId);
  const amount = Number(params.order.total) || 0;
  const idempotencyKey = `pay:${params.order.id}:${params.providerId}`;

  const txId = await insertTransaction({
    order_id: params.order.id,
    provider_id: params.providerId,
    mode,
    status: "pending",
    amount,
    currency: "ILS",
    idempotency_key: idempotencyKey,
    metadata: {},
  });

  if (!txId) {
    await logCommerceEvent({
      category: "api_error",
      level: "error",
      providerId: params.providerId,
      orderId: params.order.id,
      message: "Failed to create payment_transactions row — run APPLY_COMMERCE_PAYMENTS_INVOICING.sql",
    });
  }

  await patchOrderPayment(params.order.id, {
    payment_provider_id: params.providerId,
    payment_status: "pending",
    payment_transaction_id: txId,
  });

  const result = await provider.createPayment({
    order: params.order,
    amount,
    currency: "ILS",
    mode,
    secrets,
    publicConfig: row.public_config || {},
    returnUrl: params.returnUrl,
    cancelUrl: params.cancelUrl,
    idempotencyKey,
  });

  if (!result.ok) {
    if (txId) {
      await updateTransaction(txId, {
        status: "failed",
        error_message: result.error,
        error_code: result.code ?? null,
      });
    }
    await logCommerceEvent({
      category: "payment_failed",
      level: "error",
      providerId: params.providerId,
      orderId: params.order.id,
      transactionId: txId,
      message: result.error,
    });
    // COD-style / offline: still allow order with unpaid status
    if (params.providerId === "cod") {
      return {
        ok: true,
        transactionId: txId || "",
        status: "pending",
      };
    }
    return { ok: false, error: result.error };
  }

  if (txId) {
    await updateTransaction(txId, {
      status: result.status,
      external_id: result.externalId ?? null,
      redirect_url: result.redirectUrl ?? null,
      client_secret: result.clientSecret ?? null,
      metadata: result.metadata ?? {},
      paid_at: result.status === "succeeded" ? new Date().toISOString() : null,
    });
  }

  await logCommerceEvent({
    category: "payment",
    providerId: params.providerId,
    orderId: params.order.id,
    transactionId: txId,
    message: `Payment ${result.status} via ${params.providerId}`,
    details: { externalId: result.externalId },
  });

  if (result.status === "succeeded") {
    await markOrderPaid({
      order: params.order,
      providerId: params.providerId,
      transactionId: txId,
      externalId: result.externalId,
    });
  }

  return {
    ok: true,
    transactionId: txId || "",
    status: result.status,
    redirectUrl: result.redirectUrl,
    clientSecret: result.clientSecret,
  };
}

/** Mark order paid + trigger invoice orchestration. Idempotent. */
export async function markOrderPaid(params: {
  order: ShopOrder;
  providerId: string;
  transactionId?: string | null;
  externalId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const alreadyPaid =
    params.order.payment_status === "paid" ||
    (await getOrderPaymentStatus(params.order.id)) === "paid";
  const paidAt = params.order.payment_paid_at || new Date().toISOString();

  let transactionId = params.transactionId ?? null;
  if (!transactionId) {
    transactionId = await findTransactionId({
      orderId: params.order.id,
      providerId: params.providerId,
      externalId: params.externalId,
    });
  }

  if (transactionId) {
    await updateTransaction(transactionId, {
      status: "succeeded",
      paid_at: paidAt,
      external_id: params.externalId ?? null,
      ...(params.metadata ? { metadata: params.metadata } : {}),
    });
  }

  if (!alreadyPaid) {
    await patchOrderPayment(params.order.id, {
      payment_status: "paid",
      payment_paid_at: paidAt,
      payment_provider_id: params.providerId,
      payment_transaction_id: transactionId,
      status: "payment_received",
    });

    await logCommerceEvent({
      category: "payment",
      providerId: params.providerId,
      orderId: params.order.id,
      transactionId,
      message: "Order marked paid",
    });
  }

  // Invoice after payment — failures must not undo paid status.
  // Duplicate callbacks still attempt invoice (issueInvoiceForOrder is idempotent).
  try {
    await afterPaymentSucceeded({
      ...params.order,
      payment_status: "paid",
      status: "payment_received",
    } as ShopOrder);
  } catch (e) {
    await logCommerceEvent({
      category: "invoice_failed",
      level: "error",
      orderId: params.order.id,
      message:
        e instanceof Error
          ? e.message
          : "Invoice orchestration failed after payment",
    });
  }
}

async function markOrderPaymentUnsuccessful(params: {
  orderId: string;
  providerId: string;
  status: "failed" | "cancelled" | "refunded";
  externalId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const current = await getOrderPaymentStatus(params.orderId);
  if (current === "paid") return;

  const txId = await findTransactionId({
    orderId: params.orderId,
    providerId: params.providerId,
    externalId: params.externalId,
  });
  if (txId) {
    await updateTransaction(txId, {
      status: params.status,
      external_id: params.externalId ?? null,
      ...(params.metadata ? { metadata: params.metadata } : {}),
    });
  }
  await patchOrderPayment(params.orderId, {
    payment_status: params.status,
    payment_provider_id: params.providerId,
    payment_transaction_id: txId,
  });
  await logCommerceEvent({
    category: params.status === "refunded" ? "refund" : "payment_failed",
    level: "warn",
    providerId: params.providerId,
    orderId: params.orderId,
    transactionId: txId,
    message: `Payment ${params.status}`,
  });
}

export async function refundOrderPayment(params: {
  order: ShopOrder;
  amount: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  ensurePaymentProvidersRegistered();
  const providerId = params.order.payment_provider_id || "";
  const provider = getPaymentProvider(providerId);
  if (!provider?.refund) {
    return { ok: false, error: "Refunds are not supported for this provider" };
  }

  const commerce = await getCommerceSettings(true);
  const row = getPaymentRow(commerce, providerId);
  const secrets = await getSecrets("payment_provider", providerId);
  const txId = await findTransactionId({
    orderId: params.order.id,
    providerId,
    externalId: params.order.payment_transaction_id || undefined,
  });

  let externalId = "";
  if (txId && isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("payment_transactions")
        .select("external_id, metadata")
        .eq("id", txId)
        .maybeSingle();
      const metadata = (data?.metadata || {}) as Record<string, unknown>;
      externalId = String(
        metadata.transaction_uid || data?.external_id || ""
      );
    } catch {
      /* continue */
    }
  }

  if (!externalId) {
    return { ok: false, error: "Missing provider transaction id for refund" };
  }

  await logCommerceEvent({
    category: "refund",
    providerId,
    orderId: params.order.id,
    transactionId: txId,
    message: "Refund requested",
  });

  const result = await provider.refund({
    externalId,
    amount: params.amount,
    secrets,
    publicConfig: row?.public_config || {},
    mode: getCommerceMode(commerce),
  });

  if (!result.ok) {
    await logCommerceEvent({
      category: "refund",
      level: "error",
      providerId,
      orderId: params.order.id,
      transactionId: txId,
      message: result.error,
    });
    return result;
  }

  await markOrderPaymentUnsuccessful({
    orderId: params.order.id,
    providerId,
    status: "refunded",
    externalId,
  });
  await logCommerceEvent({
    category: "refund",
    providerId,
    orderId: params.order.id,
    transactionId: txId,
    message: "Refund succeeded",
  });
  return { ok: true };
}

export async function processPaymentWebhook(params: {
  providerId: string;
  rawBody: string;
  headers: Record<string, string>;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  ensurePaymentProvidersRegistered();
  const provider = getPaymentProvider(params.providerId);
  if (!provider?.verifyWebhook) {
    return { status: 404, body: { error: "Provider webhook not supported" } };
  }

  const commerce = await getCommerceSettings(true);
  const row = getPaymentRow(commerce, params.providerId);
  const mode = getCommerceMode(commerce);
  const secrets = await getSecrets("payment_provider", params.providerId);

  const verified = await provider.verifyWebhook({
    rawBody: params.rawBody,
    headers: params.headers,
    secrets,
    publicConfig: row?.public_config || {},
    mode,
  });

  if (!verified.ok && verified.error === "ipn_unavailable") {
    await logCommerceEvent({
      category: "webhook",
      level: "error",
      providerId: params.providerId,
      message: "PayPlus IPN unavailable — will retry",
    });
    return { status: 500, body: { error: "ipn_unavailable" } };
  }

  let webhookRowId: string | null = null;
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      if (verified.ok && verified.eventId) {
        const { data: existing } = await supabase
          .from("payment_webhook_events")
          .select("id, processing_status")
          .eq("provider_id", params.providerId)
          .eq("event_id", verified.eventId)
          .maybeSingle();
        if (existing) {
          await logCommerceEvent({
            category: "webhook",
            level: "warn",
            providerId: params.providerId,
            message: `Duplicate webhook ${verified.eventId}`,
          });
          return {
            status: 200,
            body: { ok: true, duplicate: true },
          };
        }
      }

      const sanitizedPayload = (() => {
        try {
          return sanitizePayPlusPayload(JSON.parse(params.rawBody));
        } catch {
          return { raw: params.rawBody.slice(0, 2000) };
        }
      })();

      const { data } = await supabase
        .from("payment_webhook_events")
        .insert({
          provider_id: params.providerId,
          event_id: verified.ok ? verified.eventId : verified.eventId ?? null,
          event_type: verified.ok
            ? verified.eventType
            : verified.eventType ?? null,
          signature_valid: verified.ok
            ? verified.signatureValid
            : verified.signatureValid,
          processing_status: "received",
          payload: sanitizedPayload,
          headers: {
            "user-agent": params.headers["user-agent"] || "",
            hash: params.headers["hash"] ? "present" : "missing",
          },
          error_message: verified.ok ? null : verified.error,
        })
        .select("id")
        .maybeSingle();
      webhookRowId = data?.id ?? null;
    } catch (e) {
      console.error("[webhook] persist failed", e);
    }
  }

  await logCommerceEvent({
    category: "webhook",
    level: verified.ok ? "info" : "error",
    providerId: params.providerId,
    message: verified.ok
      ? `Webhook ${verified.eventType}`
      : verified.error,
    details: { eventId: verified.ok ? verified.eventId : null },
  });

  if (!verified.ok) {
    return {
      status: verified.signatureValid ? 400 : 401,
      body: { error: verified.error },
    };
  }

  if (verified.paymentStatus === "succeeded" && verified.orderId) {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createAdminClient();
        const { data: order } = await supabase
          .from("shop_orders")
          .select("*")
          .eq("id", verified.orderId)
          .maybeSingle();
        if (order) {
          await markOrderPaid({
            order: order as ShopOrder,
            providerId: params.providerId,
            externalId: verified.externalId,
            metadata: verified.metadata,
          });
        }
      } catch (e) {
        console.error("[webhook] mark paid failed", e);
      }
    }

    if (webhookRowId && isSupabaseConfigured()) {
      const supabase = createAdminClient();
      await supabase
        .from("payment_webhook_events")
        .update({
          processing_status: "processed",
          processed_at: new Date().toISOString(),
          order_id: verified.orderId,
        })
        .eq("id", webhookRowId);
    }
  } else if (
    (verified.paymentStatus === "failed" ||
      verified.paymentStatus === "cancelled" ||
      verified.paymentStatus === "refunded") &&
    verified.orderId
  ) {
    await markOrderPaymentUnsuccessful({
      orderId: verified.orderId,
      providerId: params.providerId,
      status: verified.paymentStatus,
      externalId: verified.externalId,
      metadata: verified.metadata,
    });
    if (webhookRowId && isSupabaseConfigured()) {
      const supabase = createAdminClient();
      await supabase
        .from("payment_webhook_events")
        .update({
          processing_status: "processed",
          processed_at: new Date().toISOString(),
          order_id: verified.orderId,
        })
        .eq("id", webhookRowId);
    }
  } else if (webhookRowId && isSupabaseConfigured()) {
    const supabase = createAdminClient();
    await supabase
      .from("payment_webhook_events")
      .update({
        processing_status:
          verified.paymentStatus === "ignored" ? "ignored" : "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", webhookRowId);
  }

  return { status: 200, body: { ok: true } };
}
