import type { Metadata } from "next";
import { DressesManager } from "@/components/admin/DressesManager";
import { getAdminDresses } from "@/lib/admin/data";

export const metadata: Metadata = {
  title: "إدارة الفساتين",
};

export default async function AdminDressesPage() {
  const dresses = await getAdminDresses();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">إدارة الفساتين</h1>
        <p className="mt-2 text-muted">
          إضافة وتعديل وحذف فساتين الزفاف والإيجار والطرحات والأرواب
        </p>
      </div>
      <DressesManager initialDresses={dresses} />
    </div>
  );
}
