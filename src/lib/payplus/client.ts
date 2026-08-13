/**
 * Official PayPlus REST helpers (server-side only).
 * Docs: https://docs.payplus.co.il
 *
 * Staging:  https://restapidev.payplus.co.il/api/v1.0/
 * Production: https://restapi.payplus.co.il/api/v1.0/
 *
 * Never log api-key / secret-key or card data.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentMode } from "@/lib/payments/types";

export const PAYPLUS_PROVIDER_ID = "payplus";

export const PAYPLUS_STAGING_BASE =
  "https://restapidev.payplus.co.il/api/v1.0";
export const PAYPLUS_PRODUCTION_BASE =
  "https://restapi.payplus.co.il/api/v1.0";

export const PAYPLUS_INVOICE_NOT_CONFIGURED =
  "PayPlus invoicing is not configured or enabled.";

export const PAYPLUS_DOC_TYPES = [
  "inv_tax_receipt",
  "inv_tax",
  "inv_receipt",
  "inv_proforma",
] as const;

export type PayPlusDocType = (typeof PAYPLUS_DOC_TYPES)[number];

export type PayPlusAuth = {
  apiKey: string;
  secretKey: string;
};

export type PayPlusApiResult = {
  ok: boolean;
  status: number;
  json: Record<string, unknown>;
};

const CARD_KEYS = new Set([
  "card_information",
  "card_number",
  "cvv",
  "cvv2",
  "track2",
  "pan",
  "secret_key",
  "secret-key",
  "api_key",
  "api-key",
]);

export function payplusBaseUrl(mode: PaymentMode): string {
  return mode === "live" ? PAYPLUS_PRODUCTION_BASE : PAYPLUS_STAGING_BASE;
}

export function isPayPlusInvoiceModuleEnabled(
  publicConfig: Record<string, string>
): boolean {
  const raw = (publicConfig.invoice_module_enabled || "").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes" || raw === "on";
}

export function resolvePayPlusDocType(
  publicConfig: Record<string, string>
): PayPlusDocType {
  const raw = (publicConfig.document_type || "").trim();
  if ((PAYPLUS_DOC_TYPES as readonly string[]).includes(raw)) {
    return raw as PayPlusDocType;
  }
  return "inv_tax_receipt";
}

export function sanitizePayPlusPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizePayPlusPayload);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (CARD_KEYS.has(key.toLowerCase())) continue;
      out[key] = sanitizePayPlusPayload(nested);
    }
    return out;
  }
  return value;
}

function buffersEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Official callback validation:
 * HMAC-SHA256(JSON body, secret-key) → base64, compared to `hash` header.
 * user-agent must be PayPlus.
 * https://docs.payplus.co.il/reference/validate-requests-received-from-payplus
 */
export function verifyPayPlusCallbackHash(params: {
  rawBody: string;
  headers: Record<string, string>;
  secretKey: string;
}): boolean {
  const userAgent = params.headers["user-agent"] || "";
  if (userAgent !== "PayPlus") return false;
  const received = params.headers["hash"]?.trim();
  if (!received || !params.secretKey) return false;

  const candidates = [params.rawBody];
  try {
    const parsed = JSON.parse(params.rawBody) as unknown;
    candidates.push(JSON.stringify(parsed));
  } catch {
    /* raw body is not JSON */
  }

  const receivedBuf = Buffer.from(received);
  for (const message of candidates) {
    if (!message) continue;
    const expected = createHmac("sha256", params.secretKey)
      .update(message)
      .digest("base64");
    if (buffersEqual(Buffer.from(expected), receivedBuf)) return true;
  }
  return false;
}

export async function payplusRequest(params: {
  mode: PaymentMode;
  auth: PayPlusAuth;
  method: "GET" | "POST";
  path: string;
  body?: Record<string, unknown>;
}): Promise<PayPlusApiResult> {
  const url = `${payplusBaseUrl(params.mode)}${params.path.startsWith("/") ? params.path : `/${params.path}`}`;
  const res = await fetch(url, {
    method: params.method,
    headers: {
      "Content-Type": "application/json",
      "api-key": params.auth.apiKey,
      "secret-key": params.auth.secretKey,
    },
    body:
      params.method === "POST" && params.body
        ? JSON.stringify(params.body)
        : undefined,
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, json };
}

export function payplusResultsOk(json: Record<string, unknown>): boolean {
  const results = json.results as Record<string, unknown> | undefined;
  if (!results) return false;
  const status = String(results.status || "").toLowerCase();
  const code = Number(results.code ?? -1);
  return status === "success" && (code === 0 || Number.isNaN(code));
}

export function payplusResultsMessage(json: Record<string, unknown>): string {
  const results = json.results as Record<string, unknown> | undefined;
  if (typeof results?.description === "string" && results.description.trim()) {
    return results.description;
  }
  if (typeof json.error === "string" && json.error.trim()) return json.error;
  return "PayPlus request failed";
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function payplusTransactionStatusCode(payload: Record<string, unknown>): string {
  const transaction =
    asRecord(payload.transaction) ||
    asRecord(asRecord(payload.data)?.transaction) ||
    asRecord(asRecord(payload.data)?.data);
  if (typeof transaction?.status_code === "string") return transaction.status_code;
  if (typeof payload.status_code === "string") return payload.status_code;
  return "";
}

export function payplusTransactionUid(payload: Record<string, unknown>): string {
  const transaction =
    asRecord(payload.transaction) ||
    asRecord(asRecord(payload.data)?.transaction);
  const uid =
    (typeof transaction?.uid === "string" && transaction.uid) ||
    (typeof payload.transaction_uid === "string" && payload.transaction_uid) ||
    "";
  return uid;
}

export function payplusPageRequestUid(payload: Record<string, unknown>): string {
  const data = asRecord(payload.data);
  const transaction = asRecord(payload.transaction);
  return (
    (typeof payload.payment_request_uid === "string" &&
      payload.payment_request_uid) ||
    (typeof payload.page_request_uid === "string" && payload.page_request_uid) ||
    (typeof data?.page_request_uid === "string" && data.page_request_uid) ||
    (typeof transaction?.payment_request_uid === "string" &&
      transaction.payment_request_uid) ||
    ""
  );
}

export function payplusOrderIdFromPayload(
  payload: Record<string, unknown>
): string | undefined {
  const transaction = asRecord(payload.transaction);
  const data = asRecord(payload.data);
  const candidates = [
    payload.more_info,
    transaction?.more_info,
    data?.more_info,
    payload.order_id,
    payload.orderId,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function payplusInvoiceFromPayload(
  payload: Record<string, unknown>
): Record<string, unknown> | null {
  return asRecord(payload.invoice);
}

export function mapPayPlusStatusCode(
  statusCode: string
): "succeeded" | "failed" | "cancelled" | "processing" {
  if (statusCode === "000") return "succeeded";
  const lowered = statusCode.toLowerCase();
  if (["cancelled", "canceled", "cancel"].includes(lowered)) return "cancelled";
  if (!statusCode) return "processing";
  return "failed";
}

export function callbackUrlFromReturnUrl(returnUrl: string): string {
  try {
    const origin = new URL(returnUrl).origin;
    return `${origin}/api/webhooks/payments/${PAYPLUS_PROVIDER_ID}`;
  } catch {
    return `/api/webhooks/payments/${PAYPLUS_PROVIDER_ID}`;
  }
}
