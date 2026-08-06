import type { Metadata } from "next";
import { AdministratorsManager } from "@/components/admin/AdministratorsManager";

export const metadata: Metadata = {
  title: "المسؤولون",
};

export const dynamic = "force-dynamic";

export default function AdminAdministratorsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted">إعدادات ← المسؤولون</p>
        <h1 className="mt-1 text-3xl font-bold text-charcoal">المسؤولون</h1>
        <p className="mt-2 text-muted">
          ترقية العملاء المسجّلين إلى مسؤولين، تعطيل الحسابات، وإلغاء الصلاحيات
          دون حذف بيانات العملاء. محمي ضد إزالة آخر مسؤول.
        </p>
      </div>
      <AdministratorsManager />
    </div>
  );
}
