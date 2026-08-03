/**
 * Smoke checks for M12 shipping QR URL construction.
 * Run: node scripts/check-shipping-qr.mjs
 *
 * Mirrors src/lib/shop/order-tracking-qr.ts (plain JS, no build step).
 */

function getPublicSiteUrl(env = process.env) {
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

function buildOrderTrackingUrl(orderId, siteUrl = getPublicSiteUrl()) {
  const id = orderId?.trim?.() ?? String(orderId || "").trim();
  if (!siteUrl || !id) return null;
  return `${siteUrl}/orders/${id}`;
}

function formatPublicOrderNumber(orderId) {
  return `ND-${orderId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function buildOrderSummaryQrText(order) {
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
    `العنوان: ${address}`,
    products ? `المنتجات: ${products}` : null,
    `الإجمالي: ${total}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function resolveShippingQrPayload(order, env = process.env) {
  const siteUrl = getPublicSiteUrl(env);
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
  const summary = buildOrderSummaryQrText(order);
  return {
    kind: "order_summary",
    data: summary,
    trackingUrl: null,
    siteUrlMissing: true,
    warning: "missing NEXT_PUBLIC_SITE_URL",
  };
}

function buildShippingQrImageUrl(data, options = {}) {
  const payload = data?.trim();
  if (!payload) return null;
  const size = Math.max(options.size ?? 320, 320);
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    ecc: "H",
    margin: "8",
    color: "000000",
    bgcolor: "FFFFFF",
    data: payload,
  });
  if (options.cacheBust != null && options.cacheBust !== "") {
    params.set("t", String(options.cacheBust));
  }
  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const SAMPLE_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const sampleOrder = {
  id: SAMPLE_ID,
  name: "سارة",
  phone: "0500000000",
  shipping_full_name: "سارة أحمد",
  shipping_phone: "0500000000",
  shipping_region_name_ar: "القدس",
  shipping_address: "شارع الرئيسي 12",
  total: 450,
  items: [{ name_ar: "طرحة", quantity: 1 }],
};

// Prefer absolute public tracking URL from NEXT_PUBLIC_SITE_URL
{
  const env = { NEXT_PUBLIC_SITE_URL: "https://nadeendesigns.com/" };
  const url = buildOrderTrackingUrl(SAMPLE_ID, getPublicSiteUrl(env));
  assert(
    url === `https://nadeendesigns.com/orders/${SAMPLE_ID}`,
    `expected tracking URL, got ${url}`
  );
  assert(!url.includes("localhost"), "must not hardcode localhost");
  const payload = resolveShippingQrPayload(sampleOrder, env);
  assert(payload.kind === "tracking_url", "kind should be tracking_url");
  assert(payload.data === url, "QR data should be tracking URL");
  assert(!payload.siteUrlMissing, "siteUrlMissing should be false");
  const img = buildShippingQrImageUrl(payload.data, { size: 320 });
  assert(img && img.includes("320x320"), "QR image must be ≥320×320");
  assert(img.includes("ecc=H"), "QR must use high error correction");
  assert(img.includes(encodeURIComponent(url)), "QR must encode tracking URL");
}

// Missing env → warning + structured text, never empty QR
{
  const env = {};
  assert(getPublicSiteUrl(env) === null, "missing env → null site url");
  assert(
    buildOrderTrackingUrl(SAMPLE_ID, null) === null,
    "no URL without site"
  );
  const payload = resolveShippingQrPayload(sampleOrder, env);
  assert(payload.siteUrlMissing, "should warn when env missing");
  assert(payload.kind === "order_summary", "fallback to summary text");
  assert(payload.data.trim().length > 0, "fallback data must not be empty");
  assert(payload.data.includes("سارة"), "summary includes name");
  assert(payload.data.includes("القدس"), "summary includes region");
  assert(
    buildShippingQrImageUrl("") === null,
    "never generate empty QR image"
  );
  assert(
    buildShippingQrImageUrl(payload.data) != null,
    "summary QR image ok"
  );
}

// Never invent localhost when env is unset
{
  const url = buildOrderTrackingUrl(SAMPLE_ID, getPublicSiteUrl({}));
  assert(url === null, "no silent localhost fallback");
}

console.log("check-shipping-qr: ok");
