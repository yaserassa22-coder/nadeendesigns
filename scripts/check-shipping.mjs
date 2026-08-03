/** Sanity checks for accessory-only shipping + free threshold. */

const ACCESSORY = new Set(["veil", "bridal_robe"]);

function lineRequiresShipping(item) {
  if (item.requires_shipping === true) return true;
  if (item.requires_shipping === false) return false;
  return ACCESSORY.has(item.product_type);
}

function cartNeedsShipping(items) {
  return items.some(lineRequiresShipping);
}

function resolveShippingCost(needsShipping, subtotal, settings) {
  if (!needsShipping) return 0;
  if (settings.shipping_enabled === false) return 0;
  const fee = Number(settings.shipping_flat_fee ?? 0);
  if (!Number.isFinite(fee) || fee <= 0) return 0;
  const threshold = Number(settings.shipping_free_threshold ?? 0);
  if (Number.isFinite(threshold) && threshold > 0 && subtotal >= threshold) {
    return 0;
  }
  return fee;
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
  resolveShippingCost(true, 100, {
    shipping_enabled: true,
    shipping_flat_fee: 35,
    shipping_free_threshold: 0,
  }) === 35,
  "fee"
);
assert(
  resolveShippingCost(true, 100, {
    shipping_enabled: false,
    shipping_flat_fee: 35,
    shipping_free_threshold: 0,
  }) === 0,
  "disabled"
);
assert(
  resolveShippingCost(true, 500, {
    shipping_enabled: true,
    shipping_flat_fee: 35,
    shipping_free_threshold: 400,
  }) === 0,
  "free threshold"
);
assert(
  resolveShippingCost(true, 300, {
    shipping_enabled: true,
    shipping_flat_fee: 35,
    shipping_free_threshold: 400,
  }) === 35,
  "below threshold"
);
assert(
  resolveShippingCost(false, 1000, {
    shipping_enabled: true,
    shipping_flat_fee: 35,
    shipping_free_threshold: 100,
  }) === 0,
  "dress no ship"
);

console.log("shipping helpers OK");
