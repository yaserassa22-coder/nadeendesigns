"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type OutboxEntry = {
  id: string;
  channel: "email" | "whatsapp";
  to: string;
  subject?: string;
  body: string;
  created_at: string;
};

export function LocalNotificationOutboxPanel() {
  const [enabled, setEnabled] = useState(false);
  const [entries, setEntries] = useState<OutboxEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/notifications/outbox", {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        enabled?: boolean;
        entries?: OutboxEntry[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "فشل التحميل");
      setEnabled(Boolean(data.enabled));
      setEntries(Array.isArray(data.entries) ? data.entries : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل التحميل");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const clear = async () => {
    if (!confirm("مسح كل رسائل الصندوق المحلي؟")) return;
    const res = await fetch("/api/admin/notifications/outbox", {
      method: "DELETE",
    });
    if (res.ok) {
      setEntries([]);
    }
  };

  return (
    <section className="rounded-2xl border border-beige-dark bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">
            صندوق الإشعارات المحلي
          </h2>
          <p className="mt-1 text-sm text-muted">
            عند التطوير أو قبل Resend/Twilio، تأكيدات المواعيد تُحفظ هنا بدل
            الإرسال الخارجي — راجعي المحتوى بعد تأكيد الحجز. الصندوق محفوظ على
            القرص فلا يختفي بعد إعادة تشغيل السيرفر.
          </p>
          <p className="mt-1 text-xs text-muted">
            الوضع:{" "}
            {enabled ? (
              <span className="text-emerald-700">مفعّل (محلي)</span>
            ) : (
              <span className="text-amber-800">معطّل — الإنتاج يستخدم Resend/Twilio فقط</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" loading={loading} onClick={() => void load()}>
            تحديث
          </Button>
          <Button
            variant="outline"
            disabled={!entries.length}
            onClick={() => void clear()}
            className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
          >
            مسح
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted">جاري التحميل…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted">
          لا رسائل بعد — أكّدي موعدًا من الحجوزات وستظهر هنا.
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li
              key={e.id}
              className="rounded-xl border border-beige-dark/80 bg-beige/20 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                <span className="font-medium text-charcoal">
                  {e.channel === "email" ? "بريد" : "واتساب"}
                </span>
                <span dir="ltr">{new Date(e.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-sm" dir="ltr">
                إلى: {e.to}
              </p>
              {e.subject ? (
                <p className="mt-1 text-sm font-medium text-charcoal">
                  {e.subject}
                </p>
              ) : null}
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-white/80 p-3 text-xs text-charcoal">
                {e.body}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
