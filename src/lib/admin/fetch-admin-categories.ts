import type { Category } from "@/types/category";
import { selectDressAssignableCategories } from "@/types/category";

/**
 * Single source of truth for admin product category selectors.
 * Always hits GET /api/categories with no-store — Create and Edit must share this.
 */
export async function fetchAdminCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`categories_fetch_failed:${res.status}`);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("categories_fetch_invalid_payload");
  }
  return data as Category[];
}

export function dressAssignableFrom(categories: readonly Category[]): Category[] {
  return selectDressAssignableCategories(categories);
}

export function collectionCategoriesFrom(
  categories: readonly Category[]
): Category[] {
  return categories.filter((c) => c.featured_collection || c.show_on_homepage);
}
