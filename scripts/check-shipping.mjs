/** Sanity checks for accessory-only shipping gating (mirrors src/lib/shop/shipping.ts). */

const ACCESSORY = new Set(["veil", "bridal_robe"]);

function lineRequiresShipping(item) {
  if (item.requires_shipping === true) return true;
  if (item.requires_shipping === false) return false;
  return ACCESSORY.has(item.product_type);
}

function cartNeedsShipping(items) {
  return items.some(lineRequiresShipping);
}

function resolveShippingCost(needsShipping, settings) {
  if (!needsShipping) return 0;
  if (settings.shipping_enabled === false) return 0;
  const fee = Number(settings.shipping_flat_fee ?? 0);
  return Number.isFinite(fee) && fee > 0 ? fee : 0;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(cartNeedsShipping([{ product_type: "veil" }]), "veil");
assert(cartNeedsShipping([{ product_type: "bridal_robe" }]), "robe");
assert(!cartNeedsShipping([{ product_type: "dress" }]), "dress only");
assert(
  cartNeedsShipping([{ product_type: "dress" }, { product_type: "veil" }]),
  "mixed"
);
assert(
  cartNeedsShipping([
    { product_type: "dress" },
    { product_type: "future_hat", requires_shipping: true },
  ]),
  "future flag"
);
assert(
  resolveShippingCost(true, { shipping_enabled: true, shipping_flat_fee: 35 }) ===
    35,
  "fee"
);
assert(
  resolveShippingCost(false, { shipping_enabled: true, shipping_flat_fee: 35 }) ===
    0,
  "no ship"
);

console.log("shipping helpers OK");
