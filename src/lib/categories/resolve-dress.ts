import { getCategories } from "@/lib/data/categories";
import {
  categoryTextKey,
  findCategoryMatch,
} from "@/lib/dresses/category";
import type { Category } from "@/types/category";
import {
  isDressProductCategory,
  selectDressAssignableCategories,
} from "@/types/category";

/**
 * Resolve a category for dress assignment from category_id and/or TEXT key.
 * Prefers category_id when both are provided.
 */
export async function resolveDressCategory(input: {
  category_id?: string | null;
  category?: string | null;
}): Promise<
  | { ok: true; category: Category; textKey: string }
  | { ok: false; message: string }
> {
  const categories = await getCategories();
  let match: Category | undefined;

  if (input.category_id?.trim()) {
    const id = input.category_id.trim();
    match = categories.find((c) => c.id === id);
    if (!match) {
      return { ok: false, message: "التصنيف المحدد غير موجود" };
    }
  } else if (input.category?.trim()) {
    match = findCategoryMatch(categories, input.category.trim());
    if (!match) {
      return {
        ok: false,
        message: `تصنيف غير صالح: "${input.category}". اختاري تصنيفاً من قائمة التصنيفات.`,
      };
    }
  } else {
    return { ok: false, message: "التصنيف مطلوب" };
  }

  if (!isDressProductCategory(match)) {
    return {
      ok: false,
      message:
        "هذا التصنيف ليس لفساتين. لا يمكن إسناد فستان إلى طرحات أو برنص أو مجموعة اكسسوارات.",
    };
  }

  return {
    ok: true,
    category: match,
    textKey: categoryTextKey(match),
  };
}

/**
 * Dress-kind categories for admin product selectors.
 * Uses DB categories (non-deleted via getCategories) including null product_kind.
 * Hidden (is_visible=false) rows stay assignable in admin.
 */
export async function getDressAssignableCategories(): Promise<Category[]> {
  const all = await getCategories();
  return selectDressAssignableCategories(all);
}
