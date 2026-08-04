"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { CustomerAuthSettings } from "@/types/customer-auth";
import { DEFAULT_CUSTOMER_AUTH_SETTINGS } from "@/types/customer-auth";

export function CustomerAuthSettingsForm() {
  const [settings, setSettings] = useState<CustomerAuthSettings>(
    DEFAULT_CUSTOMER_AUTH_SETTINGS
  );
  const [flags, setFlags] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch("/api/admin/customer-auth/settings")
        .then((r) => r.json())
        .then((d) => {
          if (d.settings) setSettings(d.settings);
          if (d.flags) setFlags(d.flags);
        })
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/customer-auth/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحفظ");
      setSettings(data.settings);
      setFlags(data.flags ?? {});
      setMessage("تم حفظ إعدادات مصادقة العملاء");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "فشل");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-32 animate-pulse rounded-2xl bg-beige" />;
  }

  const toggles: { key: keyof CustomerAuthSettings; label: string }[] = [
    { key: "otp_enabled", label: "تفعيل واتساب OTP" },
    { key: "google_enabled", label: "تفعيل Google" },
    { key: "apple_enabled", label: "تفعيل Apple" },
    { key: "email_password_enabled", label: "تفعيل البريد وكلمة المرور" },
    { key: "facebook_enabled", label: "Facebook (مستقبلاً)" },
    { key: "guest_checkout_enabled", label: "السماح بالشراء كزائرة" },
  ];

  return (
    <div className="space-y-6 rounded-2xl border border-beige-dark bg-white p-6">
      <div>
        <h2 className="text-xl font-bold text-charcoal">مصادقة العملاء</h2>
        <p className="mt-1 text-sm text-muted">
          Phase E — تحكّمي بطرق الدخول دون تعطيل الضيف. الأزرار تظهر دائماً؛
          OAuth يحتاج إعداد Supabase + متغيرات البيئة.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {toggles.map((t) => (
          <label
            key={t.key}
            className="flex items-center gap-3 rounded-xl border border-beige-dark/60 px-4 py-3 text-sm"
          >
            <input
              type="checkbox"
              className="accent-gold"
              checked={Boolean(settings[t.key])}
              disabled={t.key === "facebook_enabled"}
              onChange={(e) =>
                setSettings((s) => ({ ...s, [t.key]: e.target.checked }))
              }
            />
            {t.label}
          </label>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className="text-muted">انتهاء OTP (ثانية)</span>
          <input
            type="number"
            min={60}
            max={900}
            className="mt-1 w-full rounded-xl border border-beige-dark px-3 py-2"
            value={settings.otp_expiration_seconds}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                otp_expiration_seconds: Number(e.target.value),
              }))
            }
          />
        </label>
        <label className="text-sm">
          <span className="text-muted">أقصى محاولات</span>
          <input
            type="number"
            min={3}
            max={10}
            className="mt-1 w-full rounded-xl border border-beige-dark px-3 py-2"
            value={settings.otp_max_attempts}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                otp_max_attempts: Number(e.target.value),
              }))
            }
          />
        </label>
        <label className="text-sm">
          <span className="text-muted">إعادة إرسال (ثانية)</span>
          <input
            type="number"
            min={30}
            max={300}
            className="mt-1 w-full rounded-xl border border-beige-dark px-3 py-2"
            value={settings.otp_resend_seconds}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                otp_resend_seconds: Number(e.target.value),
              }))
            }
          />
        </label>
      </div>

      <div className="rounded-xl bg-beige/50 px-4 py-3 text-xs text-muted">
        <p>حالة البيئة:</p>
        <ul className="mt-1 list-inside list-disc">
          <li>Supabase: {flags.supabaseConfigured ? "✓" : "✗"}</li>
          <li>
            Google flag: {flags.googleConfigured ? "✓" : "✗"} (NEXT_PUBLIC_GOOGLE_AUTH_ENABLED)
          </li>
          <li>
            Apple flag: {flags.appleConfigured ? "✓" : "✗"} (NEXT_PUBLIC_APPLE_AUTH_ENABLED)
          </li>
          <li>واتساب OTP: {flags.whatsappConfigured || flags.smsConfigured ? "✓" : "✗"}</li>
          <li>مزوّد واتساب: {String(flags.whatsappProvider || "auto")}</li>
          <li>Resend: {flags.emailConfigured ? "✓" : "✗"}</li>
        </ul>
      </div>

      {message && <p className="text-sm text-muted">{message}</p>}
      <Button loading={saving} onClick={() => void save()}>
        حفظ إعدادات المصادقة
      </Button>
    </div>
  );
}
