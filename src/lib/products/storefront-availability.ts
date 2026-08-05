/**
 * Storefront availability labels — status only, never exact inventory counts.
 * Quantity remains Admin-only.
 */

export type StorefrontAvailabilityKind =
  | "in_stock"
  | "ready_to_order"
  | "out_of_stock";

const LABELS: Record<StorefrontAvailabilityKind, string> = {
  in_stock: "✓ متوفر",
  ready_to_order: "✓ متوفر",
  out_of_stock: "نفد المخزون",
};

export function storefrontAvailabilityLabel(
  kind: StorefrontAvailabilityKind
): string {
  return LABELS[kind];
}

/**
 * Shop products (veils / robes) with stock_quantity.
 * Never expose the numeric quantity on the storefront.
 */
export function shopStockAvailability(input: {
  isAvailable: boolean;
  stockQuantity: number;
}): {
  available: boolean;
  kind: StorefrontAvailabilityKind;
  label: string;
} {
  const available = input.isAvailable && input.stockQuantity > 0;
  const kind: StorefrontAvailabilityKind = available
    ? "in_stock"
    : "out_of_stock";
  return { available, kind, label: storefrontAvailabilityLabel(kind) };
}

/**
 * Dresses / bookable products without public stock counts.
 */
export function dressAvailability(isAvailable: boolean): {
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
    label: storefrontAvailabilityLabel(kind),
  };
}
