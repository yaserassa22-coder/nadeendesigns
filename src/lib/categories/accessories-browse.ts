import { resolveCategoryHref } from "@/lib/categories/href";
import { getCategoryProductCounts } from "@/lib/categories/product-counts";
import { getCategories } from "@/lib/data/categories";
import { resolveCategoryLabel } from "@/lib/i18n/category-labels";
import type { Locale } from "@/lib/i18n/types";
import {
  buildAdminProductSidebarGroups,
  isAccessoriesGroupCategory,
  type Category,
} from "@/types/category";
import type { AccessoriesBrowseItem } from "@/components/shop/AccessoriesBrowseSidebar";

export type AccessoriesBrowseNav = {
  parent: Category;
  parentHref: string;
  parentLabel: string;
  parentCount: number;
  items: AccessoriesBrowseItem[];
};

/** Storefront accessories sidebar model (DB-driven children + counts). */
export async function getAccessoriesBrowseNav(
  locale: Locale
): Promise<AccessoriesBrowseNav | null> {
  const categories = await getCategories();
  const grouped = buildAdminProductSidebarGroups(categories);
  const parent = grouped.accessoriesParent;
  if (!parent) return null;

  const visibleChildren = grouped.accessoriesChildren.filter(
    (c) => c.is_visible !== false
  );
  const countIds = [parent, ...visibleChildren];
  const counts = await getCategoryProductCounts(countIds);

  return {
    parent,
    parentHref: resolveCategoryHref(parent),
    parentLabel: resolveCategoryLabel(parent, locale),
    parentCount: counts[parent.id] ?? 0,
    items: visibleChildren.map((c) => ({
      id: c.id,
      href: resolveCategoryHref(c),
      label: resolveCategoryLabel(c, locale),
      count: counts[c.id] ?? 0,
    })),
  };
}

export function isAccessoriesBrowseCategory(
  category: Category,
  parentId: string | null | undefined
): boolean {
  if (isAccessoriesGroupCategory(category)) return true;
  if (parentId && category.parent_id === parentId) return true;
  return false;
}
