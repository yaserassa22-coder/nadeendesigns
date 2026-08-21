import type { Metadata } from "next";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
import { getAdminCategories } from "@/lib/admin/categories-data";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: getDictionary(locale).admin.categoriesUi.pageTitleAccessories };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Dedicated categories manager for veils/robes — independent from dress categories. */
export default async function AdminAccessoriesCategoriesPage() {
  const categories = await getAdminCategories();
  return <CategoriesManager initialCategories={categories} scope="accessories" />;
}
