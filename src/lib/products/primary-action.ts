/**
 * Storefront primary CTA — driven ONLY by product commerce type.
 * Never use category name / slug / legacy_key for button selection.
 *
 * Canonical Sprint 2 values:
 *   ready_to_buy | bridal_accessory | rental_dress | custom_design | service
 *
 * Legacy aliases (accessory, rental) are accepted on read and normalized.
 */

export const PRODUCT_COMMERCE_TYPES = [
  "ready_to_buy",
  "bridal_accessory",
  "rental_dress",
  "custom_design",
  "service",
] as const;

export type ProductCommerceType = (typeof PRODUCT_COMMERCE_TYPES)[number];

/** Pre-Sprint-2 values that may still exist in DB / drafts until migration 037. */
const LEGACY_PRODUCT_COMMERCE_ALIASES: Record<string, ProductCommerceType> = {
  accessory: "bridal_accessory",
  rental: "rental_dress",
};

export const PRODUCT_COMMERCE_TYPE_LABELS: Record<ProductCommerceType, string> =
  {
    ready_to_buy: "جاهز للشراء",
    bridal_accessory: "إكسسوار عروس",
    rental_dress: "فستان إيجار",
    custom_design: "تصميم خاص",
    service: "خدمة",
  };

export type ProductPrimaryActionKind =
  | "add_to_cart"
  | "book_appointment"
  | "book_now";

export type ProductPrimaryAction = {
  kind: ProductPrimaryActionKind;
  /** Exact Arabic CTA label for the primary button */
  label: string;
  /** True when pricing/UI should treat the product as rental presentation */
  isRentalPresentation: boolean;
  /** Cart lines for bridal_accessory should opt into shipping */
  requiresShipping: boolean;
};

const ACTIONS: Record<ProductCommerceType, ProductPrimaryAction> = {
  ready_to_buy: {
    kind: "add_to_cart",
    label: "أضف إلى السلة",
    isRentalPresentation: false,
    requiresShipping: false,
  },
  bridal_accessory: {
    kind: "add_to_cart",
    label: "أضف إلى السلة",
    isRentalPresentation: false,
    requiresShipping: true,
  },
  rental_dress: {
    kind: "book_appointment",
    label: "احجزي موعد",
    isRentalPresentation: true,
    requiresShipping: false,
  },
  custom_design: {
    kind: "book_appointment",
    label: "احجزي موعد",
    isRentalPresentation: false,
    requiresShipping: false,
  },
  service: {
    kind: "book_now",
    label: "احجز الآن",
    isRentalPresentation: false,
    requiresShipping: false,
  },
};

export function isProductCommerceType(
  value: unknown
): value is ProductCommerceType {
  return (
    typeof value === "string" &&
    (PRODUCT_COMMERCE_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Normalize DB / form value. Invalid / missing → fallback (default ready_to_buy).
 * Accepts legacy aliases `accessory` → bridal_accessory, `rental` → rental_dress.
 * Veils & bridal robes must pass fallback "bridal_accessory".
 */
export function resolveProductCommerceType(
  value: unknown,
  fallback: ProductCommerceType = "ready_to_buy"
): ProductCommerceType {
  if (isProductCommerceType(value)) return value;
  if (typeof value === "string" && value in LEGACY_PRODUCT_COMMERCE_ALIASES) {
    return LEGACY_PRODUCT_COMMERCE_ALIASES[value];
  }
  return fallback;
}

/** Primary storefront action from product_type only. */
export function getProductPrimaryAction(
  productType: ProductCommerceType | string | null | undefined,
  fallback: ProductCommerceType = "ready_to_buy"
): ProductPrimaryAction {
  const type = resolveProductCommerceType(productType, fallback);
  return ACTIONS[type];
}

export function productCommerceTypeOptions(): {
  value: ProductCommerceType;
  label: string;
}[] {
  return PRODUCT_COMMERCE_TYPES.map((value) => ({
    value,
    label: PRODUCT_COMMERCE_TYPE_LABELS[value],
  }));
}

/**
 * One-time hydration for rows missing product_type (pre-migration / seed).
 * Storefront components must still call getProductPrimaryAction(product_type)
 * and must NOT call this helper for CTA decisions directly.
 */
export function inferProductCommerceTypeFromLegacyCategory(
  category: string | null | undefined
): ProductCommerceType {
  if (!category?.trim()) return "ready_to_buy";
  const raw = category.trim();
  const key = raw.toLowerCase().replace(/-/g, "_");

  if (key === "rental" || key === "rental_dress" || key === "rental_dresses") {
    return "rental_dress";
  }
  if (
    key === "custom_design" ||
    key === "custom" ||
    key === "custom_designs"
  ) {
    return "custom_design";
  }
  if (
    key === "bridal_accessories" ||
    key === "bridal_accessory" ||
    key === "accessories" ||
    key === "accessory" ||
    key === "veils" ||
    key === "veil" ||
    key === "bridal_robes" ||
    key === "bridal_robe" ||
    key === "bridal_cape" ||
    key === "robes" ||
    key === "robe" ||
    /accessor|veil|robe|طرحة|برنص|اكسسوار|إكسسوار/i.test(raw)
  ) {
    return "bridal_accessory";
  }
  if (
    key === "wedding" ||
    key === "wedding_dress" ||
    key === "wedding_dresses" ||
    key === "nouf_dresses" ||
    key === "nouf_dress"
  ) {
    return "ready_to_buy";
  }
  return "ready_to_buy";
}
