import type { Metadata } from "next";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
import { getAdminCategories } from "@/lib/admin/categories-data";

export const metadata: Metadata = {
  title: "إدارة التصنيفات",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">إدارة التصنيفات</h1>
        <p className="mt-2 text-muted">
          إضافة وتعديل التصنيفات: الاسم، المعرّف، الأب، الترتيب، الظهور، الأيقونة، صورة الغلاف، والوصف
        </p>
      </div>
      <CategoriesManager initialCategories={categories} />
    </div>
  );
}
