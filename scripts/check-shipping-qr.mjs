/**
 * Smoke checks for shipment QR URL construction.
 * Run: node scripts/check-shipping-qr.mjs
 *
 * Mirrors src/lib/shop/order-tracking-qr.ts (plain JS, no build step).
 */

function getPublicSiteUrl(env = process.env) {
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

function formatPublicOrderNumber(orderId) {
  return `ND-${orderId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function buildShipmentLookupUrl(publicToken, siteUrl = getPublicSiteUrl()) {
  const token = publicToken?.trim?.() ?? String(publicToken || "").trim();
  if (!siteUrl || !token) return null;
  return `${siteUrl}/s/${encodeURIComponent(token)}`;
}

function buildOrderTrackingUrl(orderId, siteUrl = getPublicSiteUrl()) {
  const id = orderId?.trim?.() ?? String(orderId || "").trim();
  if (!siteUrl || !id) return null;
  return `${siteUrl}/orders/${id}`;
}

function buildShipmentTokenQrText(publicToken) {
  return `nadeen:s:${publicToken.trim()}`;
}

function resolveShippingQrPayload(order, env = process.env) {
  const token = order.shipment?.public_token?.trim() || null;
  const siteUrl = getPublicSiteUrl(env);
  if (!token) {
    const isDev = (env.NODE_ENV ?? process.env.NODE_ENV) === "development";
    return {
      kind: "shipment_token",
      data: "nadeen:s:pending",
      trackingUrl: null,
      siteUrlMissing: !siteUrl,
      warning: isDev ? "missing token" : null,
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
  const isDev = (env.NODE_ENV ?? process.env.NODE_ENV) === "development";
  return {
    kind: "shipment_token",
    data: buildShipmentTokenQrText(token),
    trackingUrl: null,
    siteUrlMissing: true,
    warning: isDev ? "missing NEXT_PUBLIC_SITE_URL" : null,
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
const TOKEN = "abcdefghijklmnopqrstuvwxyz012345";
const sampleOrder = {
  id: SAMPLE_ID,
  name: "سارة",
  phone: "0500000000",
  shipping_full_name: "سارة أحمد",
  shipping_phone: "0500000000",
  shipping_region_name_ar: "القدس",
  shipping_address: "شارع الرئيسي 12",
  tracking_number: "CARRIER-SHOULD-NOT-BE-IN-QR",
  total: 450,
  items: [{ name_ar: "طرحة", quantity: 1 }],
  shipment: { public_token: TOKEN },
};

{
  const env = { NEXT_PUBLIC_SITE_URL: "https://nadeendesigns.com/" };
  const url = buildShipmentLookupUrl(TOKEN, getPublicSiteUrl(env));
  assert(
    url === `https://nadeendesigns.com/s/${TOKEN}`,
    `expected shipment URL, got ${url}`
  );
  assert(!url.includes("localhost"), "must not hardcode localhost");
  const payload = resolveShippingQrPayload(sampleOrder, env);
  assert(payload.kind === "shipment_url", "kind should be shipment_url");
  assert(payload.data === url, "QR data should be /s/{token}");
  assert(!payload.data.includes(SAMPLE_ID), "QR must not encode order UUID");
  assert(!payload.data.includes("سارة"), "QR must not encode customer name");
  assert(!payload.data.includes("0500000000"), "QR must not encode phone");
  assert(
    !payload.data.includes("شارع"),
    "QR must not encode address"
  );
  assert(
    !payload.data.includes("CARRIER-SHOULD-NOT-BE-IN-QR"),
    "QR must not encode carrier tracking"
  );
  const img = buildShippingQrImageUrl(payload.data, { size: 320 });
  assert(img && img.includes("320x320"), "QR image must be ≥320×320");
  assert(img.includes("ecc=H"), "QR must use high error correction");
  assert(img.includes(encodeURIComponent(url)), "QR must encode lookup URL");
}

{
  const env = { NODE_ENV: "production" };
  assert(getPublicSiteUrl(env) === null, "missing env → null site url");
  const payload = resolveShippingQrPayload(sampleOrder, env);
  assert(payload.siteUrlMissing, "should flag when env missing");
  assert(payload.warning === null, "no UI warning in production");
  assert(payload.kind === "shipment_token", "fallback to token marker");
  assert(payload.data === `nadeen:s:${TOKEN}`, "token-only fallback");
  assert(!payload.data.includes("سارة"), "fallback must not include name");
  assert(!payload.data.includes("0500000000"), "fallback must not include phone");
  assert(
    buildShippingQrImageUrl("") === null,
    "never generate empty QR image"
  );
  assert(buildShippingQrImageUrl(payload.data) != null, "token QR image ok");
}

{
  const env = { NODE_ENV: "development" };
  const payload = resolveShippingQrPayload(sampleOrder, env);
  assert(payload.siteUrlMissing, "should flag when env missing");
  assert(payload.warning, "should warn in development when env missing");
  assert(payload.kind === "shipment_token", "fallback to token marker");
}

{
  const url = buildOrderTrackingUrl(SAMPLE_ID, getPublicSiteUrl({}));
  assert(url === null, "no silent localhost fallback");
}

{
  const twoOrders = [
    { id: "11111111-1111-4111-8111-111111111111", shipment: { public_token: "token-order-one-aaaaaaaaaaaa" } },
    { id: "22222222-2222-4222-8222-222222222222", shipment: { public_token: "token-order-two-bbbbbbbbbbbb" } },
  ];
  const env = { NEXT_PUBLIC_SITE_URL: "https://nadeendesigns.com" };
  const a = resolveShippingQrPayload(twoOrders[0], env);
  const b = resolveShippingQrPayload(twoOrders[1], env);
  assert(a.data !== b.data, "same product/two orders get distinct QR tokens");
  assert(formatPublicOrderNumber(SAMPLE_ID) === "ND-A1B2C3D4", "ND display format");
}

console.log("check-shipping-qr: ok");
