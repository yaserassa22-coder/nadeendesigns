import { DRESS_CATEGORIES, type DressCategory } from "@/types";

/** Product kind for category move guards (veil ↔ dress blocked). */
export type ProductKind = "dress" | "veil" | "bridal_robe" | "accessories_group";

const DRESS_KEYS = new Set<string>(DRESS_CATEGORIES);

export function productKindFromLegacyKey(
  legacyKey: string | null | undefined
): ProductKind | null {
  if (!legacyKey) return null;
  if (DRESS_KEYS.has(legacyKey)) return "dress";
  if (legacyKey === "veils" || legacyKey === "veil") return "veil";
  if (legacyKey === "bridal_robes" || legacyKey === "bridal_cape") {
    return "bridal_robe";
  }
  if (legacyKey === "bridal_accessories") return "accessories_group";
  return null;
}

export function isDressLegacyKey(legacyKey: string | null | undefined): boolean {
  return productKindFromLegacyKey(legacyKey) === "dress";
}

export function assertSameKindMove(
  fromKind: ProductKind,
  targetLegacyKey: string | null | undefined
): { ok: true } | { ok: false; message: string } {
  const targetKind = productKindFromLegacyKey(targetLegacyKey);
  if (!targetKind) {
    return {
      ok: false,
      message: "التصنيف المستهدف غير معروف أو غير مرتبط بنوع منتج.",
    };
  }
  if (targetKind === "accessories_group") {
    return {
      ok: false,
      message: "لا يمكن نقل المنتج إلى مجموعة اكسسوارات العروس مباشرة.",
    };
  }
  if (fromKind !== targetKind) {
    return {
      ok: false,
      message:
        "لا يمكن نقل المنتج بين أنواع مختلفة (فساتين ↔ طرحات ↔ برنص). اختاري تصنيفاً من نفس النوع.",
    };
  }
  return { ok: true };
}

export function dressLegacyKeys(): DressCategory[] {
  return [...DRESS_CATEGORIES];
}
