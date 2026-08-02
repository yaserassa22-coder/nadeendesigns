import type { Metadata } from "next";
import { DressesManager } from "@/components/admin/DressesManager";
import { getAdminDresses } from "@/lib/admin/data";

export const metadata: Metadata = {
  title: "فساتين نوف",
};

export default async function AdminNoufDressesPage() {
  const dresses = await getAdminDresses();
  const noufDresses = dresses.filter((d) => d.category === "nouf_dresses");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">👗 فساتين نوف</h1>
        <p className="mt-2 text-muted">
          إدارة مستقلة لفساتين نوف — إضافة، تعديل، حذف، بحث، وتصفية. التصنيف
          المحفوظ دائمًا:{" "}
          <code className="rounded bg-beige px-1.5 py-0.5 text-gold">
            nouf_dresses
          </code>
        </p>
      </div>
      <DressesManager
        initialDresses={noufDresses}
        lockedCategory="nouf_dresses"
        initialCategoryFilter="nouf_dresses"
      />
    </div>
  );
}
