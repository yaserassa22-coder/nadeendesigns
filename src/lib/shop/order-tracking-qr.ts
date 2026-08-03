/**
 * Shipping-slip QR helpers.
 *
 * Encodes the public customer tracking URL when NEXT_PUBLIC_SITE_URL is set.
 * Never hardcodes localhost for logistics QR codes.
 * When the site URL is missing, encodes a structured public order summary instead.
 * Config warnings are development-only in the UI; production logs to the server console.
 *
 * Future carrier integrations can use {@link buildCarrierReadyPayload} — this
 * module does not call any carrier APIs today.
 */

export type ShippingQrKind = "tracking_url" | "order_summary";

export type ShippingQrPayload = {
  kind: ShippingQrKind;
  /** Exact string encoded into the QR (URL or structured text). */
  data: string;
  trackingUrl: string | null;
  siteUrlMissing: boolean;
  warning: string | null;
};

/** Structured payload for future carrier / label APIs (not encoded in QR today). */
export type CarrierReadyPayload = {
  schemaVersion: 1;
  orderId: string;
  orderNumber: string;
  trackingUrl: string | null;
  trackingNumber: string | null;
  /** Future: Aramex, SMSA, etc. */
  carrierCode: string | null;
  customerName: string | null;
  phone: string | null;
  region: string | null;
  address: string | null;
  total: number | null;
};

export type OrderTrackingQrSource = {
  id: string;
  name?: string | null;
  phone?: string | null;
  total?: number | null;
  shipping_full_name?: string | null;
  shipping_phone?: string | null;
  shipping_region?: string | null;
  shipping_region_name_ar?: string | null;
  shipping_region_custom?: string | null;
  shipping_address?: string | null;
  shipping_city?: string | null;
  tracking_number?: string | null;
  carrier_code?: string | null;
  items?: Array<{ name_ar?: string; quantity?: number }> | null;
};

const QR_API = "https://api.qrserver.com/v1/create-qr-code/";
/** Print-ready QR edge length (px) for shipping slips. */
const DEFAULT_QR_SIZE = 320;

const SITE_URL_MISSING_LOG =
  "NEXT_PUBLIC_SITE_URL is not configured — shipping QR falls back to structured order summary text instead of a tracking URL.";

let loggedMissingSiteUrl = false;

/** Public site origin from NEXT_PUBLIC_SITE_URL only — no localhost fallback. */
export function getPublicSiteUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

/**
 * Log missing NEXT_PUBLIC_SITE_URL once to the server/process console.
 * Never surfaces technical config details in the production UI.
 */
export function logMissingPublicSiteUrl(context?: string): void {
  if (loggedMissingSiteUrl || getPublicSiteUrl()) return;
  loggedMissingSiteUrl = true;
  console.warn(
    `[shipping-qr]${context ? ` ${context}:` : ""} ${SITE_URL_MISSING_LOG}`
  );
}

