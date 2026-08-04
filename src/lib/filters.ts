import { normalizeDressColor } from "@/lib/colors";
import { categoryQueryValues } from "@/lib/dresses/category";
import { normalizeDressStyle } from "@/lib/styles";
import type { Dress, DressFilters } from "@/types";

export function filterDressesClient(
  dresses: Dress[],
  filters: DressFilters
): Dress[] {
  let result = [...dresses];

  if (filters.categoryId || filters.category) {
    const allowed = filters.category
      ? new Set(categoryQueryValues(filters.category))
      : null;
    result = result.filter((d) => {
      const idMatch = Boolean(
        filters.categoryId && d.category_id === filters.categoryId
      );
      const textMatch = Boolean(
        allowed && (allowed.has(d.category) || d.category === filters.category)
      );
      if (filters.categoryId && filters.category) return idMatch || textMatch;
      if (filters.categoryId) return idMatch;
      return textMatch;
    });
  }
  if (filters.featured) {
    result = result.filter((d) => d.is_featured);
  }
  if (filters.style) {
    result = result.filter(
      (d) => normalizeDressStyle(d.style) === filters.style
    );
  }
  if (filters.color) {
    result = result.filter(
      (d) => normalizeDressColor(d.color) === filters.color
    );
  }
  if (filters.size) {
    result = result.filter((d) => d.size === filters.size);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (d) =>
        d.name_ar.toLowerCase().includes(q) ||
        d.description_ar.toLowerCase().includes(q)
    );
  }

  return result;
}
