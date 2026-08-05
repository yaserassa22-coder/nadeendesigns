"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { formatPrice } from "@/lib/utils";
import {
  DEFAULT_STORE_SETTINGS,
  type StorePaymentProvider,
  type StoreSettings,
  type StoreSettingsSection,
  type SystemHealthReport,
  type SystemHealthStatus,
} from "@/types/store";
import { GlobalServicesManager } from "@/components/admin/GlobalServicesManager";

const SECTIONS: { id: StoreSettingsSection | "health"; label: string }[] = [
  { id: "general", label: "عام" },
  { id: "payments", label: "المدفوعات" },
  { id: "shipping", label: "الشحن" },
  { id: "contact", label: "التواصل" },
  { id: "social", label: "التواصل الاجتماعي" },
  { id: "homepage", label: "الرئيسية" },
  { id: "authentication", label: "المصادقة" },
  { id: "notifications", label: "الإشعارات" },
  { id: "order_options", label: "خيارات الطلب" },
  { id: "extra_services", label: "خدمات إضافية" },
  { id: "seo", label: "SEO" },
  { id: "security", label: "الأمان" },
  { id: "integrations", label: "التكاملات" },
  { id: "health", label: "صحة النظام" },
];

const HEALTH_COLOR: Record<SystemHealthStatus, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
};

const HEALTH_BG: Record<SystemHealthStatus, string> = {
  green: "border-emerald-200 bg-emerald-50",
  yellow: "border-amber-200 bg-amber-50",
  red: "border-red-200 bg-red-50",
};

