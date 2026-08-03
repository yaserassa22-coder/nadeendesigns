/**
 * Smoke: delivery order insert payload always includes delivery_method + shipping_cost.
 * Mirrors src/lib/shop/order-insert.ts (no DB / no Next).
 * Run: node scripts/smoke-order-insert.mjs
 */

const ACCESSORY = new Set(["veil", "bridal_robe"]);

function cartNeedsShipping(items) {
  return items.some(
    (i) => ACCESSORY.has(i.product_type) || i.requires_shipping === true
  );
}

function normalizeShippingFee(value) {
  const fee = Number(value ?? 0);
  return Number.isFinite(fee) && fee > 0 ? fee : 0;
}

function resolveFeeBase(settings, regionFee) {
  if (typeof regionFee === "number" && Number.isFinite(regionFee)) {
    return normalizeShippingFee(regionFee);
  }
  return normalizeShippingFee(settings.shipping_flat_fee);
}

function resolveShippingCost(needsShipping, subtotal, settings, options = {}) {
  if (!needsShipping) return 0;
  if (options.deliveryMethod === "pickup") return 0;
  if (settings.shipping_enabled === false) return 0;
  const fee = resolveFeeBase(settings, options.regionFee);
  if (fee <= 0) return 0;
  const threshold = Number(settings.shipping_free_threshold ?? 0);
  if (Number.isFinite(threshold) && threshold > 0 && subtotal >= threshold) {
    return 0;
  }
  return fee;
}

function resolveNeedsShipping(body) {
  return (
    cartNeedsShipping(body.items) ||
    body.delivery_method === "delivery" ||
    body.delivery_method === "pickup" ||
    body.shipping_required === true
  );
}

