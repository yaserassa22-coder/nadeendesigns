import type { Metadata } from "next";
import { NotificationsSettingsForm } from "@/components/admin/NotificationsSettingsForm";
import { getNotificationSettings } from "@/lib/notifications/settings";

export const metadata: Metadata = {
  title: "إعدادات الإشعارات",
};

export default async function AdminNotificationsPage() {
  const settings = await getNotificationSettings(true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">الإشعارات</h1>
        <p className="mt-2 text-muted">
          قوالب الإيميل والواتساب، اسم المرسل، بريد الرد، وهاتف البوتيك
        </p>
      </div>

      <div className="rounded-2xl border border-gold/25 bg-gradient-to-l from-beige/50 to-ivory px-5 py-4 text-sm text-charcoal">
        تأكدي من ضبط{" "}
        <code className="text-gold">RESEND_API_KEY</code> و{" "}
        <code className="text-gold">TWILIO_*</code> في البيئة، وتشغيل{" "}
        <code className="text-gold">supabase/APPLY_NOTIFICATIONS.sql</code>.
      </div>

      <NotificationsSettingsForm initialSettings={settings} />
    </div>
  );
}
