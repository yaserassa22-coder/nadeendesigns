import type { Dress, DressFilters } from "@/types";

export function filterDressesClient(
  dresses: Dress[],
  filters: DressFilters
): Dress[] {
  let result = [...dresses];

  if (filters.category) {
    result = result.filter((d) => d.category === filters.category);
  }
  if (filters.featured) {
    result = result.filter((d) => d.is_featured);
  }
  if (filters.style) {
    result = result.filter((d) => d.style === filters.style);
  }
  if (filters.color) {
    result = result.filter((d) => d.color === filters.color);
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
