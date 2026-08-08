/**
 * Storefront availability labels — status only, never exact inventory counts.
 * Quantity remains Admin-only. Labels follow the active storefront locale.
 */

import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";

export type StorefrontAvailabilityKind =
  | "in_stock"
  | "ready_to_order"
  | "out_of_stock";

export function storefrontAvailabilityLabel(
  kind: StorefrontAvailabilityKind,
  locale: Locale = "ar"
): string {
  const t = getDictionary(locale).productExtras;
  return kind === "out_of_stock" ? t.outOfStock : t.inStock;
}

/**
 * Shop products (veils / robes) with stock_quantity.
 * Never expose the numeric quantity on the storefront.
 */
export function shopStockAvailability(input: {
  isAvailable: boolean;
  stockQuantity: number;
  locale?: Locale;
}): {
  available: boolean;
  kind: StorefrontAvailabilityKind;
  label: string;
} {
  const locale = input.locale ?? "ar";
  const available = input.isAvailable && input.stockQuantity > 0;
  const kind: StorefrontAvailabilityKind = available
    ? "in_stock"
    : "out_of_stock";
  return { available, kind, label: storefrontAvailabilityLabel(kind, locale) };
}

/**
 * Dresses / bookable products without public stock counts.
 */
export function dressAvailability(
  isAvailable: boolean,
  locale: Locale = "ar"
): {
  available: boolean;
  kind: StorefrontAvailabilityKind;
  label: string;
} {
  const kind: StorefrontAvailabilityKind = isAvailable
    ? "ready_to_order"
    : "out_of_stock";
  return {
    available: isAvailable,
    kind,
    label: storefrontAvailabilityLabel(kind, locale),
  };
}
