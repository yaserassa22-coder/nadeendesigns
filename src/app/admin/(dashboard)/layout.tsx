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
    <div className="min-h-screen bg-ivory">
      <AdminSidebar />
      <div className="lg:pr-64">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
          {children}
        </div>
      </div>
    </div>
  );
}
