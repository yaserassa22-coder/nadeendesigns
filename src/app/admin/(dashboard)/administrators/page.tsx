import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdministratorsManager } from "@/components/admin/AdministratorsManager";
import { canManageAdministrators } from "@/lib/admin/permissions";
import { getProfileRole } from "@/lib/customer-auth/customer";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: getDictionary(locale).admin.administratorsUi.pageTitle };
}

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

  return <AdministratorsManager />;
}