function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border border-beige-dark/60 px-4 py-3 text-sm ${
        disabled ? "opacity-60" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-gold"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="font-medium text-charcoal">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

export function StoreSettingsPanel({
  initialSettings,
}: {
  initialSettings?: StoreSettings;
}) {
  const [active, setActive] = useState<StoreSettingsSection | "health">(
    "general"
  );
  const [settings, setSettings] = useState<StoreSettings>(
    initialSettings ?? DEFAULT_STORE_SETTINGS
  );
  const [loading, setLoading] = useState(!initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [health, setHealth] = useState<SystemHealthReport | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch("/api/admin/store-settings")
        .then((r) => r.json())
        .then((d) => {
          if (d.settings) setSettings(d.settings);
        })
        .catch(() => {
          /* keep defaults */
        })
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loadHealth = useCallback(() => {
    setHealthLoading(true);
    fetch("/api/admin/system-health")
      .then((r) => r.json())
      .then((d) => {
        if (d.checks) setHealth(d as SystemHealthReport);
      })
      .finally(() => setHealthLoading(false));
  }, []);

  useEffect(() => {
    if (active !== "health") return;
    const timer = window.setTimeout(() => loadHealth(), 0);
    return () => window.clearTimeout(timer);
  }, [active, loadHealth]);

  const saveSection = async (section: StoreSettingsSection) => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const patch: Partial<StoreSettings> = (() => {
        switch (section) {
          case "general":
            return { general: settings.general };
          case "payments":
            return { payments: settings.payments };
          case "shipping":
            return { shipping: settings.shipping };
          case "contact":
            return { contact: settings.contact };
          case "social":
            return { social: settings.social };
          case "homepage":
            return { homepage: settings.homepage };
          case "authentication":
            return { authentication: settings.authentication };
          case "notifications":
            return { notifications: settings.notifications };
          case "seo":
            return { seo: settings.seo };
          case "security":
            return { security: settings.security };
          case "integrations":
            return { integrations: settings.integrations };
          default:
            return {};
        }
      })();

      const res = await fetch("/api/admin/store-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: patch, sections: [section] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل الحفظ");
      if (data.settings) setSettings(data.settings);
      setMessage("تم الحفظ بنجاح — التغييرات تظهر فوراً في المتجر");
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const updateProvider = (
    id: string,
    patch: Partial<StorePaymentProvider>
  ) => {
    setSettings((s) => ({
      ...s,
      payments: {
        providers: s.payments.providers.map((p) =>
          p.id === id ? { ...p, ...patch } : p
        ),
      },
    }));
    setMessage("");
  };

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-beige" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-beige-dark bg-white p-3">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setActive(s.id);
              setMessage("");
              setError("");
            }}
            className={`rounded-xl px-3 py-2 text-sm transition-colors ${
              active === s.id
                ? "bg-gold/15 font-semibold text-charcoal"
                : "text-muted hover:bg-beige hover:text-charcoal"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {message ? (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-beige-dark bg-white p-6 md:p-8">
        {active === "general" && (
          <Section
            title="الإعدادات العامة"
            description="اسم المتجر، الشعار، والعملة — تظهر فوراً في الهيدر والفوتر."
            onSave={() => saveSection("general")}
            saving={saving}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="اسم المتجر *"
                value={settings.general.store_name}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    general: { ...s.general, store_name: e.target.value },
                  }))
                }
              />
              <Input
                label="العملة"
                value={settings.general.currency}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    general: { ...s.general, currency: e.target.value },
                  }))
                }
                dir="ltr"
              />
              <Input
                label="اللغة"
                value={settings.general.language}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    general: { ...s.general, language: e.target.value },
                  }))
                }
                dir="ltr"
              />
              <Input
                label="المنطقة الزمنية"
                value={settings.general.timezone}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    general: { ...s.general, timezone: e.target.value },
                  }))
                }
                dir="ltr"
              />
              <Input
                label="البريد التجاري"
                value={settings.general.business_email}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    general: { ...s.general, business_email: e.target.value },
                  }))
                }
                dir="ltr"
              />
              <Input
                label="هاتف العمل"
                value={settings.general.business_phone}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    general: { ...s.general, business_phone: e.target.value },
                  }))
                }
                dir="ltr"
              />
            </div>
            <Textarea
              label="وصف المتجر (عربي)"
              value={settings.general.description_ar}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  general: { ...s.general, description_ar: e.target.value },
                }))
              }
              rows={2}
            />
            <Input
              label="العنوان (عربي)"
              value={settings.general.business_address_ar}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  general: {
                    ...s.general,
                    business_address_ar: e.target.value,
                  },
                }))
              }
            />
            <Input
              label="ساعات العمل (عربي)"
              value={settings.general.working_hours_ar}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  general: { ...s.general, working_hours_ar: e.target.value },
                }))
              }
            />
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-charcoal">الشعار</p>
                <ImageUpload
                  value={
                    settings.general.logo_url
                      ? [settings.general.logo_url]
                      : []
                  }
                  multiple={false}
                  onChange={(urls) =>
                    setSettings((s) => ({
                      ...s,
                      general: { ...s.general, logo_url: urls[0] ?? "" },
                    }))
                  }
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-charcoal">
                  أيقونة المتصفح (Favicon)
                </p>
                <ImageUpload
                  value={
                    settings.general.favicon_url
                      ? [settings.general.favicon_url]
                      : []
                  }
                  multiple={false}
                  onChange={(urls) =>
                    setSettings((s) => ({
                      ...s,
                      general: { ...s.general, favicon_url: urls[0] ?? "" },
                    }))
                  }
                />
              </div>
            </div>
          </Section>
        )}

        {active === "payments" && (
          <Section
            title="طرق الدفع"
            description="للإطلاق: الدفع عند الاستلام فقط. الباقي Coming Soon — بدون تكامل حي."
            onSave={() => saveSection("payments")}
            saving={saving}
          >
            <div className="space-y-3">
              {settings.payments.providers.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-beige-dark/70 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-charcoal">{p.name_ar}</p>
                      <p className="text-xs text-muted" dir="ltr">
                        {p.name} · {p.id}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {p.description_ar}
                      </p>
                      {p.secret_env_ref ? (
                        <p className="mt-1 text-xs text-muted" dir="ltr">
                          secret env: {p.secret_env_ref}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-2">
                      {p.coming_soon ? (
                        <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">
                          قريباً
                        </span>
                      ) : null}
                      <Toggle
                        label="مفعّل"
                        checked={p.enabled}
                        disabled={p.coming_soon && p.id !== "cod"}
                        onChange={(v) => {
                          if (p.coming_soon && p.id !== "cod") return;
                          updateProvider(p.id, { enabled: v });
                        }}
                      />
                      {p.id !== "cod" ? (
                        <Toggle
                          label="Configured (env)"
                          checked={p.configured}
                          onChange={(v) =>
                            updateProvider(p.id, { configured: v })
                          }
                          hint="لا تخزّني أسراراً هنا — علّمي فقط أن الـ env جاهز"
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {active === "shipping" && (
          <Section
            title="الشحن"
            description="يُزامن مع إعدادات الموقع الحالية دون كسر مناطق الشحن أو CMS."
            onSave={() => saveSection("shipping")}
            saving={saving}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                label="تفعيل الشحن"
                checked={settings.shipping.shipping_enabled}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    shipping: { ...s.shipping, shipping_enabled: v },
                  }))
                }
              />
              <Toggle
                label="الاستلام من البوتيك"
                checked={settings.shipping.boutique_pickup_enabled}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    shipping: { ...s.shipping, boutique_pickup_enabled: v },
                  }))
                }
              />
              <Toggle
                label="التوصيل"
                checked={settings.shipping.delivery_enabled}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    shipping: { ...s.shipping, delivery_enabled: v },
                  }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={`رسوم الشحن الثابتة (${formatPrice(settings.shipping.shipping_flat_fee)})`}
                type="number"
                min={0}
                dir="ltr"
                value={settings.shipping.shipping_flat_fee}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    shipping: {
                      ...s.shipping,
                      shipping_flat_fee: Math.max(0, Number(e.target.value) || 0),
                    },
                  }))
                }
              />
              <Input
                label="حد الشحن المجاني (0 = بدون)"
                type="number"
                min={0}
                dir="ltr"
                value={settings.shipping.shipping_free_threshold}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    shipping: {
                      ...s.shipping,
                      shipping_free_threshold: Math.max(
                        0,
                        Number(e.target.value) || 0
                      ),
                    },
                  }))
                }
              />
            </div>
            <Input
              label="تقدير التوصيل الافتراضي (عربي)"
              value={settings.shipping.estimated_delivery_ar}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  shipping: {
                    ...s.shipping,
                    estimated_delivery_ar: e.target.value,
                  },
                }))
              }
              placeholder="مثال: 3–5 أيام عمل"
            />
            <p className="text-sm text-muted">
              مناطق الشحن التفصيلية تُدار من{" "}
              <Link href="/admin/shipping" className="text-gold underline">
                إعدادات الشحن
              </Link>
              .
            </p>
          </Section>
        )}

        {active === "contact" && (
          <Section
            title="التواصل"
            description="الهاتف والواتساب والبريد تظهر فوراً في الفوتر وزر واتساب."
            onSave={() => saveSection("contact")}
            saving={saving}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="الهاتف"
                value={settings.contact.phone}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    contact: { ...s.contact, phone: e.target.value },
                  }))
                }
                dir="ltr"
              />
              <Input
                label="واتساب (بدون +، مثال: 9725...)"
                value={settings.contact.whatsapp}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    contact: { ...s.contact, whatsapp: e.target.value },
                  }))
                }
                dir="ltr"
              />
              <Input
                label="البريد"
                value={settings.contact.email}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    contact: { ...s.contact, email: e.target.value },
                  }))
                }
                dir="ltr"
              />
              <Input
                label="إنستغرام"
                value={settings.contact.instagram_url}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    contact: { ...s.contact, instagram_url: e.target.value },
                  }))
                }
                dir="ltr"
              />
              <Input
                label="فيسبوك"
                value={settings.contact.facebook_url}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    contact: { ...s.contact, facebook_url: e.target.value },
                  }))
                }
                dir="ltr"
              />
              <Input
                label="تيك توك"
                value={settings.contact.tiktok_url}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    contact: { ...s.contact, tiktok_url: e.target.value },
                  }))
                }
                dir="ltr"
              />
            </div>
            <Input
              label="الموقع / العنوان"
              value={settings.contact.location_ar}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  contact: { ...s.contact, location_ar: e.target.value },
                }))
              }
            />
            <Input
              label="رابط Google Maps"
              value={settings.contact.google_maps_url}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  contact: { ...s.contact, google_maps_url: e.target.value },
                }))
              }
              dir="ltr"
            />
          </Section>
        )}

        {active === "social" && (
          <Section
            title="وسائل التواصل"
            description="روابط الشبكات الاجتماعية للمتجر."
            onSave={() => saveSection("social")}
            saving={saving}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["instagram_url", "إنستغرام"],
                  ["facebook_url", "فيسبوك"],
                  ["tiktok_url", "تيك توك"],
                  ["pinterest_url", "بينتريست"],
                  ["youtube_url", "يوتيوب"],
                ] as const
              ).map(([key, label]) => (
                <Input
                  key={key}
                  label={label}
                  value={settings.social[key]}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      social: { ...s.social, [key]: e.target.value },
                    }))
                  }
                  dir="ltr"
                />
              ))}
            </div>
          </Section>
        )}

        {active === "homepage" && (
          <Section
            title="أقسام الصفحة الرئيسية"
            description="تفعيل/إخفاء الأقسام دون تعديل الكود. محتوى الهيرو من قائمة المحتوى."
            onSave={() => saveSection("homepage")}
            saving={saving}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["hero", "الهيرو"],
                  ["featured_categories", "التصنيفات المميزة"],
                  ["featured_products", "المنتجات المميزة"],
                  ["collections", "قسم التصميم الخاص"],
                  ["instagram", "إنستغرام"],
                ] as const
              ).map(([key, label]) => (
                <Toggle
                  key={key}
                  label={label}
                  checked={settings.homepage[key]}
                  onChange={(v) =>
                    setSettings((s) => ({
                      ...s,
                      homepage: { ...s.homepage, [key]: v },
                    }))
                  }
                />
              ))}
            </div>
            <p className="text-sm text-muted">
              تحرير نصوص/صور الهيرو:{" "}
              <Link href="/admin/content/home" className="text-gold underline">
                محتوى الرئيسية
              </Link>
            </p>
          </Section>
        )}

        {active === "authentication" && (
          <Section
            title="مصادقة العملاء"
            description="يُزامن مع إعدادات customer_auth الحالية."
            onSave={() => saveSection("authentication")}
            saving={saving}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["guest_checkout_enabled", "الشراء كزائرة"],
                  ["google_enabled", "Google"],
                  ["apple_enabled", "Apple"],
                  ["email_password_enabled", "البريد وكلمة المرور"],
                  ["phone_otp_enabled", "واتساب OTP"],
                  ["registration_enabled", "التسجيل"],
                ] as const
              ).map(([key, label]) => (
                <Toggle
                  key={key}
                  label={label}
                  checked={settings.authentication[key]}
                  onChange={(v) =>
                    setSettings((s) => ({
                      ...s,
                      authentication: { ...s.authentication, [key]: v },
                    }))
                  }
                />
              ))}
            </div>
          </Section>
        )}

        {active === "notifications" && (
          <Section
            title="قنوات الإشعارات"
            description="SMS مستقبلاً. قوالب الطلبات من صفحة الإشعارات."
            onSave={() => saveSection("notifications")}
            saving={saving}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                label="البريد"
                checked={settings.notifications.email_enabled}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: { ...s.notifications, email_enabled: v },
                  }))
                }
              />
              <Toggle
                label="واتساب"
                checked={settings.notifications.whatsapp_enabled}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: { ...s.notifications, whatsapp_enabled: v },
                  }))
                }
              />
              <Toggle
                label="SMS"
                checked={settings.notifications.sms_enabled}
                disabled={settings.notifications.sms_coming_soon}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: { ...s.notifications, sms_enabled: v },
                  }))
                }
                hint="قريباً"
              />
            </div>
            <p className="text-sm text-muted">
              قوالب رسائل الطلبات:{" "}
              <Link
                href="/admin/notifications"
                className="text-gold underline"
              >
                الإشعارات
              </Link>
            </p>
          </Section>
        )}

        {active === "order_options" && (
          <Section
            title="خيارات الطلب"
            description="خيارات تُجمع من العميلة عند إتمام الطلب (تاريخ التوصيل، ملاحظات، …)."
            onSave={() => saveSection("order_options")}
            saving={saving}
          >
            <div className="space-y-3">
              {settings.order_options.options.map((opt, idx) => (
                <div
                  key={opt.key}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-beige-dark/70 p-4"
                >
                  <div>
                    <p className="font-semibold text-charcoal">{opt.label_ar}</p>
                    <p className="text-xs text-muted" dir="ltr">
                      {opt.key}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Toggle
                      label="مفعّل"
                      checked={opt.enabled}
                      onChange={(v) =>
                        setSettings((s) => {
                          const options = [...s.order_options.options];
                          options[idx] = { ...options[idx], enabled: v };
                          return {
                            ...s,
                            order_options: { options },
                          };
                        })
                      }
                    />
                    <Toggle
                      label="إلزامي"
                      checked={opt.required}
                      disabled={!opt.enabled}
                      onChange={(v) =>
                        setSettings((s) => {
                          const options = [...s.order_options.options];
                          options[idx] = { ...options[idx], required: v };
                          return {
                            ...s,
                            order_options: { options },
                          };
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {active === "extra_services" && (
          <Section
            title="مكتبة الخدمات (Global Services)"
            description="إنشاء الخدمات مرة واحدة: تسعير FREE/FIXED، إلزامي، محدد افتراضياً، ونطاق ظهور بالمعرّفات. تُزامَن مع جدول store_services."
            onSave={() => saveSection("extra_services")}
            saving={saving}
          >
            <GlobalServicesManager
              services={settings.extra_services.services}
              onChange={(services) =>
                setSettings((s) => ({
                  ...s,
                  extra_services: { services },
                }))
              }
            />
          </Section>
        )}

        {active === "seo" && (
          <Section
            title="SEO والتحليلات"
            description="العنوان والوصف وOG والـ robots تُطبَّق على المتجر. معرّفات التحليلات تُحفظ للمرحلة التالية (لا تُحقَن تلقائياً بعد)."
            onSave={() => saveSection("seo")}
            saving={saving}
          >
            <Input
              label="عنوان الصفحة الافتراضي"
              value={settings.seo.title}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  seo: { ...s.seo, title: e.target.value },
                }))
              }
            />
            <Textarea
              label="الوصف"
              value={settings.seo.description}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  seo: { ...s.seo, description: e.target.value },
                }))
              }
              rows={3}
            />
            <Input
              label="الكلمات المفتاحية"
              value={settings.seo.keywords}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  seo: { ...s.seo, keywords: e.target.value },
                }))
              }
            />
            <div>
              <p className="mb-2 text-sm font-medium text-charcoal">
                صورة Open Graph
              </p>
              <ImageUpload
                value={
                  settings.seo.og_image_url ? [settings.seo.og_image_url] : []
                }
                multiple={false}
                onChange={(urls) =>
                  setSettings((s) => ({
                    ...s,
                    seo: { ...s.seo, og_image_url: urls[0] ?? "" },
                  }))
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                label="robots: index"
                checked={settings.seo.robots_index}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    seo: { ...s.seo, robots_index: v },
                  }))
                }
              />
              <Toggle
                label="robots: follow"
                checked={settings.seo.robots_follow}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    seo: { ...s.seo, robots_follow: v },
                  }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Google Analytics ID"
                value={settings.seo.google_analytics_id}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    seo: { ...s.seo, google_analytics_id: e.target.value },
                  }))
                }
                dir="ltr"
                placeholder="G-XXXXXXXX"
              />
              <Input
                label="Meta Pixel ID"
                value={settings.seo.meta_pixel_id}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    seo: { ...s.seo, meta_pixel_id: e.target.value },
                  }))
                }
                dir="ltr"
              />
            </div>
          </Section>
        )}

        {active === "security" && (
          <Section
            title="الأمان"
            description="وضع الصيانة وحالة النسخ الاحتياطي (عرض)."
            onSave={() => saveSection("security")}
            saving={saving}
          >
            <Input
              label="مهلة الجلسة (دقائق)"
              type="number"
              min={5}
              max={1440}
              dir="ltr"
              value={settings.security.session_timeout_minutes}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  security: {
                    ...s.security,
                    session_timeout_minutes: Math.max(
                      5,
                      Number(e.target.value) || 60
                    ),
                  },
                }))
              }
            />
            <Toggle
              label="وضع الصيانة (قريباً)"
              checked={settings.security.maintenance_mode}
              onChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  security: { ...s.security, maintenance_mode: v },
                }))
              }
              hint="محفوظ في الإعدادات — صفحة الصيانة للمتجر غير مفعّلة بعد"
            />
            <div className="rounded-xl border border-beige-dark/60 bg-beige/30 px-4 py-3 text-sm">
              <p className="font-medium text-charcoal">حالة النسخ الاحتياطي</p>
              <p className="mt-1 text-muted">
                {settings.security.backup_status} —{" "}
                {settings.security.backup_note}
              </p>
              {settings.security.backup_last_at ? (
                <p className="mt-1 text-xs text-muted" dir="ltr">
                  Last: {settings.security.backup_last_at}
                </p>
              ) : null}
            </div>
          </Section>
        )}

        {active === "integrations" && (
          <Section
            title="التكاملات"
            description="حالة التكاملات فقط. الأسرار عبر متغيرات البيئة — ليست في قاعدة البيانات."
            onSave={() => saveSection("integrations")}
            saving={saving}
          >
            <div className="space-y-3">
              {settings.integrations.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-beige-dark/70 p-4"
                >
                  <div>
                    <p className="font-semibold text-charcoal">{item.name}</p>
                    <p className="mt-1 text-xs text-muted" dir="ltr">
                      {item.env_refs.join(", ") || "—"}
                    </p>
                    <p className="mt-1 text-sm text-muted">{item.notes}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {item.coming_soon ? (
                      <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">
                        قريباً
                      </span>
                    ) : null}
                    <Toggle
                      label="Configured"
                      checked={item.configured}
                      onChange={(v) =>
                        setSettings((s) => {
                          const next = [...s.integrations];
                          next[idx] = { ...next[idx], configured: v };
                          return { ...s, integrations: next };
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {active === "health" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-charcoal">
                  صحة النظام
                </h2>
                <p className="text-sm text-muted">
                  فحص مباشر لقاعدة البيانات والتخزين والبريد والمدفوعات
                  والمصادقة والبيئة.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                loading={healthLoading}
                onClick={loadHealth}
              >
                تحديث الفحص
              </Button>
            </div>
            {health ? (
              <>
                <div
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${HEALTH_BG[health.overall]}`}
                >
                  <span
                    className={`h-3 w-3 rounded-full ${HEALTH_COLOR[health.overall]}`}
                  />
                  <span className="text-sm font-medium text-charcoal">
                    الحالة العامة: {health.overall}
                  </span>
                  <span className="text-xs text-muted" dir="ltr">
                    {health.checked_at}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {health.checks.map((c) => (
                    <div
                      key={c.id}
                      className={`rounded-xl border px-4 py-3 ${HEALTH_BG[c.status]}`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${HEALTH_COLOR[c.status]}`}
                        />
                        <p className="font-medium text-charcoal">
                          {c.label_ar}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-muted">{c.detail_ar}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-32 animate-pulse rounded-xl bg-beige" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
  onSave,
  saving,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-charcoal">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
      <div className="border-t border-beige-dark pt-4">
        <Button type="button" loading={saving} onClick={onSave}>
          حفظ هذا القسم
        </Button>
      </div>
    </div>
  );
}
