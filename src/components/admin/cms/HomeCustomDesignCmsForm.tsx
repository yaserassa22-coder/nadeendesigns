"use client";

import { useState } from "react";
import type { SiteSettings } from "@/types";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/admin/ImageUpload";

const MAX_CUSTOM_DESIGN_IMAGES = 5;

type CustomDesignCmsFields = {
  custom_design_image_urls: string[];
};

function urlsFromSettings(settings: SiteSettings): string[] {
  const list = Array.isArray(settings.custom_design_image_urls)
    ? settings.custom_design_image_urls
    : [];
  const cleaned = list.map((u) => u.trim()).filter(Boolean);
  if (cleaned.length) return cleaned.slice(0, MAX_CUSTOM_DESIGN_IMAGES);
  const single = settings.custom_design_image_url?.trim() || "";
  return single ? [single] : [];
}

interface HomeCustomDesignCmsFormProps {
  initialSettings: SiteSettings;
}

/**
 * Admin control for homepage Custom Design section images (up to 5).
 */
export function HomeCustomDesignCmsForm({
  initialSettings,
}: HomeCustomDesignCmsFormProps) {
  const { t } = useLocale();
  const cu = t.admin.cmsUi;
  const [form, setForm] = useState<CustomDesignCmsFields>({
    custom_design_image_urls: urlsFromSettings(initialSettings),
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const urls = form.custom_design_image_urls
        .map((u) => u.trim())
        .filter(Boolean)
        .slice(0, MAX_CUSTOM_DESIGN_IMAGES);
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          custom_design_image_urls: urls,
          custom_design_image_url: urls[0] ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? cu.saveFailed);
      if (data.settings) {
        const s = data.settings as SiteSettings;
        setForm({ custom_design_image_urls: urlsFromSettings(s) });
      }
      setMessage(cu.saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : cu.genericError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-beige-dark bg-white p-6 md:p-8">
      <div>
        <h2 className="text-lg font-semibold text-charcoal">
          {cu.customDesignTileTitle}
        </h2>
        <p className="mt-1 text-sm text-muted">{cu.customDesignTileDesc}</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-charcoal">
          {cu.customDesignTileImage}
        </p>
        <ImageUpload
          multiple
          maxImages={MAX_CUSTOM_DESIGN_IMAGES}
          value={form.custom_design_image_urls}
          onChange={(urls) => {
            setForm({
              custom_design_image_urls: urls.slice(0, MAX_CUSTOM_DESIGN_IMAGES),
            });
            setMessage("");
          }}
        />
      </div>

      {message ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <Button loading={saving} onClick={save}>
        {saving ? cu.saving : cu.saveContent}
      </Button>
    </div>
  );
}
