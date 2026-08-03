import type { Metadata } from "next";
import Link from "next/link";
import { AboutCmsForm } from "@/components/admin/cms/AboutCmsForm";
import { getAdminSettings } from "@/lib/admin/data";
import { isCloudinaryConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "محتوى من نحن",
};

export default async function AdminAboutContentPage() {
  const settings = await getAdminSettings();
  const cloudinaryReady = isCloudinaryConfigured();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted">
          <Link href="/admin/settings" className="text-gold hover:underline">
            الإعدادات
          </Link>
          <span className="mx-2">/</span>
          محتوى الموقع
        </p>
        <h1 className="mt-2 text-3xl font-bold text-charcoal">محتوى من نحن</h1>
        <p className="mt-2 text-muted">
          تعديل نصوص الصفحة، الصورة، القيم، وزر الدعوة للحجز.
        </p>
      </div>

      {!cloudinaryReady && (
        <div className="rounded-2xl border border-gold/30 bg-gold/5 px-5 py-4 text-sm text-charcoal">
          Cloudinary غير مُعد بعد. يمكنك لصق روابط الصور يدويًا من حقل الرفع.
        </div>
      )}

      <AboutCmsForm initialSettings={settings} />
    </div>
  );
}
