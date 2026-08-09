"use client";

import Image from "next/image";
import { useState } from "react";
import type { SiteSettings } from "@/types";
import { SITE_NAME } from "@/lib/constants";
import { splitTitleEmphasis } from "@/lib/cms/locale-text";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { CmsLivePreview } from "@/components/admin/cms/CmsLivePreview";

type HeroCmsFields = Pick<
  SiteSettings,
  | "hero_title_ar"
  | "hero_title_he"
  | "hero_title_en"
  | "hero_title_emphasis_ar"
  | "hero_title_emphasis_he"
  | "hero_title_emphasis_en"
  | "hero_subtitle_ar"
  | "hero_subtitle_he"
  | "hero_subtitle_en"
  | "hero_image_url"
  | "hero_image_urls"
  | "hero_image_alt_ar"
  | "hero_image_alt_he"
  | "hero_image_alt_en"
  | "hero_cta_primary_label_ar"
  | "hero_cta_primary_label_he"
  | "hero_cta_primary_label_en"
  | "hero_cta_primary_href"
  | "hero_cta_secondary_label_ar"
  | "hero_cta_secondary_label_he"
  | "hero_cta_secondary_label_en"
  | "hero_cta_secondary_href"
>;

interface HomeHeroCmsFormProps {
  initialSettings: SiteSettings;
}

function heroUploadValue(s: Pick<SiteSettings, "hero_image_url" | "hero_image_urls">): string[] {
  const primary = s.hero_image_url?.trim() || "";
  const extras = Array.isArray(s.hero_image_urls)
    ? s.hero_image_urls.map((u) => u.trim()).filter(Boolean)
    : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of [primary, ...extras]) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= 4) break;
  }
  return out;
}

function fromSettings(s: SiteSettings): HeroCmsFields {
  const slides = heroUploadValue(s);
  return {
    hero_title_ar: s.hero_title_ar ?? "",
    hero_title_he: s.hero_title_he ?? "",
    hero_title_en: s.hero_title_en ?? "",
    hero_title_emphasis_ar: s.hero_title_emphasis_ar ?? "",
    hero_title_emphasis_he: s.hero_title_emphasis_he ?? "",
    hero_title_emphasis_en: s.hero_title_emphasis_en ?? "",
    hero_subtitle_ar: s.hero_subtitle_ar ?? "",
    hero_subtitle_he: s.hero_subtitle_he ?? "",
    hero_subtitle_en: s.hero_subtitle_en ?? "",
    hero_image_url: slides[0] ?? "",
    hero_image_urls: slides.slice(1),
    hero_image_alt_ar: s.hero_image_alt_ar ?? "",
    hero_image_alt_he: s.hero_image_alt_he ?? "",
    hero_image_alt_en: s.hero_image_alt_en ?? "",
    hero_cta_primary_label_ar: s.hero_cta_primary_label_ar ?? "",
    hero_cta_primary_label_he: s.hero_cta_primary_label_he ?? "",
    hero_cta_primary_label_en: s.hero_cta_primary_label_en ?? "",
    hero_cta_primary_href: s.hero_cta_primary_href ?? "",
    hero_cta_secondary_label_ar: s.hero_cta_secondary_label_ar ?? "",
    hero_cta_secondary_label_he: s.hero_cta_secondary_label_he ?? "",
    hero_cta_secondary_label_en: s.hero_cta_secondary_label_en ?? "",
    hero_cta_secondary_href: s.hero_cta_secondary_href ?? "",
  };
}

