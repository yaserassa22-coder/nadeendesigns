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
}): Promise<void> {
  const paidAt = new Date().toISOString();

  if (params.transactionId) {
    await updateTransaction(params.transactionId, {
      status: "succeeded",
      paid_at: paidAt,
      external_id: params.externalId ?? null,
    });
  }

  await patchOrderPayment(params.order.id, {
    payment_status: "paid",
    payment_paid_at: paidAt,
    payment_provider_id: params.providerId,
    payment_transaction_id: params.transactionId ?? null,
    status: "payment_received",
  });

  await logCommerceEvent({
    category: "payment",
    providerId: params.providerId,
    orderId: params.order.id,
    transactionId: params.transactionId,
    message: "Order marked paid",
  });

  // Invoice after payment — failures must not undo paid status
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
          payload: (() => {
            try {
              return JSON.parse(params.rawBody);
            } catch {
              return { raw: params.rawBody.slice(0, 2000) };
            }
          })(),
          headers: params.headers,
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
