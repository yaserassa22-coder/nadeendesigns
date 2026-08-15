/**
 * Internal shipment QR helpers.
 *
 * Encodes `/s/{public_token}` — our shipment lookup, never a carrier tracking
 * number and never customer PII (name, phone, address).
 * Admin does not create the QR; it is derived from the shipment token.
 */

export type ShippingQrKind = "shipment_url" | "shipment_token";

export type ShippingQrPayload = {
  kind: ShippingQrKind;
  /** Exact string encoded into the QR (URL or token marker). */
  data: string;
  trackingUrl: string | null;
  siteUrlMissing: boolean;
  warning: string | null;
};

/** Structured payload for future carrier / label APIs (not encoded in QR). */
export type CarrierReadyPayload = {
  schemaVersion: 1;
  orderId: string;
  orderNumber: string;
  shipmentPublicToken: string | null;
  trackingUrl: string | null;
  trackingNumber: string | null;
  carrierCode: string | null;
};

export type OrderTrackingQrSource = {
  id: string;
  tracking_number?: string | null;
  carrier_code?: string | null;
  shipment?: {
    public_token?: string | null;
    carrier?: string | null;
    carrier_tracking_number?: string | null;
  } | null;
};

const QR_API = "https://api.qrserver.com/v1/create-qr-code/";
const DEFAULT_QR_SIZE = 320;

const SITE_URL_MISSING_LOG =
  "NEXT_PUBLIC_SITE_URL is not configured — shipping QR encodes an internal token marker instead of a public URL.";

let loggedMissingSiteUrl = false;

export function getPublicSiteUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

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

export function shipmentPublicTokenOf(
  order: OrderTrackingQrSource
): string | null {
  const token = order.shipment?.public_token?.trim();
  return token || null;
}

/** Internal lookup URL: `{SITE_URL}/s/{public_token}`. */
export function buildShipmentLookupUrl(
  publicToken: string,
  siteUrl: string | null = getPublicSiteUrl()
): string | null {
  const token = publicToken?.trim();
  if (!siteUrl || !token) return null;
  return `${siteUrl}/s/${encodeURIComponent(token)}`;
}

/**
 * @deprecated Use {@link buildShipmentLookupUrl}. Kept so existing customer
 * `/orders/{uuid}` links continue to work; QR no longer encodes this.
 */
export function buildOrderTrackingUrl(
  orderId: string,
  siteUrl: string | null = getPublicSiteUrl()
): string | null {
  const id = orderId?.trim();
  if (!siteUrl || !id) return null;
  return `${siteUrl}/orders/${id}`;
}

/** Token-only marker when the public site URL is missing. Never includes PII. */
export function buildShipmentTokenQrText(publicToken: string): string {
  return `nadeen:s:${publicToken.trim()}`;
}

/**
 * QR payload from the shipment public_token. Never encodes phone, address,
 * or a carrier tracking number.
 */
export function resolveShippingQrPayload(
  order: OrderTrackingQrSource
): ShippingQrPayload {
  const token = shipmentPublicTokenOf(order);
  const siteUrl = getPublicSiteUrl();

  if (!token) {
    logMissingPublicSiteUrl("resolveShippingQrPayload:missing-token");
    const isDev = process.env.NODE_ENV === "development";
    return {
      kind: "shipment_token",
      data: "nadeen:s:pending",
      trackingUrl: null,
      siteUrlMissing: !siteUrl,
      warning: isDev
        ? "Shipment token missing — QR is a pending marker until the shipment row exists."
        : null,
    };
  }

  const lookupUrl = buildShipmentLookupUrl(token, siteUrl);
  if (lookupUrl) {
    return {
      kind: "shipment_url",
      data: lookupUrl,
      trackingUrl: lookupUrl,
      siteUrlMissing: false,
      warning: null,
    };
  }

  logMissingPublicSiteUrl("resolveShippingQrPayload");
  const isDev = process.env.NODE_ENV === "development";
  return {
    kind: "shipment_token",
    data: buildShipmentTokenQrText(token),
    trackingUrl: null,
    siteUrlMissing: true,
    warning: isDev
      ? "NEXT_PUBLIC_SITE_URL غير مضبوط — يُرمَّز معرّف الشحنة الداخلي فقط، دون بيانات العميلة."
      : null,
  };
}

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

/** Future-ready helper for carrier label / tracking APIs — not encoded in QR. */
export function buildCarrierReadyPayload(
  order: OrderTrackingQrSource
): CarrierReadyPayload {
  const token = shipmentPublicTokenOf(order);
  const siteUrl = getPublicSiteUrl();
  return {
    schemaVersion: 1,
    orderId: order.id,
    orderNumber: formatPublicOrderNumber(order.id),
    shipmentPublicToken: token,
    trackingUrl: token ? buildShipmentLookupUrl(token, siteUrl) : null,
    trackingNumber:
      order.shipment?.carrier_tracking_number?.trim() ||
      order.tracking_number?.trim() ||
      null,
    carrierCode:
      order.shipment?.carrier?.trim() || order.carrier_code?.trim() || null,
  };
}
