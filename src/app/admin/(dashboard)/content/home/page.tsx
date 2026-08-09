import type { Metadata } from "next";
import Link from "next/link";
import { HomeHeroCmsForm } from "@/components/admin/cms/HomeHeroCmsForm";
import { HomeCustomDesignCmsForm } from "@/components/admin/cms/HomeCustomDesignCmsForm";
import { getAdminSettings } from "@/lib/admin/data";
import { isCloudinaryConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "محتوى الرئيسية",
};

export default async function AdminHomeContentPage() {
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
        <h1 className="mt-2 text-3xl font-bold text-charcoal">
          محتوى الصفحة الرئيسية
        </h1>
        <p className="mt-2 text-muted">
          تعديل قسم الهيرو وبلاطة تصميم فستان خاص على الرئيسية.
        </p>
      </div>

      {!cloudinaryReady && (
        <div className="rounded-2xl border border-gold/30 bg-gold/5 px-5 py-4 text-sm text-charcoal">
          Cloudinary غير مُعد بعد. يمكنك لصق روابط الصور يدويًا من حقل الرفع.
        </div>
      )}

      <HomeHeroCmsForm initialSettings={settings} />
      <HomeCustomDesignCmsForm initialSettings={settings} />
    </div>
  );
}