export function HomeHeroCmsForm({ initialSettings }: HomeHeroCmsFormProps) {
  const { t } = useLocale();
  const cu = t.admin.cmsUi;
  const [form, setForm] = useState<HeroCmsFields>(fromSettings(initialSettings));
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
      setError(cu.heroTitleRequired);
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
      if (!res.ok) throw new Error(data.error ?? cu.saveFailed);
      if (data.settings) {
        setForm(fromSettings(data.settings as SiteSettings));
      }
      setMessage(cu.saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : cu.genericError);
    } finally {
      setSaving(false);
    }
  };

  const split = splitTitleEmphasis(
    form.hero_title_ar,
    form.hero_title_emphasis_ar
  );
  const previewImage = heroUploadValue(form)[0] || "/hero.webp";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
      <div className="space-y-6 rounded-2xl border border-beige-dark bg-white p-6 md:p-8">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">
            {cu.heroSectionTitle}
          </h2>
          <p className="mt-1 text-sm text-muted">{cu.heroSectionDesc}</p>
        </div>

        <div className="space-y-4 rounded-xl border border-beige-dark/70 bg-beige/20 p-4">
          <p className="text-sm font-semibold text-charcoal">عربي</p>
          <Input
            label="العنوان *"
            value={form.hero_title_ar}
            onChange={(e) => update("hero_title_ar", e.target.value)}
            error={!form.hero_title_ar.trim() && error ? error : undefined}
          />
          <Input
            label="الكلمة المميزة"
            value={form.hero_title_emphasis_ar}
            onChange={(e) => update("hero_title_emphasis_ar", e.target.value)}
          />
          <Textarea
            label="الوصف"
            rows={3}
            value={form.hero_subtitle_ar}
            onChange={(e) => update("hero_subtitle_ar", e.target.value)}
          />
          <Input
            label="النص البديل للصورة"
            value={form.hero_image_alt_ar}
            onChange={(e) => update("hero_image_alt_ar", e.target.value)}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="زر أساسي"
              value={form.hero_cta_primary_label_ar}
              onChange={(e) =>
                update("hero_cta_primary_label_ar", e.target.value)
              }
            />
            <Input
              label="زر ثانوي"
              value={form.hero_cta_secondary_label_ar}
              onChange={(e) =>
                update("hero_cta_secondary_label_ar", e.target.value)
              }
            />
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-beige-dark/70 bg-beige/20 p-4" dir="rtl">
          <p className="text-sm font-semibold text-charcoal">עברית</p>
          <Input
            label="כותרת"
            value={form.hero_title_he ?? ""}
            onChange={(e) => update("hero_title_he", e.target.value)}
          />
          <Input
            label="מילת הדגשה"
            value={form.hero_title_emphasis_he ?? ""}
            onChange={(e) => update("hero_title_emphasis_he", e.target.value)}
          />
          <Textarea
            label="תיאור"
            rows={3}
            value={form.hero_subtitle_he ?? ""}
            onChange={(e) => update("hero_subtitle_he", e.target.value)}
          />
          <Input
            label="טקסט חלופי לתמונה"
            value={form.hero_image_alt_he ?? ""}
            onChange={(e) => update("hero_image_alt_he", e.target.value)}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="כפתור ראשי"
              value={form.hero_cta_primary_label_he ?? ""}
              onChange={(e) =>
                update("hero_cta_primary_label_he", e.target.value)
              }
            />
            <Input
              label="כפתור משני"
              value={form.hero_cta_secondary_label_he ?? ""}
              onChange={(e) =>
                update("hero_cta_secondary_label_he", e.target.value)
              }
            />
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-beige-dark/70 bg-beige/20 p-4" dir="ltr">
          <p className="text-sm font-semibold text-charcoal">English</p>
          <Input
            label="Title"
            value={form.hero_title_en ?? ""}
            onChange={(e) => update("hero_title_en", e.target.value)}
          />
          <Input
            label="Emphasis word"
            value={form.hero_title_emphasis_en ?? ""}
            onChange={(e) => update("hero_title_emphasis_en", e.target.value)}
          />
          <Textarea
            label="Subtitle"
            rows={3}
            value={form.hero_subtitle_en ?? ""}
            onChange={(e) => update("hero_subtitle_en", e.target.value)}
          />
          <Input
            label="Image alt"
            value={form.hero_image_alt_en ?? ""}
            onChange={(e) => update("hero_image_alt_en", e.target.value)}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Primary CTA"
              value={form.hero_cta_primary_label_en ?? ""}
              onChange={(e) =>
                update("hero_cta_primary_label_en", e.target.value)
              }
            />
            <Input
              label="Secondary CTA"
              value={form.hero_cta_secondary_label_en ?? ""}
              onChange={(e) =>
                update("hero_cta_secondary_label_en", e.target.value)
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-charcoal">{cu.heroImages}</p>
          <p className="text-xs text-muted">{cu.heroImagesHint}</p>
          <ImageUpload
            multiple
            value={heroUploadValue(form)}
            onChange={(urls) => {
              const unique = [...new Set(urls.map((u) => u.trim()).filter(Boolean))].slice(
                0,
                4
              );
              setForm((s) => ({
                ...s,
                hero_image_url: unique[0] ?? "",
                hero_image_urls: unique.slice(1),
              }));
              setMessage("");
            }}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label={cu.primaryCtaHref}
            value={form.hero_cta_primary_href}
            onChange={(e) => update("hero_cta_primary_href", e.target.value)}
            dir="ltr"
          />
          <Input
            label={cu.secondaryCtaHref}
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
          {saving ? cu.saving : cu.saveContent}
        </Button>
      </div>

      <CmsLivePreview title={cu.heroPreviewTitle}>
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
