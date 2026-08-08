/**
 * Bit (Israel) — first-class payment provider.
 * Admin enters credentials when Bit publishes/changes APIs; no hardcoded secrets.
 * Charge/webhook adapters stay pluggable so activation needs credentials only.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  TestConnectionResult,
  WebhookVerifyInput,
  WebhookVerifyResult,
} from "../types";

function verifyHmacSha256(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader.replace(/^sha256=/i, "").trim());
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * When BIT_API_BASE_URL is set (or public_config.api_base_url), live create/test
 * can call Bit. Until then, credentials still save and webhooks verify HMAC.
 */
async function bitApiBase(publicConfig: Record<string, string>): Promise<string> {
  return (
    publicConfig.api_base_url?.trim() ||
    process.env.BIT_API_BASE_URL?.trim() ||
    ""
  );
}

export const bitPaymentProvider: PaymentProvider = {
  id: "bit",
  label: {
    ar: "Bit",
    he: "ביט",
    en: "Bit",
  },
  defaultSortOrder: 2,
  implementationReady: true,
  credentialFields: [
    {
      key: "api_key",
      label: "API Key",
      label_he: "מפתח API",
      kind: "secret",
      required: true,
    },
    {
      key: "secret_key",
      label: "Secret / Private Key",
      label_he: "מפתח סודי",
      kind: "secret",
      required: true,
    },
    {
      key: "merchant_id",
      label: "Merchant ID",
      label_he: "מזהה סוחר",
      kind: "public",
      required: true,
    },
    {
      key: "webhook_secret",
      label: "Webhook Secret",
      label_he: "סוד Webhook",
      kind: "secret",
      required: true,
      help: "Used to verify Bit payment webhooks (HMAC-SHA256).",
    },
    {
      key: "api_base_url",
      label: "API Base URL (optional)",
      label_he: "כתובת API (אופציונלי)",
      kind: "public",
      inputType: "url",
      required: false,
      help: "Set when Bit publishes the production API endpoint.",
    },
  ],
  requiredSecretKeys: ["api_key", "secret_key", "webhook_secret"],
  supportsWebhook: true,
  supportsRefund: false,
  supportsTestConnection: true,

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const base = await bitApiBase(input.publicConfig);
    if (!base) {
      return {
        ok: false,
        error:
          "Bit credentials are saved. Set API Base URL in Admin (or BIT_API_BASE_URL) when Bit API is available.",
        code: "bit_api_base_missing",
      };
    }

    const merchantId =
      input.publicConfig.merchant_id || input.secrets.merchant_id;
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${input.secrets.api_key}`,
          "X-Bit-Secret": input.secrets.secret_key,
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({
          merchantId,
          amount: input.amount,
          currency: input.currency,
          orderId: input.order.id,
          returnUrl: input.returnUrl,
          cancelUrl: input.cancelUrl,
          mode: input.mode,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!res.ok) {
        return {
          ok: false,
          error:
            (typeof data.message === "string" && data.message) ||
            `Bit API error (${res.status})`,
          code: "bit_api_error",
        };
      }

      return {
        ok: true,
        status: "requires_action",
        externalId: String(data.id || data.paymentId || ""),
        redirectUrl:
          typeof data.redirectUrl === "string"
            ? data.redirectUrl
            : typeof data.checkoutUrl === "string"
              ? data.checkoutUrl
              : undefined,
        metadata: data,
      };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Bit request failed",
        code: "bit_network_error",
      };
    }
  },

  async verifyWebhook(
    input: WebhookVerifyInput
  ): Promise<WebhookVerifyResult> {
    const sig =
      input.headers["x-bit-signature"] ||
      input.headers["x-signature"] ||
      input.headers["bit-signature"];
    const valid = verifyHmacSha256(
      input.rawBody,
      sig,
      input.secrets.webhook_secret || ""
    );
    if (!valid) {
      return {
        ok: false,
        signatureValid: false,
        error: "Invalid Bit webhook signature",
      };
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(input.rawBody) as Record<string, unknown>;
    } catch {
      return {
        ok: false,
        signatureValid: true,
        error: "Invalid JSON payload",
      };
    }

    const eventId = String(
      payload.eventId || payload.id || payload.paymentId || `bit-${Date.now()}`
    );
    const eventType = String(payload.type || payload.event || "payment");
    const statusRaw = String(
      payload.status || payload.paymentStatus || ""
    ).toLowerCase();

    let paymentStatus:
      | "succeeded"
      | "failed"
      | "cancelled"
      | "refunded"
      | "processing"
      | "ignored" = "ignored";
    if (["paid", "succeeded", "success", "completed"].includes(statusRaw)) {
      paymentStatus = "succeeded";
    } else if (["failed", "declined", "error"].includes(statusRaw)) {
      paymentStatus = "failed";
    } else if (["cancelled", "canceled"].includes(statusRaw)) {
      paymentStatus = "cancelled";
    } else if (["refunded"].includes(statusRaw)) {
      paymentStatus = "refunded";
    } else if (["pending", "processing"].includes(statusRaw)) {
      paymentStatus = "processing";
    }

    return {
      ok: true,
      eventId,
      eventType,
      signatureValid: true,
      orderId:
        typeof payload.orderId === "string"
          ? payload.orderId
          : typeof payload.order_id === "string"
            ? payload.order_id
            : undefined,
      externalId: String(payload.paymentId || payload.id || ""),
      paymentStatus,
      amount:
        typeof payload.amount === "number" ? payload.amount : undefined,
      metadata: payload,
    };
  },

  async testConnection(input): Promise<TestConnectionResult> {
    const missing = bitPaymentProvider.requiredSecretKeys.filter(
      (k) => !input.secrets[k]?.trim()
    );
    if (missing.length || !input.publicConfig.merchant_id?.trim()) {
      return {
        ok: false,
        message: `Missing: ${[...missing, !input.publicConfig.merchant_id ? "merchant_id" : ""].filter(Boolean).join(", ")}`,
      };
    }

    const base = await bitApiBase(input.publicConfig);
    if (!base) {
      return {
        ok: true,
        message:
          "Bit credentials saved. Add API Base URL to run a live connectivity probe.",
      };
    }

    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/health`, {
        headers: {
          Authorization: `Bearer ${input.secrets.api_key}`,
          "X-Bit-Secret": input.secrets.secret_key,
        },
      });
      if (res.ok) {
        return { ok: true, message: "Bit API reachable." };
      }
      return {
        ok: false,
        message: `Bit health check failed (${res.status}).`,
      };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : "Bit health check failed",
      };
    }
  },
};
