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

      <div className="border-t border-beige-dark pt-6">
        <h3 className="text-lg font-semibold text-charcoal">
          شحن اكسسوارات العروس
        </h3>
        <p className="mt-1 text-sm text-muted">
          ينطبق على طرحة العروس وبرنص العروس وأي منتجات مستقبلية تحت اكسسوارات
          العروس فقط — وليس على الفساتين. عنوان التوصيل يبقى مطلوباً للطلبات
          التي تحتاج توصيلاً حتى عند تعطيل الرسوم أو الشحن المجاني.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-xl border border-beige-dark px-4 py-3 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={settings.shipping_enabled}
              onChange={(e) => update("shipping_enabled", e.target.checked)}
              className="h-4 w-4 accent-gold"
            />
            تفعيل رسوم الشحن عالمياً
          </label>
          <Input
            label="رسوم الشحن الثابتة (ريال)"
            type="number"
            min={0}
            step="1"
            value={String(settings.shipping_flat_fee ?? 0)}
            onChange={(e) =>
              update(
                "shipping_flat_fee",
                Math.max(0, Number(e.target.value) || 0)
              )
            }
            dir="ltr"
          />
          <Input
            label="حد الشحن المجاني (ريال) — 0 لإيقافه"
            type="number"
            min={0}
            step="1"
            value={String(settings.shipping_free_threshold ?? 0)}
            onChange={(e) =>
              update(
                "shipping_free_threshold",
                Math.max(0, Number(e.target.value) || 0)
              )
            }
            dir="ltr"
          />
        </div>
        {settings.shipping_enabled &&
          (settings.shipping_flat_fee ?? 0) > 0 &&
          (settings.shipping_free_threshold ?? 0) > 0 && (
            <p className="mt-3 text-xs text-muted">
              الشحن مجاني عندما يصل مجموع المنتجات إلى{" "}
              <span dir="ltr">{settings.shipping_free_threshold}</span> ريال أو
              أكثر.
            </p>
          )}
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
