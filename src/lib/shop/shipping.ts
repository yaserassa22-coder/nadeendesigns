/**
 * Bridal-accessories shipping helpers.
 * Shipping applies only to accessory cart lines (طرحة / برنص / future under اكسسوارات العروس).
 * Dresses never require shop checkout shipping.
 */

/** Known shop product_type values that ship. Prefer `requires_shipping` on cart lines for new types. */
export const ACCESSORY_SHOP_PRODUCT_TYPES = new Set<string>([
  "veil",
  "bridal_robe",
  "accessory_item",
]);

export type ShippingSettings = {
  shipping_enabled?: boolean;
  shipping_flat_fee?: number;
  /** Subtotal at/above this amount → free shipping (0 = disabled) */
  shipping_free_threshold?: number;
  boutique_pickup_enabled?: boolean;
  delivery_enabled?: boolean;
};

export type ShippingAddressInput = {
  full_name: string;
  phone: string;
  city: string;
  region: string;
  address: string;
  postal_code?: string | null;
  notes?: string | null;
  building_number?: string | null;
  neighborhood?: string | null;
  shipping_region_id?: string | null;
};

export type CartLineForShipping = {
  product_type: string;
  /** Explicit flag — set true for any future accessory product without code changes to the type set */
  requires_shipping?: boolean | null;
};

export type DeliveryMethod = "pickup" | "delivery";

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
 * Resolve fee base: regional fee when provided, else flat fee from settings.
 */
export function resolveFeeBase(
  settings: ShippingSettings,
  regionFee?: number | null
): number {
  if (typeof regionFee === "number" && Number.isFinite(regionFee)) {
    return normalizeShippingFee(regionFee);
  }
  return normalizeShippingFee(settings.shipping_flat_fee);
}

/**
 * Flat or regional fee when shipping is needed and enabled.
 * Pickup always returns 0. Free when disabled, fee is 0, or subtotal meets free-shipping threshold.
 */
export function resolveShippingCost(
  needsShipping: boolean,
  subtotal: number,
  settings: ShippingSettings,
  options?: {
    deliveryMethod?: DeliveryMethod | null;
    regionFee?: number | null;
  }
): number {
  if (!needsShipping) return 0;
  if (options?.deliveryMethod === "pickup") return 0;
  if (settings.shipping_enabled === false) return 0;
  const fee = resolveFeeBase(settings, options?.regionFee);
  if (fee <= 0) return 0;
  const threshold = normalizeFreeThreshold(settings.shipping_free_threshold);
  if (threshold > 0 && subtotal >= threshold) return 0;
  return fee;
}

export function isFreeShippingEligible(
  needsShipping: boolean,
  subtotal: number,
  settings: ShippingSettings,
  options?: {
    deliveryMethod?: DeliveryMethod | null;
    regionFee?: number | null;
  }
): boolean {
  if (!needsShipping) return false;
  if (options?.deliveryMethod === "pickup") return false;
  if (settings.shipping_enabled === false) return false;
  const fee = resolveFeeBase(settings, options?.regionFee);
  if (fee <= 0) return false;
  const threshold = normalizeFreeThreshold(settings.shipping_free_threshold);
  return threshold > 0 && subtotal >= threshold;
}

/** Default delivery method from enabled settings flags. */
export function defaultDeliveryMethod(
  settings: ShippingSettings
): DeliveryMethod | null {
  const pickup = settings.boutique_pickup_enabled !== false;
  const delivery = settings.delivery_enabled !== false;
  if (pickup && !delivery) return "pickup";
  if (delivery && !pickup) return "delivery";
  if (pickup || delivery) return delivery ? "delivery" : "pickup";
  return null;
}

export type RegionEstimateFields = {
  estimated_delivery_ar?: string | null;
  estimated_days_min?: number | null;
  estimated_days_max?: number | null;
  estimated_days?: number | null;
};

/** Arabic label for estimated delivery window (region snapshot or live region). */
export function formatEstimatedDelivery(
  region?: RegionEstimateFields | null
): string | null {
  if (!region) return null;
  const custom = region.estimated_delivery_ar?.trim();
  if (custom) return custom;
  const min =
    typeof region.estimated_days_min === "number" &&
    Number.isFinite(region.estimated_days_min)
      ? region.estimated_days_min
      : typeof region.estimated_days === "number" &&
          Number.isFinite(region.estimated_days)
        ? region.estimated_days
        : null;
  const max =
    typeof region.estimated_days_max === "number" &&
    Number.isFinite(region.estimated_days_max)
      ? region.estimated_days_max
      : min;
  if (min == null) return null;
  if (max == null || max === min) return `${min} يوم تقريباً`;
  return `${min}–${max} أيام تقريباً`;
}

/** Case-insensitive exact match on Arabic or English region name. */
export function findRegionByName<T extends { name_ar: string; name_en?: string | null }>(
  regions: T[],
  text: string
): T | null {
  const q = text.trim().toLowerCase();
  if (!q) return null;
  return (
    regions.find(
      (r) =>
        r.name_ar.trim().toLowerCase() === q ||
        (r.name_en?.trim().toLowerCase() ?? "") === q
    ) ?? null
  );
}

/**
 * Filter active regions for autocomplete (client-side).
 * Scale choice: load active list once + in-memory filter (fine for hundreds).
 * API also supports `?q=` ILIKE for when the catalog grows beyond memory.
 */
export function filterRegionsByQuery<
  T extends { name_ar: string; name_en?: string | null },
>(regions: T[], query: string, limit = 20): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return regions.slice(0, limit);
  const scored: { r: T; score: number }[] = [];
  for (const r of regions) {
    const ar = r.name_ar.toLowerCase();
    const en = (r.name_en ?? "").toLowerCase();
    if (ar === q || en === q) {
      scored.push({ r, score: 0 });
    } else if (ar.startsWith(q) || en.startsWith(q)) {
      scored.push({ r, score: 1 });
    } else if (ar.includes(q) || en.includes(q)) {
      scored.push({ r, score: 2 });
    }
  }
  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((s) => s.r);
}
