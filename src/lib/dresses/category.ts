import type { Dress } from "@/types";
import type { Category } from "@/types/category";
import { SEED_CATEGORIES } from "@/types/category";
import {
  inferProductCommerceTypeFromLegacyCategory,
  isProductCommerceType,
  type ProductCommerceType,
} from "@/lib/products/primary-action";

/**
 * Historical TEXT aliases for seeded dress categories.
 * Used only for backfill / dual-read — not a UI source of truth.
 */
export const LEGACY_DRESS_CATEGORY_ALIASES: Record<string, string[]> = {
  wedding: ["wedding", "wedding_dress"],
  nouf_dresses: ["nouf_dresses", "nouf_dress"],
  rental: ["rental"],
  custom_design: ["custom_design"],
};

/** DB TEXT values to query for a key (includes legacy aliases). */
export function categoryQueryValues(target: string): string[] {
  const aliases = LEGACY_DRESS_CATEGORY_ALIASES[target];
  if (aliases) return [...aliases];
  // Also expand if target is itself an alias
  for (const [canonical, list] of Object.entries(LEGACY_DRESS_CATEGORY_ALIASES)) {
    if (list.includes(target)) return [...list, canonical];
  }
  return [target];
}

/** Normalize known legacy TEXT values; pass through dynamic slug/legacy_key. */
export function normalizeDressCategoryText(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed === "wedding_dress") return "wedding";
  if (trimmed === "nouf_dress") return "nouf_dresses";
  return trimmed;
}

export function withNormalizedDressCategory<T extends { category: string }>(
  dress: T
): T & { category: string } {
  const normalized = normalizeDressCategoryText(dress.category);
  if (normalized) return { ...dress, category: normalized };
  return { ...dress, category: dress.category || "wedding" };
}

/** Ensure product_type is set (hydrate from legacy category TEXT only when missing). */
export function withResolvedProductType<
  T extends { category: string; product_type?: ProductCommerceType | null },
>(dress: T): T & { product_type: ProductCommerceType } {
  if (isProductCommerceType(dress.product_type)) {
    return { ...dress, product_type: dress.product_type };
  }
  return {
    ...dress,
    product_type: inferProductCommerceTypeFromLegacyCategory(dress.category),
  };
}

export function normalizeDressList(dresses: Dress[]): Dress[] {
  return dresses.map((d) =>
    withResolvedProductType(withNormalizedDressCategory(d))
  );
}

/** Resolve TEXT key used when dual-writing dresses.category */
export function categoryTextKey(
  category: Pick<Category, "legacy_key" | "slug">
): string {
  return category.legacy_key?.trim() || category.slug.trim();
}

/** Find category by id, legacy_key, or slug (seed fallback included). */
export function findCategoryMatch(
  categories: Category[],
  key: string | null | undefined
): Category | undefined {
  if (!key?.trim()) return undefined;
  const raw = key.trim();
  const normalized = normalizeDressCategoryText(raw) ?? raw;
  const lower = normalized.toLowerCase();
  return categories.find((c) => {
    if (c.id === raw) return true;
    if (c.legacy_key?.toLowerCase() === lower) return true;
    if (c.slug?.toLowerCase() === lower) return true;
    const aliases = c.legacy_key
      ? LEGACY_DRESS_CATEGORY_ALIASES[c.legacy_key]
      : undefined;
    if (aliases?.some((a) => a.toLowerCase() === lower)) return true;
    return false;
  });
}

export function seedCategoryByLegacyKey(legacyKey: string): Category | undefined {
  return SEED_CATEGORIES.find((c) => c.legacy_key === legacyKey);
}

/** @deprecated Use normalizeDressCategoryText */
export const normalizeDressCategory = normalizeDressCategoryText;
