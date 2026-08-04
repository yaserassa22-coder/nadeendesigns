import type { Metadata } from "next";
import { DressesManager } from "@/components/admin/DressesManager";
import { getAdminDresses } from "@/lib/admin/data";
import { getAdminCategories } from "@/lib/admin/categories-data";

export const metadata: Metadata = {
  title: "فساتين نوف",
};

export default async function AdminNoufDressesPage() {
  const [dresses, categories] = await Promise.all([
    getAdminDresses(),
    getAdminCategories(),
  ]);
  const noufCategory = categories.find(
    (c) => c.legacy_key === "nouf_dresses" || c.slug === "nouf-dresses"
  );
  const noufDresses = dresses.filter(
    (d) =>
      d.category === "nouf_dresses" ||
      d.category === "nouf_dress" ||
      (noufCategory && d.category_id === noufCategory.id)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">👗 فساتين نوف</h1>
        <p className="mt-2 text-muted">
          إدارة مستقلة لفساتين نوف — إضافة، تعديل، حذف، بحث، وتصفية.
          {noufCategory ? (
            <>
              {" "}
              التصنيف:{" "}
              <span className="rounded bg-beige px-1.5 py-0.5 text-gold">
                {noufCategory.name_ar}
              </span>
            </>
          ) : null}
        </p>
      </div>
      <DressesManager
        initialDresses={noufDresses}
        initialCategories={categories}
        lockedCategoryId={noufCategory?.id}
        lockedCategory="nouf_dresses"
        initialCategoryFilter={noufCategory?.id ?? "nouf_dresses"}
      />
    </div>
  );
}
