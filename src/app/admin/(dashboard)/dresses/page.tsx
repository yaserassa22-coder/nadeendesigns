import type { Metadata } from "next";
import { DressesManager } from "@/components/admin/DressesManager";
import { getAdminDresses } from "@/lib/admin/data";
import { DRESS_CATEGORIES, DRESS_CATEGORY_LABELS, type DressCategory } from "@/types";

export const metadata: Metadata = {
  title: "إدارة المنتجات",
};

interface Props {
  searchParams: Promise<{ category?: string }>;
}

export default async function AdminDressesPage({ searchParams }: Props) {
  const dresses = await getAdminDresses();
  const params = await searchParams;
  const initialCategory =
    params.category &&
    DRESS_CATEGORIES.includes(params.category as DressCategory)
      ? (params.category as DressCategory)
      : "all";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">إدارة المنتجات</h1>
        <p className="mt-2 text-muted">
          إدارة{" "}
          {DRESS_CATEGORIES.map((c) => DRESS_CATEGORY_LABELS[c]).join(" · ")}
        </p>
      </div>
      <DressesManager
        initialDresses={dresses}
        initialCategoryFilter={initialCategory}
      />
    </div>
  );
}
