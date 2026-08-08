import type { Metadata } from "next";
import { AppointmentSettingsPanel } from "@/components/admin/appointments/AppointmentSettingsPanel";

export const metadata: Metadata = {
  title: "إعدادات المواعيد",
};

export const dynamic = "force-dynamic";

export default function AppointmentSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">إعدادات المواعيد</h1>
        <p className="mt-2 text-muted">
          ساعات العمل، أيام العمل، استراحة الغداء، الفاصل بين المواعيد، ومدد
          الحجز — تتحكم في المواعيد المتاحة في صفحة الحجز
        </p>
      </div>
      <AppointmentSettingsPanel />
    </div>
  );
}
