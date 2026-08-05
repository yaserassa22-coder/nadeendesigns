import type { Metadata } from "next";
import { StoreSettingsPanel } from "@/components/admin/StoreSettingsPanel";
import { getStoreSettings } from "@/lib/store/settings";
import { isCloudinaryConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "إعدادات المتجر",
};

export default async function AdminSettingsPage() {
  const settings = await getStoreSettings(true);
  const cloudinaryReady = isCloudinaryConfigured();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">إعدادات المتجر</h1>
        <p className="mt-2 text-muted">
          إدارة مركزية للمتجر من قاعدة البيانات — الاسم، التواصل، الدفع، الشحن،
          SEO، والصحة. لا حاجة لتعديل الكود لتفعيل الميزات.
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

      <StoreSettingsPanel initialSettings={settings} />
    </div>
  );
}
