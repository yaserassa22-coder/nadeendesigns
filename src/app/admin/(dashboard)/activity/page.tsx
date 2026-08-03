import type { Metadata } from "next";
import { ActivityLogManager } from "@/components/admin/ActivityLogManager";

export const metadata: Metadata = {
  title: "سجل النشاط",
};

export const dynamic = "force-dynamic";

export default function AdminActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">سجل النشاط</h1>
        <p className="mt-2 text-muted">
          أرشفة، حذف، استعادة، تجاوز تعارض المواعيد، وتغييرات الحالة
        </p>
      </div>
      <ActivityLogManager />
    </div>
  );
}
