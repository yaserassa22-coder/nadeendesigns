import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
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
    <div className="min-h-screen bg-ivory print:bg-white">
      <div className="print:hidden">
        <AdminSidebar />
      </div>
      <AdminSessionTimeout />
      <div className="lg:ps-64 print:ps-0">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10 print:max-w-none print:p-0">
          {children}
        </div>
      </div>
    </div>
  );
}
