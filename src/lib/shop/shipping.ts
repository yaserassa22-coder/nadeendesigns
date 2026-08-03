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

export type ShippingAddressInput = {
  full_name: string;
  phone: string;
  city: string;
  region: string;
  address: string;
  postal_code?: string | null;
  notes?: string | null;
};

export type OrderShipping = ShippingAddressInput & {
  required: boolean;
  cost: number;
};

export type CartLineForShipping = {
  product_type: string;
  /** Explicit flag — set true for any future accessory product without code changes to the type set */
  requires_shipping?: boolean | null;
};

export function isAccessoryShopProductType(productType: string): boolean {
  return ACCESSORY_SHOP_PRODUCT_TYPES.has(productType);
}

/** Whether this cart line needs delivery (accessories only). */
export function lineRequiresShipping(item: CartLineForShipping): boolean {
  if (item.requires_shipping === true) return true;
  if (item.requires_shipping === false) return false;
  return isAccessoryShopProductType(item.product_type);
}

/** Show shipping section when the cart has at least one accessory line. */
export function cartNeedsShipping(items: CartLineForShipping[]): boolean {
  return items.some(lineRequiresShipping);
}

export function resolveShippingCost(
  needsShipping: boolean,
  settings: { shipping_enabled?: boolean; shipping_flat_fee?: number }
): number {
  if (!needsShipping) return 0;
  if (settings.shipping_enabled === false) return 0;
  const fee = Number(settings.shipping_flat_fee ?? 0);
  return Number.isFinite(fee) && fee > 0 ? fee : 0;
}
