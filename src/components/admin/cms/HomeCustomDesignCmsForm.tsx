"use client";

import { useState } from "react";
import type { SiteSettings } from "@/types";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/admin/ImageUpload";

type CustomDesignCmsFields = Pick<SiteSettings, "custom_design_image_url">;

interface HomeCustomDesignCmsFormProps {
  initialSettings: SiteSettings;
}

/**
 * Admin control for the homepage “تصميم فستان خاص” editorial tile image.
 */
export function HomeCustomDesignCmsForm({
  initialSettings,
}: HomeCustomDesignCmsFormProps) {
  const { t } = useLocale();
  const cu = t.admin.cmsUi;
  const [form, setForm] = useState<CustomDesignCmsFields>({
    custom_design_image_url: initialSettings.custom_design_image_url?.trim() || "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          custom_design_image_url: form.custom_design_image_url.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? cu.saveFailed);
      if (data.settings) {
        const s = data.settings as SiteSettings;
        setForm({
          custom_design_image_url: s.custom_design_image_url?.trim() || "",
        });
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
          multiple={false}
          value={
            form.custom_design_image_url ? [form.custom_design_image_url] : []
          }
          onChange={(urls) => {
            setForm({ custom_design_image_url: urls[0] ?? "" });
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
