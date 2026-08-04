import {
  DRESS_CATEGORIES,
  normalizeDressCategory,
  type Dress,
  type DressCategory,
} from "@/types";

export { normalizeDressCategory };

/** DB values to query for a canonical category (includes legacy aliases). */
export function categoryQueryValues(target: string): string[] {
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
  const normalized = normalizeDressCategory(dress.category);
  if (normalized) return { ...dress, category: normalized };
  // Dynamic categories store free-text slug / legacy_key on dresses.category
  const raw = dress.category?.trim();
  if (raw) return { ...dress, category: raw as DressCategory };
  return { ...dress, category: "wedding" };
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
