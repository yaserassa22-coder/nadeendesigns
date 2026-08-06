import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdministratorsManager } from "@/components/admin/AdministratorsManager";
import { canManageAdministrators } from "@/lib/admin/permissions";
import { getProfileRole } from "@/lib/customer-auth/customer";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "المسؤولون",
};

export const dynamic = "force-dynamic";

export default async function AdminAdministratorsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login");

  const role = await getProfileRole(user.id);
  if (
    !canManageAdministrators({
      id: user.id,
      email: user.email,
      role,
    })
  ) {
    redirect("/admin?error=admins_forbidden");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted">إعدادات ← المسؤولون</p>
        <h1 className="mt-1 text-3xl font-bold text-charcoal">المسؤولون</h1>
        <p className="mt-2 text-muted">
          أضيفي موظفين ومسؤولين بأدوار مختلفة (موظف / مدير / مسؤول / مالك)،
          غيّري الأدوار، وعطّلي الحسابات دون حذف بيانات العملاء.
        </p>
      </div>
      <AdministratorsManager />
    </div>
  );
}
