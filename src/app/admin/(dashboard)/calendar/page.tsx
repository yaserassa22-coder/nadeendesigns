import type { Metadata } from "next";
import { AppointmentCalendar } from "@/components/admin/appointments/AppointmentCalendar";
import { getAdminActorRole } from "@/lib/admin/reports-data";
import { canForceAppointmentOverride } from "@/lib/admin/permissions";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "تقويم المواعيد",
};

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage() {
  const user = await getAuthenticatedUser();
  const role = user ? await getAdminActorRole(user.id) : "admin";
  const canForce = canForceAppointmentOverride({
    id: user?.id ?? "",
    role,
  });

  return (
    <div className="space-y-6 appointment-print-root">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold text-charcoal">تقويم المواعيد</h1>
        <p className="mt-2 text-muted">
          عرض يوم / أسبوع / شهر — سحب لإعادة الجدولة أو تعديل سريع مع فحص التعارض
        </p>
      </div>
      <AppointmentCalendar canForceOverride={canForce} />
    </div>
  );
}
