import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

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

  return (
    <div className="min-h-screen bg-ivory print:bg-white">
      <div className="print:hidden">
        <AdminSidebar />
      </div>
      <div className="lg:pr-64 print:pr-0">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10 print:max-w-none print:p-0">
          {children}
        </div>
      </div>
    </div>
  );
}
