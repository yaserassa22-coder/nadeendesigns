/**
 * Storefront primary CTA — driven ONLY by product commerce type.
 * Never use category name / slug / legacy_key for button selection.
 *
 * Canonical Sprint 2 / Enterprise values:
 *   ready_to_buy | bridal_accessory | rental_dress | custom_design | service
 *
 * Decision (Enterprise sprint):
 *   - ready_to_buy remains a cart alias (Add to Cart + Buy Now) for generic
 *     purchasable products — NOT wedding/nouf (those use rental_dress).
 *   - Wedding + Nouf dresses use rental_dress → Book Appointment only.
 *   - custom_design → Request Design (booking deep-link, no cart).
 *
 * Purchase Flows (DB / Admin) mirror these defaults; ACTIONS below are the
 * sync Client-safe fallback (see purchase-flows.ts for admin CRUD).
 *
 * Legacy aliases (accessory, rental) are accepted on read and normalized.
 */

import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";

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
  | "request_design"
  | "book_now";

export type ProductPrimaryAction = {
  kind: ProductPrimaryActionKind;
  /** Exact Arabic CTA label for the primary button */
  label: string;
  /** True when pricing/UI should treat the product as rental presentation */
  isRentalPresentation: boolean;
  /** Cart lines for bridal_accessory should opt into shipping */
  requiresShipping: boolean;
  /** Hide Add to Cart / Buy Now chrome */
  hideCart: boolean;
  hideBuyNow: boolean;
  /** Secondary CTA keys from purchase flow (buy_now, wishlist, …) */
  secondaryCtas: string[];
};

/** Hardcoded fallback — keep in sync with purchase_flows seed (migration 040). */
const ACTIONS: Record<ProductCommerceType, ProductPrimaryAction> = {
  ready_to_buy: {
    kind: "add_to_cart",
    label: "أضف إلى السلة",
    isRentalPresentation: false,
    requiresShipping: false,
    hideCart: false,
    hideBuyNow: false,
    secondaryCtas: ["buy_now", "wishlist"],
  },
  bridal_accessory: {
    kind: "add_to_cart",
    label: "أضف إلى السلة",
    isRentalPresentation: false,
    requiresShipping: true,
    hideCart: false,
    hideBuyNow: false,
    secondaryCtas: ["buy_now", "wishlist"],
  },
  rental_dress: {
    kind: "book_appointment",
    label: "احجزي موعد",
    isRentalPresentation: true,
    requiresShipping: false,
    hideCart: true,
    hideBuyNow: true,
    secondaryCtas: ["wishlist"],
  },
  custom_design: {
    kind: "request_design",
    label: "اطلبي تصميم",
    isRentalPresentation: false,
    requiresShipping: false,
    hideCart: true,
    hideBuyNow: true,
    secondaryCtas: ["wishlist"],
  },
  service: {
    kind: "book_now",
    label: "احجز الآن",
    isRentalPresentation: false,
    requiresShipping: false,
    hideCart: true,
    hideBuyNow: true,
    secondaryCtas: [],
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
  fallback: ProductCommerceType = "ready_to_buy",
  locale: Locale = "ar"
): ProductPrimaryAction {
  const type = resolveProductCommerceType(productType, fallback);
  const base = ACTIONS[type];
  return {
    ...base,
    label: primaryActionLabelForKind(base.kind, locale),
  };
}

export function primaryActionLabelForKind(
  kind: ProductPrimaryActionKind,
  locale: Locale = "ar"
): string {
  const t = getDictionary(locale);
  switch (kind) {
    case "add_to_cart":
      return t.product.addToCart;
    case "book_appointment":
      return t.nav.bookAppointment;
    case "request_design":
      return t.product.requestDesign;
    case "book_now":
      return t.product.bookNow;
    default:
      return t.product.addToCart;
  }
}

export function getProductCommerceTypeLabel(
  value: ProductCommerceType | string,
  locale: Locale = "ar"
): string {
  const type = resolveProductCommerceType(value);
  const pe = getDictionary(locale).admin.productEditor;
  switch (type) {
    case "ready_to_buy":
      return pe.commerceReadyToBuy;
    case "bridal_accessory":
      return pe.commerceBridalAccessory;
    case "rental_dress":
      return pe.commerceRentalDress;
    case "custom_design":
      return pe.commerceCustomDesign;
    case "service":
      return pe.commerceService;
    default:
      return String(value);
  }
}

/**
 * Merge a live DB purchase flow over the hardcoded action (server/admin paths).
 * Kept free of DB imports so Client Components can tree-shake safely.
 */
export function applyPurchaseFlowOverride(
  base: ProductPrimaryAction,
  flow: {
    primary_cta: ProductPrimaryActionKind | string;
    primary_label_ar?: string;
    hide_cart?: boolean;
    hide_buy_now?: boolean;
    secondary_ctas?: string[];
  } | null | undefined
): ProductPrimaryAction {
  if (!flow) return base;
  const kind = (
    [
      "add_to_cart",
      "book_appointment",
      "request_design",
      "book_now",
    ] as const
  ).includes(flow.primary_cta as ProductPrimaryActionKind)
    ? (flow.primary_cta as ProductPrimaryActionKind)
    : base.kind;
  return {
    ...base,
    kind,
    label: flow.primary_label_ar?.trim() || base.label,
    hideCart: Boolean(flow.hide_cart),
    hideBuyNow: Boolean(flow.hide_buy_now),
    secondaryCtas: Array.isArray(flow.secondary_ctas)
      ? flow.secondary_ctas
      : base.secondaryCtas,
  };
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
 *
 * Wedding + Nouf → rental_dress (appointment). ready_to_buy is cart alias only.
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
    return "rental_dress";
  }
  return "ready_to_buy";
}
