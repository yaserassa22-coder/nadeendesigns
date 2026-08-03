"use client";

import Image from "next/image";
import { useState } from "react";
import type { SiteSettings } from "@/types";
import { SITE_NAME } from "@/lib/constants";
import { splitTitleEmphasis } from "@/lib/cms/locale-text";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { CmsLivePreview } from "@/components/admin/cms/CmsLivePreview";

type HeroCmsFields = Pick<
  SiteSettings,
  | "hero_title_ar"
  | "hero_title_emphasis_ar"
  | "hero_subtitle_ar"
  | "hero_image_url"
  | "hero_image_alt_ar"
  | "hero_cta_primary_label_ar"
  | "hero_cta_primary_href"
  | "hero_cta_secondary_label_ar"
  | "hero_cta_secondary_href"
>;

interface HomeHeroCmsFormProps {
  initialSettings: SiteSettings;
}

export function HomeHeroCmsForm({ initialSettings }: HomeHeroCmsFormProps) {
  const [form, setForm] = useState<HeroCmsFields>({
    hero_title_ar: initialSettings.hero_title_ar,
    hero_title_emphasis_ar: initialSettings.hero_title_emphasis_ar,
    hero_subtitle_ar: initialSettings.hero_subtitle_ar,
    hero_image_url: initialSettings.hero_image_url,
    hero_image_alt_ar: initialSettings.hero_image_alt_ar,
    hero_cta_primary_label_ar: initialSettings.hero_cta_primary_label_ar,
    hero_cta_primary_href: initialSettings.hero_cta_primary_href,
    hero_cta_secondary_label_ar: initialSettings.hero_cta_secondary_label_ar,
    hero_cta_secondary_href: initialSettings.hero_cta_secondary_href,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const update = <K extends keyof HeroCmsFields>(
    key: K,
    value: HeroCmsFields[K]
  ) => {
    setForm((s) => ({ ...s, [key]: value }));
    setMessage("");
  };

  const save = async () => {
    if (!form.hero_title_ar.trim()) {
      setError("عنوان الهيرو مطلوب");
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل الحفظ");
      if (data.settings) {
        const s = data.settings as SiteSettings;
        setForm({
          hero_title_ar: s.hero_title_ar,
          hero_title_emphasis_ar: s.hero_title_emphasis_ar,
          hero_subtitle_ar: s.hero_subtitle_ar,
          hero_image_url: s.hero_image_url,
          hero_image_alt_ar: s.hero_image_alt_ar,
          hero_cta_primary_label_ar: s.hero_cta_primary_label_ar,
          hero_cta_primary_href: s.hero_cta_primary_href,
          hero_cta_secondary_label_ar: s.hero_cta_secondary_label_ar,
          hero_cta_secondary_href: s.hero_cta_secondary_href,
        });
      }
      setMessage("تم الحفظ بنجاح");
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const split = splitTitleEmphasis(
    form.hero_title_ar,
    form.hero_title_emphasis_ar
  );
  const previewImage = form.hero_image_url?.trim() || "/hero.webp";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
      <div className="space-y-6 rounded-2xl border border-beige-dark bg-white p-6 md:p-8">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">قسم الهيرو</h2>
          <p className="mt-1 text-sm text-muted">
            يظهر في أعلى الصفحة الرئيسية. العنوان مطلوب؛ الصورة اختيارية.
          </p>
        </div>

        <Input
          label="العنوان *"
          value={form.hero_title_ar}
          onChange={(e) => update("hero_title_ar", e.target.value)}
          error={!form.hero_title_ar.trim() && error ? error : undefined}
        />
        <Input
          label="الكلمة المميزة (تُعرض بخط عريض وخط ذهبي)"
          value={form.hero_title_emphasis_ar}
          onChange={(e) => update("hero_title_emphasis_ar", e.target.value)}
          placeholder="تفاصيل"
        />
        <Textarea
          label="الوصف"
          rows={4}
          value={form.hero_subtitle_ar}
          onChange={(e) => update("hero_subtitle_ar", e.target.value)}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-charcoal">صورة الهيرو</p>
          <ImageUpload
            multiple={false}
            value={form.hero_image_url ? [form.hero_image_url] : []}
            onChange={(urls) => update("hero_image_url", urls[0] ?? "")}
          />
          <p className="text-xs text-muted">
            استبدلي أو احذفي الصورة. المعاينة تظهر فورًا قبل الحفظ.
          </p>
        </div>

        <Input
          label="النص البديل للصورة"
          value={form.hero_image_alt_ar}
          onChange={(e) => update("hero_image_alt_ar", e.target.value)}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="زر أساسي — النص"
            value={form.hero_cta_primary_label_ar}
            onChange={(e) => update("hero_cta_primary_label_ar", e.target.value)}
          />
          <Input
            label="زر أساسي — الرابط"
            value={form.hero_cta_primary_href}
            onChange={(e) => update("hero_cta_primary_href", e.target.value)}
            dir="ltr"
          />
          <Input
            label="زر ثانوي — النص"
            value={form.hero_cta_secondary_label_ar}
            onChange={(e) =>
              update("hero_cta_secondary_label_ar", e.target.value)
            }
          />
          <Input
            label="زر ثانوي — الرابط"
            value={form.hero_cta_secondary_href}
            onChange={(e) => update("hero_cta_secondary_href", e.target.value)}
            dir="ltr"
          />
        </div>

        {message && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        )}
        {error && form.hero_title_ar.trim() && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <Button loading={saving} onClick={save}>
          {saving ? "جاري الحفظ..." : "حفظ المحتوى"}
        </Button>
      </div>

      <CmsLivePreview title="معاينة الهيرو">
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-beige">
          <Image
            src={previewImage}
            alt=""
            fill
            className="object-cover object-[center_25%]"
            sizes="380px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2c2419]/50 via-[#f0ebe3]/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 space-y-2 p-4 text-charcoal">
            <p className="font-[family-name:var(--font-cormorant)] text-lg tracking-[0.18em] text-gold">
              {SITE_NAME}
            </p>
            <p className="text-base font-medium leading-snug">
              {split ? (
                <>
                  {split.before}
                  <span className="relative inline-block font-bold">
                    {split.emphasis}
                    <span
                      aria-hidden
                      className="absolute -bottom-0.5 start-0 h-px w-full bg-gold/70"
                    />
                  </span>
                  {split.after}
                </>
              ) : (
                form.hero_title_ar || "—"
              )}
            </p>
            <p className="whitespace-pre-line text-xs leading-relaxed text-charcoal/75">
              {form.hero_subtitle_ar}
            </p>
            <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
              <span className="rounded-full bg-gold px-2.5 py-1 text-white">
                {form.hero_cta_primary_label_ar || "—"}
              </span>
              <span className="rounded-full border border-gold px-2.5 py-1 text-gold">
                {form.hero_cta_secondary_label_ar || "—"}
              </span>
            </div>
          </div>
        </div>
      </CmsLivePreview>
    </div>
  );
}
