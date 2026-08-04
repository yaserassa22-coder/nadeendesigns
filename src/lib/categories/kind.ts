import type { Category, CategoryProductKind } from "@/types/category";
import {
  resolveCategoryProductKind,
} from "@/types/category";

/** Product kind for category move guards (veil ↔ dress blocked). */
export type ProductKind = CategoryProductKind;

export function productKindFromCategory(
  category: Pick<Category, "product_kind" | "legacy_key"> | null | undefined
): ProductKind | null {
  if (!category) return null;
  return resolveCategoryProductKind(category);
}

/** @deprecated Prefer productKindFromCategory — kept for redirect aliases */
export function productKindFromLegacyKey(
  legacyKey: string | null | undefined
): ProductKind | null {
  return productKindFromCategory({
    product_kind: null,
    legacy_key: legacyKey ?? null,
  });
}

export function isDressLegacyKey(legacyKey: string | null | undefined): boolean {
  return productKindFromLegacyKey(legacyKey) === "dress";
}

export function isDressCategoryRow(
  category: Pick<Category, "product_kind" | "legacy_key"> | null | undefined
): boolean {
  if (!category) return false;
  const kind = resolveCategoryProductKind(category);
  // Admin-created rows without product_kind are treated as dress sections
  return kind === "dress" || kind === null;
}

export function assertSameKindMove(
  fromKind: ProductKind,
  target: Pick<Category, "product_kind" | "legacy_key" | "name_ar"> | null | undefined
): { ok: true } | { ok: false; message: string } {
  const targetKind = productKindFromCategory(target);
  if (!targetKind && target) {
    // Unknown kind on a real category → allow dress products into dress-default rows
    if (fromKind === "dress") return { ok: true };
  }
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
