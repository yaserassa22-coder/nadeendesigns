import {
  DRESS_CATEGORIES,
  normalizeDressCategory,
  type Dress,
  type DressCategory,
} from "@/types";

export { normalizeDressCategory };

/** DB values to query for a canonical category (includes legacy aliases). */
export function categoryQueryValues(target: DressCategory): string[] {
  if (target === "wedding") return ["wedding", "wedding_dress"];
  if (target === "nouf_dresses") return ["nouf_dresses", "nouf_dress"];
  return [target];
}

export function isDressCategory(value: string): value is DressCategory {
  return normalizeDressCategory(value) !== null;
}

export function withNormalizedDressCategory<T extends { category: string }>(
  dress: T
): T & { category: DressCategory } {
  const category = normalizeDressCategory(dress.category) ?? "wedding";
  return { ...dress, category };
}

export function normalizeDressList(dresses: Dress[]): Dress[] {
  return dresses.map((d) => withNormalizedDressCategory(d));
}

export function assertDressCategory(value: string): DressCategory {
  const normalized = normalizeDressCategory(value);
  if (!normalized) {
    throw new Error(`Invalid dress category: ${value}`);
  }
  return normalized;
}

export { DRESS_CATEGORIES };
