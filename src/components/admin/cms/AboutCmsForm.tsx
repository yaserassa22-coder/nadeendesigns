"use client";

import Image from "next/image";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { AboutValueIcon, AboutValueItem, SiteSettings } from "@/types";
import {
  ABOUT_ICON_OPTIONS,
  resolveAboutIcon,
} from "@/lib/cms/about-icons";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { CmsLivePreview } from "@/components/admin/cms/CmsLivePreview";

type AboutCmsFields = Pick<
  SiteSettings,
  | "about_page_title_ar"
  | "about_page_subtitle_ar"
  | "about_story_eyebrow_ar"
  | "about_story_heading_ar"
  | "about_ar"
  | "about_secondary_ar"
  | "about_image_url"
  | "about_image_alt_ar"
  | "about_cta_label_ar"
  | "about_cta_href"
  | "about_values"
>;

interface AboutCmsFormProps {
  initialSettings: SiteSettings;
}

const emptyValue = (): AboutValueItem => ({
  icon: "Heart",
  title_ar: "",
  description_ar: "",
});

export function AboutCmsForm({ initialSettings }: AboutCmsFormProps) {
  const { t } = useLocale();
  const cu = t.admin.cmsUi;
  const [form, setForm] = useState<AboutCmsFields>({
    about_page_title_ar: initialSettings.about_page_title_ar,
    about_page_subtitle_ar: initialSettings.about_page_subtitle_ar,
    about_story_eyebrow_ar: initialSettings.about_story_eyebrow_ar,
    about_story_heading_ar: initialSettings.about_story_heading_ar,
    about_ar: initialSettings.about_ar,
    about_secondary_ar: initialSettings.about_secondary_ar,
    about_image_url: initialSettings.about_image_url,
    about_image_alt_ar: initialSettings.about_image_alt_ar,
    about_cta_label_ar: initialSettings.about_cta_label_ar,
    about_cta_href: initialSettings.about_cta_href,
    about_values: initialSettings.about_values.map((v) => ({ ...v })),
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const update = <K extends keyof AboutCmsFields>(
    key: K,
    value: AboutCmsFields[K]
  ) => {
    setForm((s) => ({ ...s, [key]: value }));
    setMessage("");
  };

  const updateValue = (
    index: number,
    key: keyof AboutValueItem,
    value: string
  ) => {
    setForm((s) => {
      const next = s.about_values.map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      );
      return { ...s, about_values: next };
    });
    setMessage("");
  };

  const addValue = () => {
    setForm((s) => ({
      ...s,
      about_values: [...s.about_values, emptyValue()],
    }));
    setMessage("");
  };

  const removeValue = (index: number) => {
    setForm((s) => ({
      ...s,
      about_values: s.about_values.filter((_, i) => i !== index),
    }));
    setMessage("");
  };

  const save = async () => {
    if (!form.about_page_title_ar.trim()) {
      setError(cu.aboutTitleRequired);
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
        const s = data.settings as SiteSettings;
        setForm({
          about_page_title_ar: s.about_page_title_ar,
          about_page_subtitle_ar: s.about_page_subtitle_ar,
          about_story_eyebrow_ar: s.about_story_eyebrow_ar,
          about_story_heading_ar: s.about_story_heading_ar,
          about_ar: s.about_ar,
          about_secondary_ar: s.about_secondary_ar,
          about_image_url: s.about_image_url,
          about_image_alt_ar: s.about_image_alt_ar,
          about_cta_label_ar: s.about_cta_label_ar,
          about_cta_href: s.about_cta_href,
          about_values: s.about_values.map((v) => ({ ...v })),
        });
      }
      setMessage(cu.saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : cu.genericError);
    } finally {
      setSaving(false);
    }
  };

  const previewImage =
    form.about_image_url?.trim() ||
    "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
      <div className="space-y-6 rounded-2xl border border-beige-dark bg-white p-6 md:p-8">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">
            {cu.aboutSectionTitle}
          </h2>
          <p className="mt-1 text-sm text-muted">{cu.aboutSectionDesc}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label={cu.aboutPageTitle}
            value={form.about_page_title_ar}
            onChange={(e) => update("about_page_title_ar", e.target.value)}
            error={
              !form.about_page_title_ar.trim() && error ? error : undefined
            }
          />
          <Input
            label={cu.aboutPageSubtitle}
            value={form.about_page_subtitle_ar}
            onChange={(e) => update("about_page_subtitle_ar", e.target.value)}
          />
          <Input
            label={cu.aboutStoryEyebrow}
            value={form.about_story_eyebrow_ar}
            onChange={(e) => update("about_story_eyebrow_ar", e.target.value)}
          />
          <Input
            label={cu.aboutStoryHeading}
            value={form.about_story_heading_ar}
            onChange={(e) => update("about_story_heading_ar", e.target.value)}
          />
        </div>

        <Textarea
          label={cu.aboutParagraph1}
          rows={5}
          value={form.about_ar}
          onChange={(e) => update("about_ar", e.target.value)}
        />
        <Textarea
          label={cu.aboutParagraph2}
          rows={4}
          value={form.about_secondary_ar}
          onChange={(e) => update("about_secondary_ar", e.target.value)}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-charcoal">{cu.aboutPageImage}</p>
          <ImageUpload
            multiple={false}
            value={form.about_image_url ? [form.about_image_url] : []}
            onChange={(urls) => update("about_image_url", urls[0] ?? "")}
          />
        </div>
        <Input
          label={cu.aboutImageAlt}
          value={form.about_image_alt_ar}
          onChange={(e) => update("about_image_alt_ar", e.target.value)}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label={cu.aboutCtaLabel}
            value={form.about_cta_label_ar}
            onChange={(e) => update("about_cta_label_ar", e.target.value)}
          />
          <Input
            label={cu.aboutCtaHref}
            value={form.about_cta_href}
            onChange={(e) => update("about_cta_href", e.target.value)}
            dir="ltr"
          />
        </div>

        <div className="space-y-4 border-t border-beige-dark pt-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-charcoal">{cu.aboutValues}</h3>
            <Button type="button" variant="outline" size="sm" onClick={addValue}>
              <Plus className="h-4 w-4" />
              {cu.aboutAddValue}
            </Button>
          </div>
          {form.about_values.map((item, index) => (
            <div
              key={index}
              className="space-y-3 rounded-xl border border-beige-dark p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <Select
                  label={cu.aboutIcon}
                  value={item.icon}
                  options={ABOUT_ICON_OPTIONS}
                  onChange={(e) =>
                    updateValue(index, "icon", e.target.value as AboutValueIcon)
                  }
                />
                <button
                  type="button"
                  onClick={() => removeValue(index)}
                  className="mt-7 rounded-lg p-2 text-red-500 hover:bg-red-50"
                  aria-label={cu.aboutDeleteValue}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Input
                label={cu.aboutValueTitle}
                value={item.title_ar}
                onChange={(e) => updateValue(index, "title_ar", e.target.value)}
              />
              <Textarea
                label={cu.aboutValueDescription}
                rows={2}
                value={item.description_ar}
                onChange={(e) =>
                  updateValue(index, "description_ar", e.target.value)
                }
              />
            </div>
          ))}
        </div>

        {message && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        )}
        {error && form.about_page_title_ar.trim() && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <Button loading={saving} onClick={save}>
          {saving ? cu.saving : cu.saveContent}
        </Button>
      </div>

      <CmsLivePreview title={cu.aboutPreviewTitle}>
        <div className="space-y-4">
          <div>
            <p className="text-lg font-bold text-charcoal">
              {form.about_page_title_ar || "—"}
            </p>
            <p className="text-sm text-muted">{form.about_page_subtitle_ar}</p>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
            <Image
              src={previewImage}
              alt=""
              fill
              className="object-cover"
              sizes="380px"
            />
          </div>
          <p className="font-[family-name:var(--font-cormorant)] text-xs tracking-[0.2em] text-gold uppercase">
            {form.about_story_eyebrow_ar}
          </p>
          <p className="text-base font-bold text-charcoal">
            {form.about_story_heading_ar}
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
            {form.about_ar}
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
            {form.about_secondary_ar}
          </p>
          <span className="inline-block rounded-full bg-gold px-3 py-1.5 text-xs text-white">
            {form.about_cta_label_ar || "—"}
          </span>
          <div className="grid grid-cols-2 gap-2 pt-2">
            {form.about_values.map((value, index) => {
              const Icon = resolveAboutIcon(value.icon);
              return (
                <div
                  key={index}
                  className="rounded-xl border border-beige-dark bg-white p-3 text-center"
                >
                  <Icon className="mx-auto h-5 w-5 text-gold" />
                  <p className="mt-2 text-xs font-semibold text-charcoal">
                    {value.title_ar || "—"}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[10px] text-muted">
                    {value.description_ar}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CmsLivePreview>
    </div>
  );
}
