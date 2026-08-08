import type { Metadata } from "next";
import { DressesManager } from "@/components/admin/DressesManager";
import { AdminProductsPageHeader } from "@/components/admin/AdminPageHeader";
import { getAdminDresses } from "@/lib/admin/data";
import { getAdminCategories } from "@/lib/admin/categories-data";
import { selectDressAssignableCategories } from "@/types/category";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: getDictionary(locale).admin.productsUi.pageTitle };
}

/** Always load fresh categories for product Create/Edit selectors. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  searchParams: Promise<{ category?: string }>;
}

export default async function AdminDressesPage({ searchParams }: Props) {
  const [dresses, categories] = await Promise.all([
    getAdminDresses(),
    getAdminCategories(),
  ]);
  // Pass full DB list; DressesManager filters dress-assignable (incl. null kind).
  // Do not pre-filter is_visible — admin must assign to hidden categories too.
  const dressCategories = selectDressAssignableCategories(categories);
  const params = await searchParams;
  const initialCategory =
    params.category &&
    dressCategories.some(
      (c) =>
        c.id === params.category ||
        c.legacy_key === params.category ||
        c.slug === params.category
    )
      ? dressCategories.find(
          (c) =>
            c.id === params.category ||
            c.legacy_key === params.category ||
            c.slug === params.category
        )!.id
      : "all";

  return (
    <AdminProductsPageHeader categories={dressCategories}>
      <DressesManager
        initialDresses={dresses}
        initialCategories={categories}
        initialCategoryFilter={initialCategory}
      />
    </AdminProductsPageHeader>
  );
}
