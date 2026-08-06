/**
 * Product-type → valid experience feature IDs.
 * Pure helpers — no DB / env imports (safe for unit tests).
 */

import type { ProductCommerceType } from "./primary-action";
import type { ShopProductType } from "../../types/shop";

/** Per-product assignment JSONB. */
export type ProductFeaturesConfig = {
  use_custom?: boolean;
  enabled_ids?: string[];
};

export function normalizeProductFeaturesConfig(
  raw: unknown
): ProductFeaturesConfig | null {
  if (raw == null || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const enabled_ids = Array.isArray(obj.enabled_ids)
    ? obj.enabled_ids.filter((x): x is string => typeof x === "string")
    : [];
  return {
    use_custom: Boolean(obj.use_custom),
    enabled_ids,
  };
}

/**
 * Features valid for this Product Type (Admin toggles + storefront resolve).
 * Invalid combos (e.g. rental + add_to_cart) are never allowed.
 */
export function allowedFeatureIdsForProduct(input: {
  productType?: ProductCommerceType | string | null;
  shopProductType?: ShopProductType | null;
}): string[] {
  const shop = input.shopProductType;
  if (shop === "veil") {
    return [
      "veil_writing",
      "font_selection",
      "color_selection",
      "gift_wrap",
      "gift_message",
      "luxury_box",
      "express_delivery",
      "add_to_cart",
      "buy_now",
      "wishlist",
    ];
  }
  if (shop === "bridal_robe") {
    return [
      "robe_writing",
      "font_selection",
      "color_selection",
      "gift_wrap",
      "gift_message",
      "luxury_box",
      "express_delivery",
      "add_to_cart",
      "buy_now",
      "wishlist",
    ];
  }

  const type = String(input.productType ?? "ready_to_buy");
  if (type === "rental_dress") {
    // Booked, not purchased — no cart / buy now / gift checkout options.
    return ["appointment_booking", "wishlist"];
  }
  if (type === "custom_design") {
    return ["request_design", "wishlist"];
  }
  if (type === "service") {
    return ["appointment_booking"];
  }
  // bridal_accessory | ready_to_buy — purchase flow, no appointment/design request.
  return [
    "gift_wrap",
    "gift_message",
    "luxury_box",
    "express_delivery",
    "add_to_cart",
    "buy_now",
    "wishlist",
  ];
}

/**
 * Smart defaults when features_config is null / not custom.
 * Driven by product_type + shop surface — never category names.
 */
export function defaultFeatureIdsForProduct(input: {
  productType?: ProductCommerceType | string | null;
  shopProductType?: ShopProductType | null;
}): string[] {
  return [...allowedFeatureIdsForProduct(input)];
}

export function isFeatureAllowedForProduct(
  featureId: string,
  input: {
    productType?: ProductCommerceType | string | null;
    shopProductType?: ShopProductType | null;
  }
): boolean {
  return allowedFeatureIdsForProduct(input).includes(featureId);
}

/**
 * Drop invalid feature ids for the product type.
 * Empty custom lists fall back to type defaults (null = use defaults).
 */
export function sanitizeProductFeaturesConfig(
  raw: ProductFeaturesConfig | null | undefined,
  input: {
    productType?: ProductCommerceType | string | null;
    shopProductType?: ShopProductType | null;
  }
): ProductFeaturesConfig | null {
  const cfg = normalizeProductFeaturesConfig(raw);
  if (!cfg?.use_custom) return null;

  const allowed = new Set(allowedFeatureIdsForProduct(input));
  const enabled_ids = (cfg.enabled_ids ?? []).filter((id) => allowed.has(id));
  if (enabled_ids.length === 0) return null;
  return { use_custom: true, enabled_ids };
}

/** Resolve enabled feature IDs for a product. */
export function resolveEnabledFeatureIds(input: {
  features_config?: ProductFeaturesConfig | null;
  productType?: ProductCommerceType | string | null;
  shopProductType?: ShopProductType | null;
}): string[] {
  const allowed = new Set(allowedFeatureIdsForProduct(input));
  const cfg = normalizeProductFeaturesConfig(input.features_config);
  const base =
    cfg?.use_custom && Array.isArray(cfg.enabled_ids)
      ? cfg.enabled_ids
      : defaultFeatureIdsForProduct(input);
  return base.filter((id) => allowed.has(id));
}