function clientShippingFee(body) {
  const raw =
    body.shipping_cost !== undefined && body.shipping_cost !== null
      ? body.shipping_cost
      : body.shipping_fee;
  const n = Number(raw ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function resolveDeliveryShipping({
  body,
  needsShipping,
  deliveryMethod,
  matched,
  regionMatchSource,
  regionText,
  siteSettings,
}) {
  const itemsSubtotal = body.items.reduce(
    (sum, i) => sum + Number(i.unit_price) * Number(i.quantity),
    0
  );

  let regionId = null;
  let regionNameAr = null;
  let regionCustom = null;
  let regionConfigured = true;
  let feePending = false;
  let regionFee = null;

  if (needsShipping && deliveryMethod === "delivery") {
    if (matched) {
      regionId = regionMatchSource === "seed" ? null : matched.id;
      regionNameAr = matched.name_ar;
      regionFee = Number(matched.shipping_fee) || 0;
      regionConfigured = true;
      feePending = false;
      regionCustom = null;
    } else {
      regionId = null;
      regionNameAr = regionText || body.shipping?.region?.trim() || null;
      regionCustom = regionNameAr;
      regionFee = null;
      regionConfigured = false;
      feePending = true;
    }
  }

  const shipping =
    needsShipping && deliveryMethod === "delivery" ? body.shipping ?? null : null;

  let shippingCost = feePending
    ? 0
    : resolveShippingCost(needsShipping, itemsSubtotal, siteSettings, {
        deliveryMethod,
        regionFee,
      });

  if (deliveryMethod === "delivery" && !feePending && shippingCost <= 0) {
    const fromClient = clientShippingFee(body);
    if (fromClient > 0) shippingCost = fromClient;
  }

  if (deliveryMethod === "pickup") {
    shippingCost = 0;
    feePending = false;
  }

  const computedTotal = feePending
    ? itemsSubtotal
    : itemsSubtotal + shippingCost;

  return {
    needsShipping,
    deliveryMethod,
    regionId,
    regionNameAr,
    regionCustom,
    regionConfigured:
      needsShipping && deliveryMethod === "delivery" ? regionConfigured : true,
    feePending,
    regionFee,
    shippingCost,
    itemsSubtotal,
    computedTotal,
    shipping,
  };
}

function buildShopOrderRow(body, resolved) {
  const ship = resolved.shipping;
  return {
    id: "00000000-0000-4000-8000-000000000099",
    name: body.name.trim(),
    phone: body.phone.trim(),
    email: null,
    notes: null,
    items: body.items,
    gift_options: null,
    total: resolved.computedTotal,
    status: "pending",
    created_at: new Date().toISOString(),
    shipping_required: resolved.needsShipping,
    delivery_method: resolved.needsShipping ? resolved.deliveryMethod : null,
    shipping_full_name: ship?.full_name?.trim() || null,
    shipping_phone: ship?.phone?.trim() || null,
    shipping_city: ship?.city?.trim() || null,
    shipping_region: ship?.region?.trim() || resolved.regionNameAr || null,
    shipping_region_id: resolved.regionId,
    shipping_region_name_ar: resolved.regionNameAr,
    shipping_region_custom: resolved.regionCustom,
    region_configured: resolved.regionConfigured,
    shipping_fee_pending: resolved.feePending,
    shipping_address: ship?.address?.trim() || null,
    shipping_building_number: ship?.building_number?.trim() || null,
    shipping_neighborhood: ship?.neighborhood?.trim() || null,
    shipping_postal_code: ship?.postal_code?.trim() || null,
    shipping_notes: ship?.notes?.trim() || null,
    shipping_cost: resolved.shippingCost,
    notify_whatsapp: true,
    notify_email: true,
  };
}

function buildProgressiveInsertPayloads(row) {
  const core = {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    items: row.items,
    gift_options: row.gift_options,
    total: row.total,
    status: row.status,
  };
  const withShippingLegacy = {
    ...core,
    shipping_required: row.shipping_required,
    shipping_full_name: row.shipping_full_name,
    shipping_phone: row.shipping_phone,
    shipping_city: row.shipping_city,
    shipping_region: row.shipping_region,
    shipping_address: row.shipping_address,
    shipping_postal_code: row.shipping_postal_code,
    shipping_notes: row.shipping_notes,
    shipping_cost: row.shipping_cost,
  };
  const withShippingM9 = {
    ...withShippingLegacy,
    delivery_method: row.delivery_method,
    shipping_region_id: row.shipping_region_id,
    shipping_region_name_ar: row.shipping_region_name_ar,
    shipping_building_number: row.shipping_building_number,
    shipping_neighborhood: row.shipping_neighborhood,
  };
  const insertFull = {
    ...withShippingM9,
    shipping_region_custom: row.shipping_region_custom,
    region_configured: row.region_configured,
    shipping_fee_pending: row.shipping_fee_pending,
    notify_whatsapp: true,
    notify_email: true,
  };

  const shippingTiers = [
    insertFull,
    withShippingM9,
    withShippingLegacy,
  ];

  if (row.delivery_method === "delivery" || row.delivery_method === "pickup") {
    return shippingTiers;
  }
  return [...shippingTiers, core];
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const siteSettings = {
  shipping_enabled: true,
  shipping_flat_fee: 0,
  shipping_free_threshold: 0,
};

const deliveryBody = {
  name: "سارة",
  phone: "0599123456",
  shipping_required: true,
  delivery_method: "delivery",
  shipping_cost: 45,
  shipping: {
    full_name: "سارة",
    phone: "0599123456",
    city: "رهط",
    region: "رهط",
    address: "شارع الاختبار 12",
    shipping_region_id: "c2000000-0000-4000-8000-000000000001",
  },
  items: [
    {
      product_type: "veil",
      product_id: "v1",
      name_ar: "طرحة",
      unit_price: 500,
      quantity: 1,
      requires_shipping: true,
    },
  ],
};

const needs = resolveNeedsShipping(deliveryBody);
assert(needs === true, "needsShipping");

const resolved = resolveDeliveryShipping({
  body: deliveryBody,
  needsShipping: needs,
  deliveryMethod: "delivery",
  matched: {
    id: "c2000000-0000-4000-8000-000000000001",
    name_ar: "رهط",
    shipping_fee: 45,
  },
  regionMatchSource: "db",
  regionText: "رهط",
  siteSettings,
});

assert(resolved.shippingCost === 45, `fee got ${resolved.shippingCost}`);
assert(resolved.computedTotal === 545, `total got ${resolved.computedTotal}`);
assert(resolved.feePending === false, "not pending");

const row = buildShopOrderRow(deliveryBody, resolved);
assert(row.delivery_method === "delivery", "row.delivery_method");
assert(row.shipping_cost === 45, "row.shipping_cost");
assert(row.shipping_required === true, "row.shipping_required");
assert(row.shipping_address === "شارع الاختبار 12", "address");
assert(row.total === 545, "row.total");

const payloads = buildProgressiveInsertPayloads(row);
assert(payloads.length >= 3, "tiers");
for (const p of payloads) {
  assert(
    p.delivery_method === "delivery" || p.shipping_cost === 45,
    "every delivery tier keeps method or cost"
  );
  assert(p.total === 545, "total in every tier");
  // Core-only must never appear for delivery
  assert(
    "shipping_cost" in p || "delivery_method" in p,
    "no core-only delivery payload"
  );
}
assert(
  payloads.every((p) => "shipping_cost" in p),
  "all delivery tiers include shipping_cost"
);
assert(
  payloads.some((p) => p.delivery_method === "delivery"),
  "at least one tier has delivery_method"
);
assert(
  !payloads.some(
    (p) =>
      !("shipping_cost" in p) &&
      !("delivery_method" in p) &&
      !("shipping_required" in p)
  ),
  "no bare core payload for delivery"
);

// Client fee fallback when server region fee would be 0 / missing calc
const fallback = resolveDeliveryShipping({
  body: { ...deliveryBody, shipping_cost: 40, shipping_fee: 40 },
  needsShipping: true,
  deliveryMethod: "delivery",
  matched: { id: "x", name_ar: "رهط", shipping_fee: 0 },
  regionMatchSource: "db",
  regionText: "رهط",
  siteSettings: { ...siteSettings, shipping_flat_fee: 0 },
});
assert(fallback.shippingCost === 40, `client fee fallback got ${fallback.shippingCost}`);

// shipping_fee alias
assert(clientShippingFee({ shipping_fee: 55 }) === 55, "shipping_fee alias");
assert(clientShippingFee({ shipping_cost: 60, shipping_fee: 1 }) === 60, "cost wins");

// Pickup: fee 0, method persisted, no core-only
const pickupResolved = resolveDeliveryShipping({
  body: {
    ...deliveryBody,
    delivery_method: "pickup",
    shipping: null,
    shipping_cost: 0,
  },
  needsShipping: true,
  deliveryMethod: "pickup",
  matched: null,
  regionText: "",
  siteSettings,
});
assert(pickupResolved.shippingCost === 0, "pickup fee 0");
const pickupRow = buildShopOrderRow(
  { ...deliveryBody, delivery_method: "pickup", shipping: null },
  pickupResolved
);
assert(pickupRow.delivery_method === "pickup", "pickup method");
const pickupPayloads = buildProgressiveInsertPayloads(pickupRow);
assert(
  pickupPayloads.every((p) => "shipping_cost" in p),
  "pickup never core-only"
);

// Unknown region: pending fee, still delivery
const unknown = resolveDeliveryShipping({
  body: deliveryBody,
  needsShipping: true,
  deliveryMethod: "delivery",
  matched: null,
  regionText: "قرية جديدة",
  siteSettings,
});
assert(unknown.feePending === true, "pending");
assert(unknown.shippingCost === 0, "pending fee 0");
assert(unknown.computedTotal === 500, "products only while pending");
const unknownRow = buildShopOrderRow(
  {
    ...deliveryBody,
    shipping: { ...deliveryBody.shipping, region: "قرية جديدة" },
  },
  unknown
);
assert(unknownRow.delivery_method === "delivery", "unknown still delivery");
assert(unknownRow.shipping_fee_pending === true, "pending flag");

console.log("SMOKE_ORDER_INSERT_OK");
