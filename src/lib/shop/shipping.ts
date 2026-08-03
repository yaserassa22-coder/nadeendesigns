/**
 * Bridal-accessories shipping helpers.
 * Shipping applies only to accessory cart lines (طرحة / برنص / future under اكسسوارات العروس).
 * Dresses never require shop checkout shipping.
 */

/** Known shop product_type values that ship. Prefer `requires_shipping` on cart lines for new types. */
export const ACCESSORY_SHOP_PRODUCT_TYPES = new Set<string>([
  "veil",
  "bridal_robe",
]);

export type ShippingSettings = {
  shipping_enabled?: boolean;
  shipping_flat_fee?: number;
  /** Subtotal at/above this amount → free shipping (0 = disabled) */
  shipping_free_threshold?: number;
};

export type ShippingAddressInput = {
  full_name: string;
  phone: string;
  city: string;
  region: string;
  address: string;
  postal_code?: string | null;
  notes?: string | null;
};

export type CartLineForShipping = {
  product_type: string;
  /** Explicit flag — set true for any future accessory product without code changes to the type set */
  requires_shipping?: boolean | null;
};

export function isAccessoryShopProductType(productType: string): boolean {
  return ACCESSORY_SHOP_PRODUCT_TYPES.has(productType);
}

/**
 * Whether this cart line needs delivery (accessories only).
 * Known accessory types always ship — client `requires_shipping: false` cannot skip them.
 * Future accessory kinds opt in via `requires_shipping: true`.
 */
export function lineRequiresShipping(item: CartLineForShipping): boolean {
  if (isAccessoryShopProductType(item.product_type)) return true;
  return item.requires_shipping === true;
}

/** Show shipping section when the cart has at least one accessory line. */
export function cartNeedsShipping(items: CartLineForShipping[]): boolean {
  return items.some(lineRequiresShipping);
}

export function normalizeShippingFee(value: unknown): number {
  const fee = Number(value ?? 0);
  return Number.isFinite(fee) && fee > 0 ? fee : 0;
}

export function normalizeFreeThreshold(value: unknown): number {
  const t = Number(value ?? 0);
  return Number.isFinite(t) && t > 0 ? t : 0;
}

/**
 * Flat fee when shipping is needed and enabled.
 * Free when disabled, fee is 0, or subtotal meets free-shipping threshold.
 */
export function resolveShippingCost(
  needsShipping: boolean,
  subtotal: number,
  settings: ShippingSettings
): number {
  if (!needsShipping) return 0;
  if (settings.shipping_enabled === false) return 0;
  const fee = normalizeShippingFee(settings.shipping_flat_fee);
  if (fee <= 0) return 0;
  const threshold = normalizeFreeThreshold(settings.shipping_free_threshold);
  if (threshold > 0 && subtotal >= threshold) return 0;
  return fee;
}

export function isFreeShippingEligible(
  needsShipping: boolean,
  subtotal: number,
  settings: ShippingSettings
): boolean {
  if (!needsShipping) return false;
  if (settings.shipping_enabled === false) return false;
  const fee = normalizeShippingFee(settings.shipping_flat_fee);
  if (fee <= 0) return false;
  const threshold = normalizeFreeThreshold(settings.shipping_free_threshold);
  return threshold > 0 && subtotal >= threshold;
}
