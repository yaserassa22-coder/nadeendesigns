/**
 * Shared storefront / admin product pricing helpers.
 * `price` on dresses is the regular (list) price; `sale_price` is optional.
 * Products without sale_price (veils, robes, etc.) resolve as not on sale.
 */

export function discountPercent(
  regular: number | null | undefined,
  sale: number | null | undefined
): number | null {
  if (
    regular == null ||
    sale == null ||
    !Number.isFinite(regular) ||
    !Number.isFinite(sale) ||
    regular <= 0 ||
    sale < 0 ||
    sale >= regular
  ) {
    return null;
  }
  return Math.round(((regular - sale) / regular) * 100);
}

export function isOnSale(
  regular: number | null | undefined,
  sale: number | null | undefined
): boolean {
  return discountPercent(regular, sale) != null;
}

export type ResolvedProductPricing = {
  /** List / regular price when known (purchase products). */
  regularPrice: number | null;
  /** Active sale price when on sale; otherwise null. */
  salePrice: number | null;
  /** Amount the customer pays (sale if on sale, else regular, else rental). */
  currentPrice: number | null;
  /** True when sale_price exists and is strictly less than regular. */
  onSale: boolean;
  /** Dynamic discount percent, or null when not on sale. */
  discountPercent: number | null;
  /** True when displaying rental-only pricing (no purchase price). */
  isRental: boolean;
};

export type ResolveProductPricingInput = {
  /** Regular / list price (`price` column on dresses). */
  price?: number | null;
  salePrice?: number | null;
  rentalPrice?: number | null;
  /** Force rental presentation even if price exists. */
  forceRental?: boolean;
};

/**
 * Resolve display pricing from product fields.
 * Treats missing / invalid sale_price as no sale (safe for veils/robes).
 */
export function resolveProductPricing(
  input: ResolveProductPricingInput
): ResolvedProductPricing {
  const regular =
    input.price != null && Number.isFinite(input.price) && input.price >= 0
      ? input.price
      : null;
  const saleRaw =
    input.salePrice != null &&
    Number.isFinite(input.salePrice) &&
    input.salePrice >= 0
      ? input.salePrice
      : null;
  const rental =
    input.rentalPrice != null &&
    Number.isFinite(input.rentalPrice) &&
    input.rentalPrice >= 0
      ? input.rentalPrice
      : null;

  const pct = discountPercent(regular, saleRaw);
  const onSale = pct != null;
  const salePrice = onSale ? saleRaw : null;

  const isRental =
    input.forceRental === true || (regular == null && rental != null);

  const currentPrice = onSale
    ? salePrice
    : regular != null
      ? regular
      : rental;

  return {
    regularPrice: regular,
    salePrice,
    currentPrice,
    onSale,
    discountPercent: pct,
    isRental,
  };
}

/** Line totals for cart / checkout when compare_at was stored at add-to-cart. */
export function cartLineDisplayPrices(item: {
  unit_price: number;
  compare_at_price?: number | null;
  quantity: number;
  personalization_fee?: number | null;
  extra_services?: Array<{ price: number }> | null;
}): { price: number; salePrice: number | null } {
  const qty = Math.max(1, item.quantity);
  const extras = (item.extra_services ?? []).reduce((sum, s) => {
    const p = Number(s.price);
    return sum + (Number.isFinite(p) && p > 0 ? p : 0);
  }, 0);
  const pers = Number(item.personalization_fee ?? 0);
  const persSafe = Number.isFinite(pers) && pers > 0 ? pers : 0;
  const chargedUnit = item.unit_price + extras + persSafe;
  const compare = item.compare_at_price;
  const onSale =
    compare != null &&
    Number.isFinite(compare) &&
    compare > item.unit_price;
  if (onSale) {
    return {
      price: (compare + extras + persSafe) * qty,
      salePrice: chargedUnit * qty,
    };
  }
  return { price: chargedUnit * qty, salePrice: null };
}
