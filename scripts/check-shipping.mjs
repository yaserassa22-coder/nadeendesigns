/** Sanity checks for accessory-only shipping + free threshold + M9 pickup/regions. */

const ACCESSORY = new Set(["veil", "bridal_robe"]);

function lineRequiresShipping(item) {
  if (ACCESSORY.has(item.product_type)) return true;
  return item.requires_shipping === true;
}

function cartNeedsShipping(items) {
  return items.some(lineRequiresShipping);
}

function resolveFeeBase(settings, regionFee) {
  if (typeof regionFee === "number" && Number.isFinite(regionFee) && regionFee > 0) {
    return regionFee;
  }
  const fee = Number(settings.shipping_flat_fee ?? 0);
  return Number.isFinite(fee) && fee > 0 ? fee : 0;
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
assert(
  resolveShippingCost(
    true,
    100,
    { shipping_enabled: true, shipping_flat_fee: 35, shipping_free_threshold: 0 },
    { deliveryMethod: "pickup" }
  ) === 0,
  "pickup free"
);
assert(
  resolveShippingCost(
    true,
    100,
    { shipping_enabled: true, shipping_flat_fee: 35, shipping_free_threshold: 0 },
    { deliveryMethod: "delivery", regionFee: 45 }
  ) === 45,
  "region fee"
);
assert(
  resolveShippingCost(
    true,
    500,
    { shipping_enabled: true, shipping_flat_fee: 35, shipping_free_threshold: 400 },
    { deliveryMethod: "delivery", regionFee: 45 }
  ) === 0,
  "region + free threshold"
);

console.log("shipping helpers OK (incl. pickup + regional fees)");
