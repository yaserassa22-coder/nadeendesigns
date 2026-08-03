import type { Metadata } from "next";
import { AppointmentAnalyticsPanel } from "@/components/admin/appointments/AppointmentAnalyticsPanel";

export const metadata: Metadata = {
  title: "تحليلات المواعيد",
};

export const dynamic = "force-dynamic";

export default function AppointmentAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">تحليلات المواعيد</h1>
        <p className="mt-2 text-muted">
          اليوم / غدًا، الإكمال، الإلغاء، عدم الحضور، الساعات والأيام الأكثر ازدحامًا
        </p>
      </div>
      <AppointmentAnalyticsPanel />
    </div>
  );
}
