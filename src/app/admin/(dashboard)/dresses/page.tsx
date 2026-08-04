import type { Metadata } from "next";
import { DressesManager } from "@/components/admin/DressesManager";
import { getAdminDresses } from "@/lib/admin/data";
import { getAdminCategories } from "@/lib/admin/categories-data";
import { selectDressAssignableCategories } from "@/types/category";

export const metadata: Metadata = {
  title: "إدارة المنتجات",
};

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">إدارة المنتجات</h1>
        <p className="mt-2 text-muted">
          إدارة{" "}
          {dressCategories.map((c) => c.name_ar).join(" · ") || "التصنيفات الديناميكية"}
        </p>
      </div>
      <DressesManager
        initialDresses={dresses}
        initialCategories={categories}
        initialCategoryFilter={initialCategory}
      />
    </div>
  );
}
