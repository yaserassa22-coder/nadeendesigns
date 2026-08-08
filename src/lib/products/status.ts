/** Product visibility status (migration 035). Dual-writes to is_available. */

import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";

export type ProductStatus = "published" | "draft" | "hidden";

export const PRODUCT_STATUSES: readonly ProductStatus[] = [
  "published",
  "draft",
  "hidden",
] as const;

/** @deprecated Prefer getProductStatusLabel(status, locale) */
export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  published: "منشور",
  draft: "مسودة",
  hidden: "مخفي",
};

export function getProductStatusLabel(
  status: ProductStatus,
  locale: Locale = "ar"
): string {
  const pe = getDictionary(locale).admin.productEditor;
  if (status === "published") return pe.statusPublished;
  if (status === "draft") return pe.statusDraft;
  return pe.statusHidden;
}

export function isProductStatus(value: unknown): value is ProductStatus {
  return (
    value === "published" || value === "draft" || value === "hidden"
  );
}

/** Derive status when column missing / null (legacy rows). */
export function deriveProductStatus(input: {
  status?: string | null;
  is_available?: boolean | null;
}): ProductStatus {
  if (isProductStatus(input.status)) return input.status;
  return input.is_available === false ? "hidden" : "published";
}

/** Storefront availability from status (published only). */
export function isAvailableFromStatus(status: ProductStatus): boolean {
  return status === "published";
}