export function formatPublicOrderNumber(orderId: string): string {
  return `ND-${orderId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/**
 * Absolute public tracking URL: `{NEXT_PUBLIC_SITE_URL}/orders/{order_id}`.
 * Returns null when the env var is missing or orderId is empty.
 */
export function buildOrderTrackingUrl(
  orderId: string,
  siteUrl: string | null = getPublicSiteUrl()
): string | null {
  const id = orderId?.trim();
  if (!siteUrl || !id) return null;
  return `${siteUrl}/orders/${id}`;
}

/** Structured text fallback when an absolute tracking URL cannot be built. */
export function buildOrderSummaryQrText(order: OrderTrackingQrSource): string {
  const orderNo = formatPublicOrderNumber(order.id);
  const name = (order.shipping_full_name || order.name || "").trim() || "—";
  const phone = (order.shipping_phone || order.phone || "").trim() || "—";
  const region =
    (
      order.shipping_region_name_ar ||
      order.shipping_region_custom ||
      order.shipping_region ||
      ""
    ).trim() || "—";
  const city = (order.shipping_city || "").trim();
  const address = (order.shipping_address || "").trim() || "—";
  const products = (order.items ?? [])
    .map((item) => {
      const label = (item.name_ar || "").trim() || "منتج";
      const qty = Number(item.quantity) || 1;
      return `${label} × ${qty}`;
    })
    .join("، ");
  const total =
    order.total != null && Number.isFinite(Number(order.total))
      ? String(Number(order.total))
      : "—";

  return [
    `NadEEN Designs — طلب ${orderNo}`,
    `الاسم: ${name}`,
    `الهاتف: ${phone}`,
    `المنطقة: ${region}`,
    city ? `المدينة: ${city}` : null,
    `العنوان: ${address}`,
    products ? `المنتجات: ${products}` : null,
    `الإجمالي: ${total}`,
    order.tracking_number
      ? `رقم التتبع: ${order.tracking_number.trim()}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Prefer the public tracking URL. If NEXT_PUBLIC_SITE_URL is missing, fall back
 * to structured order text — never encode an empty string.
 * UI warning is development-only; production logs to console instead.
 */
export function resolveShippingQrPayload(
  order: OrderTrackingQrSource
): ShippingQrPayload {
  const siteUrl = getPublicSiteUrl();
  const trackingUrl = buildOrderTrackingUrl(order.id, siteUrl);

  if (trackingUrl) {
    return {
      kind: "tracking_url",
      data: trackingUrl,
      trackingUrl,
      siteUrlMissing: false,
      warning: null,
    };
  }

  logMissingPublicSiteUrl("resolveShippingQrPayload");

  const summary = buildOrderSummaryQrText(order);
  const isDev = process.env.NODE_ENV === "development";
  return {
    kind: "order_summary",
    data: summary,
    trackingUrl: null,
    siteUrlMissing: true,
    warning: isDev
      ? "NEXT_PUBLIC_SITE_URL غير مضبوط — لن يُنشأ رمز QR فارغ. يُستخدم ملخص الطلب كنص بديل بدل رابط التتبع."
      : null,
  };
}

/**
 * High-contrast print-friendly QR image URL (≥320×320, ECC H).
 * Returns null when data would be empty (never generate an empty QR).
 */
export function buildShippingQrImageUrl(
  data: string,
  options?: { size?: number; cacheBust?: number | string }
): string | null {
  const payload = data?.trim();
  if (!payload) return null;

  const size = Math.max(options?.size ?? DEFAULT_QR_SIZE, DEFAULT_QR_SIZE);
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    ecc: "H",
    margin: "8",
    color: "000000",
    bgcolor: "FFFFFF",
    data: payload,
  });
  if (options?.cacheBust != null && options.cacheBust !== "") {
    params.set("t", String(options.cacheBust));
  }
  return `${QR_API}?${params.toString()}`;
}

/** Future-ready helper for carrier label / tracking APIs. */
export function buildCarrierReadyPayload(
  order: OrderTrackingQrSource
): CarrierReadyPayload {
  const siteUrl = getPublicSiteUrl();
  return {
    schemaVersion: 1,
    orderId: order.id,
    orderNumber: formatPublicOrderNumber(order.id),
    trackingUrl: buildOrderTrackingUrl(order.id, siteUrl),
    trackingNumber: order.tracking_number?.trim() || null,
    carrierCode: order.carrier_code?.trim() || null,
    customerName: (order.shipping_full_name || order.name || "").trim() || null,
    phone: (order.shipping_phone || order.phone || "").trim() || null,
    region:
      (
        order.shipping_region_name_ar ||
        order.shipping_region_custom ||
        order.shipping_region ||
        ""
      ).trim() || null,
    address: order.shipping_address?.trim() || null,
    total:
      order.total != null && Number.isFinite(Number(order.total))
        ? Number(order.total)
        : null,
  };
}
