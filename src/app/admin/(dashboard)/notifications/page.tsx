import type { Metadata } from "next";
import { EmailProviderPanel } from "@/components/admin/EmailProviderPanel";
import { LocalNotificationOutboxPanel } from "@/components/admin/LocalNotificationOutboxPanel";
import { NotificationsSettingsForm } from "@/components/admin/NotificationsSettingsForm";
import { getNotificationSettings } from "@/lib/notifications/settings";
import { getEmailRuntime } from "@/lib/notifications/email-provider";

export const metadata: Metadata = {
  title: "إعدادات الإشعارات",
};

export default async function AdminNotificationsPage() {
  const [settings] = await Promise.all([
    getNotificationSettings(true),
    getEmailRuntime(true),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">الإشعارات</h1>
        <p className="mt-2 text-muted">
          اتصال البريد (Resend)، صندوق محلي للاختبار، قوالب الإيميل والواتساب —
          كلّه من لوحة الإدارة دون تعديل كود
        </p>
      </div>

      <EmailProviderPanel />

      <LocalNotificationOutboxPanel />

      <NotificationsSettingsForm initialSettings={settings} />
    </div>
  );
}
