"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import {
  DEFAULT_WHATSAPP_BY_STATUS,
  SHOP_ORDER_STATUSES,
  SHOP_ORDER_STATUS_LABELS,
  type NotificationSettings,
  type ShopOrderStatus,
} from "@/types/shop";

interface NotificationsSettingsFormProps {
  initialSettings: NotificationSettings;
}

const TEMPLATE_STATUSES: ShopOrderStatus[] = [
  "pending",
  "under_review",
  "confirmed",
  "awaiting_payment",
  "payment_received",
  "in_production",
  "ready_for_pickup",
  "shipped",
  "delivered",
  "cancelled",
];

export function NotificationsSettingsForm({
  initialSettings,
}: NotificationsSettingsFormProps) {
  const [settings, setSettings] = useState<NotificationSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const setWhatsApp = (status: ShopOrderStatus, value: string) => {
    setSettings((prev) => ({
      ...prev,
      whatsapp_templates: { ...prev.whatsapp_templates, [status]: value },
    }));
  };

  const setEmailSubject = (status: ShopOrderStatus, value: string) => {
    setSettings((prev) => ({
      ...prev,
      email_subjects: { ...prev.email_subjects, [status]: value },
    }));
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل الحفظ");
      if (data.settings) setSettings(data.settings);
      setMessage(data.warning || "تم حفظ إعدادات الإشعارات");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-beige-dark bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-charcoal">بيانات المرسل</h2>
        <p className="mt-1 text-sm text-muted">
          تظهر في رسائل الإيميل والواتساب
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Input
            label="اسم المرسل"
            value={settings.sender_name}
            onChange={(e) =>
              setSettings((p) => ({ ...p, sender_name: e.target.value }))
            }
          />
          <Input
            label="بريد الرد"
            type="email"
            value={settings.reply_email}
            onChange={(e) =>
              setSettings((p) => ({ ...p, reply_email: e.target.value }))
            }
            dir="ltr"
          />
          <Input
            label="هاتف العمل / واتساب"
            value={settings.business_phone}
            onChange={(e) =>
              setSettings((p) => ({ ...p, business_phone: e.target.value }))
            }
            dir="ltr"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-beige-dark bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-charcoal">طلب الدفعة</h2>
        <div className="mt-4 space-y-4">
          <Textarea
            label="تعليمات الدفع"
            rows={4}
            value={settings.payment_instructions}
            onChange={(e) =>
              setSettings((p) => ({
                ...p,
                payment_instructions: e.target.value,
              }))
            }
          />
          <Input
            label="رابط الدفع (اختياري — للمستقبل)"
            value={settings.payment_link}
            onChange={(e) =>
              setSettings((p) => ({ ...p, payment_link: e.target.value }))
            }
            dir="ltr"
            placeholder="https://..."
          />
        </div>
      </section>

      <section className="rounded-2xl border border-beige-dark bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-charcoal">
          قوالب واتساب حسب الحالة
        </h2>
        <p className="mt-1 text-sm text-muted">
          السطر الرئيسي للرسالة — اتركي فارغاً لاستخدام الافتراضي
        </p>
        <div className="mt-4 space-y-4">
          {TEMPLATE_STATUSES.map((status) => (
            <Input
              key={status}
              label={SHOP_ORDER_STATUS_LABELS[status]}
              value={settings.whatsapp_templates[status] ?? ""}
              placeholder={DEFAULT_WHATSAPP_BY_STATUS[status] || ""}
              onChange={(e) => setWhatsApp(status, e.target.value)}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-beige-dark bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-charcoal">
          عناوين إيميل حسب الحالة
        </h2>
        <p className="mt-1 text-sm text-muted">
          اختياري — اتركي فارغاً لاستخدام العنوان التلقائي
        </p>
        <div className="mt-4 space-y-4">
          {SHOP_ORDER_STATUSES.filter((s) =>
            [
              "pending",
              "confirmed",
              "payment_received",
              "in_production",
              "ready_for_pickup",
              "shipped",
              "delivered",
              "cancelled",
            ].includes(s)
          ).map((status) => (
            <Input
              key={status}
              label={SHOP_ORDER_STATUS_LABELS[status]}
              value={settings.email_subjects[status] ?? ""}
              onChange={(e) => setEmailSubject(status, e.target.value)}
            />
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button loading={saving} onClick={save}>
          حفظ إعدادات الإشعارات
        </Button>
        {message && <p className="text-sm text-muted">{message}</p>}
      </div>
    </div>
  );
}
