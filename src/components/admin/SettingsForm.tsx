"use client";

import { useState } from "react";
import type { SiteSettings } from "@/types";
import {
  OFFICIAL_INSTAGRAM_HANDLE,
  OFFICIAL_INSTAGRAM_URL,
} from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";

interface SettingsFormProps {
  initialSettings: SiteSettings;
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const update = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          instagram_url: OFFICIAL_INSTAGRAM_URL,
          instagram_handle: OFFICIAL_INSTAGRAM_HANDLE,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل الحفظ");
      setMessage("تم حفظ الإعدادات بنجاح");
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-beige-dark bg-white p-6 md:p-8">
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="الهاتف"
          value={settings.phone}
          onChange={(e) => update("phone", e.target.value)}
          dir="ltr"
        />
        <Input
          label="واتساب (بدون +)"
          value={settings.whatsapp}
          onChange={(e) => update("whatsapp", e.target.value)}
          dir="ltr"
        />
        <Input
          label="البريد الإلكتروني"
          type="email"
          value={settings.email}
          onChange={(e) => update("email", e.target.value)}
          dir="ltr"
        />
        <Input
          label="ساعات العمل"
          value={settings.working_hours_ar}
          onChange={(e) => update("working_hours_ar", e.target.value)}
        />
        <Input
          label="رابط إنستغرام (الرسمي)"
          value={OFFICIAL_INSTAGRAM_URL}
          onChange={() => update("instagram_url", OFFICIAL_INSTAGRAM_URL)}
          dir="ltr"
          readOnly
        />
        <Input
          label="حساب إنستغرام (الرسمي)"
          value={OFFICIAL_INSTAGRAM_HANDLE}
          onChange={() => update("instagram_handle", OFFICIAL_INSTAGRAM_HANDLE)}
          dir="ltr"
          readOnly
        />
        <div className="md:col-span-2">
          <Input
            label="العنوان"
            value={settings.address_ar}
            onChange={(e) => update("address_ar", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <Input
            label="عنوان الصفحة الرئيسية"
            value={settings.hero_title_ar}
            onChange={(e) => update("hero_title_ar", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <Textarea
            label="وصف الصفحة الرئيسية"
            rows={3}
            value={settings.hero_subtitle_ar}
            onChange={(e) => update("hero_subtitle_ar", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <Textarea
            label="نبذة عنا"
            rows={5}
            value={settings.about_ar}
            onChange={(e) => update("about_ar", e.target.value)}
          />
        </div>
      </div>

      {message && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <Button loading={saving} onClick={save}>
        حفظ الإعدادات
      </Button>
    </div>
  );
}
