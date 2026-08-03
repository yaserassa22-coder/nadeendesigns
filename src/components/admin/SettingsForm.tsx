"use client";

import { useState } from "react";
import Link from "next/link";
import type { SiteSettings } from "@/types";
import {
  OFFICIAL_INSTAGRAM_HANDLE,
  OFFICIAL_INSTAGRAM_URL,
} from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface SettingsFormProps {
  initialSettings: SiteSettings;
}

/** Contact + shipping only — Hero/About CMS lives under /admin/content/* */
type ContactShippingPatch = Pick<
  SiteSettings,
  | "phone"
  | "whatsapp"
  | "email"
  | "address_ar"
  | "working_hours_ar"
  | "instagram_url"
  | "instagram_handle"
  | "shipping_enabled"
  | "shipping_flat_fee"
  | "shipping_free_threshold"
  | "boutique_pickup_enabled"
  | "delivery_enabled"
>;

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [settings, setSettings] = useState<ContactShippingPatch>({
    phone: initialSettings.phone,
    whatsapp: initialSettings.whatsapp,
    email: initialSettings.email,
    address_ar: initialSettings.address_ar,
    working_hours_ar: initialSettings.working_hours_ar,
    instagram_url: OFFICIAL_INSTAGRAM_URL,
    instagram_handle: OFFICIAL_INSTAGRAM_HANDLE,
    shipping_enabled: initialSettings.shipping_enabled,
    shipping_flat_fee: initialSettings.shipping_flat_fee,
    shipping_free_threshold: initialSettings.shipping_free_threshold,
    boutique_pickup_enabled: initialSettings.boutique_pickup_enabled,
    delivery_enabled: initialSettings.delivery_enabled,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const update = <K extends keyof ContactShippingPatch>(
    key: K,
    value: ContactShippingPatch[K]
  ) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setMessage("");
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
      if (data.settings) {
        const s = data.settings as SiteSettings;
        setSettings({
          phone: s.phone,
          whatsapp: s.whatsapp,
          email: s.email,
          address_ar: s.address_ar,
          working_hours_ar: s.working_hours_ar,
          instagram_url: OFFICIAL_INSTAGRAM_URL,
          instagram_handle: OFFICIAL_INSTAGRAM_HANDLE,
          shipping_enabled: s.shipping_enabled,
          shipping_flat_fee: s.shipping_flat_fee,
          shipping_free_threshold: s.shipping_free_threshold,
          boutique_pickup_enabled: s.boutique_pickup_enabled,
          delivery_enabled: s.delivery_enabled,
        });
      }
      setMessage("تم الحفظ بنجاح");
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-beige-dark bg-white p-6 md:p-8">
      <div className="rounded-xl border border-gold/25 bg-gold/5 px-4 py-3 text-sm text-charcoal">
        محتوى الصفحة الرئيسية وصفحة من نحن يُدار من{" "}
        <Link href="/admin/content/home" className="font-medium text-gold hover:underline">
          محتوى الرئيسية
        </Link>{" "}
        و{" "}
        <Link href="/admin/content/about" className="font-medium text-gold hover:underline">
          محتوى من نحن
        </Link>
        .
      </div>

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
      </div>

      <div className="border-t border-beige-dark pt-6">
        <h3 className="text-lg font-semibold text-charcoal">
          شحن اكسسوارات العروس
        </h3>
        <p className="mt-1 text-sm text-muted">
          ينطبق على طرحة العروس وبرنص العروس وأي منتجات مستقبلية تحت اكسسوارات
          العروس فقط — وليس على الفساتين. يمكن تخصيص الرسوم حسب المنطقة من صفحة
          إعدادات الشحن. عنوان التوصيل يبقى مطلوباً عند اختيار التوصيل حتى عند
          تعطيل الرسوم أو الشحن المجاني.
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
          <label className="flex items-center gap-3 rounded-xl border border-beige-dark px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={settings.boutique_pickup_enabled}
              onChange={(e) =>
                update("boutique_pickup_enabled", e.target.checked)
              }
              className="h-4 w-4 accent-gold"
            />
            تفعيل الاستلام من البوتيك
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-beige-dark px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={settings.delivery_enabled}
              onChange={(e) => update("delivery_enabled", e.target.checked)}
              className="h-4 w-4 accent-gold"
            />
            تفعيل التوصيل
          </label>
          <Input
            label="رسوم الشحن الثابتة (₪)"
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
            label="حد الشحن المجاني (₪) — 0 لإيقافه"
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
              <span dir="ltr">
                {formatPrice(settings.shipping_free_threshold ?? 0)}
              </span>{" "}
              أو أكثر.
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
        {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
      </Button>
    </div>
  );
}
