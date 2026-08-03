import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { getAdminSettings } from "@/lib/admin/data";
import { isCloudinaryConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "إعدادات الموقع",
};

export default async function AdminSettingsPage() {
  const settings = await getAdminSettings();
  const cloudinaryReady = isCloudinaryConfigured();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">إعدادات الموقع</h1>
        <p className="mt-2 text-muted">
          بيانات التواصل، الشحن، وروابط التواصل الاجتماعي. محتوى الهيرو وصفحة من
          نحن من قائمة المحتوى.
        </p>
      </div>

      {!cloudinaryReady && (
        <div className="rounded-2xl border border-gold/30 bg-gold/5 px-5 py-4 text-sm text-charcoal">
          Cloudinary غير مُعد بعد. أضيفي{" "}
          <code className="text-gold">NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</code> و{" "}
          <code className="text-gold">NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET</code>{" "}
          في `.env.local` لتفعيل رفع الصور. يمكنك حاليًا لصق روابط الصور يدويًا.
        </div>
      )}

      <SettingsForm initialSettings={settings} />
    </div>
  );
}
