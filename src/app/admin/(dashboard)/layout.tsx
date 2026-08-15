import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/shell/AdminChrome";
import { AdminSessionTimeout } from "@/components/admin/AdminSessionTimeout";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getProfileRole, isAdminRole } from "@/lib/customer-auth/customer";

export default async function AdminDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login?error=config");
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/admin/login");
  }

  const role = await getProfileRole(user.id);
  if (!isAdminRole(role)) {
    redirect("/admin/login?error=admin_only");
  }

  return (
    <>
      <AdminChrome email={user.email}>{children}</AdminChrome>
      <AdminSessionTimeout />
    </>
  );
}
