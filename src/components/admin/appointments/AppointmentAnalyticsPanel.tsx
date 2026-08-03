"use client";

import { useEffect, useState } from "react";
import type { AppointmentAnalytics } from "@/lib/admin/appointment-analytics";
import { BOOKING_SOURCE_LABELS, type BookingSource } from "@/types";

export function AppointmentAnalyticsPanel() {
  const [analytics, setAnalytics] = useState<AppointmentAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch("/api/admin/appointments/analytics", { cache: "no-store" })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || "فشل التحميل");
          setAnalytics(d.analytics);
        })
        .catch((e) =>
          setError(e instanceof Error ? e.message : "خطأ")
        );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>
    );
  }
  if (!analytics) {
    return <p className="text-muted">جاري التحميل...</p>;
  }

  const kpis = [
    { label: "اليوم", value: analytics.todayCount },
    { label: "غدًا", value: analytics.tomorrowCount },
    { label: "مكتملة", value: analytics.completed },
    { label: "ملغاة", value: analytics.cancelled },
    { label: "لم تحضر", value: analytics.noShows },
    { label: "متوسط يومي", value: analytics.avgDaily },
    { label: "نسبة الإلغاء %", value: analytics.cancelRate },
    { label: "نسبة عدم الحضور %", value: analytics.noShowRate },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-beige-dark bg-white px-4 py-4"
          >
            <p className="text-sm text-muted">{k.label}</p>
            <p className="mt-1 text-2xl font-bold text-charcoal">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-beige-dark bg-white p-5">
          <h2 className="font-semibold text-charcoal">الساعات الأكثر ازدحامًا</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {analytics.busyHours.length === 0 ? (
              <li className="text-muted">لا بيانات</li>
            ) : (
              analytics.busyHours.map((h) => (
                <li
                  key={h.name}
                  className="flex justify-between border-b border-beige-dark/50 py-1"
                >
                  <span dir="ltr">{h.name}</span>
                  <span>{h.count}</span>
                </li>
              ))
            )}
          </ul>
        </section>
        <section className="rounded-2xl border border-beige-dark bg-white p-5">
          <h2 className="font-semibold text-charcoal">الأيام الأكثر ازدحامًا</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {analytics.busyDays.length === 0 ? (
              <li className="text-muted">لا بيانات</li>
            ) : (
              analytics.busyDays.map((h) => (
                <li
                  key={h.name}
                  className="flex justify-between border-b border-beige-dark/50 py-1"
                >
                  <span>{h.name}</span>
                  <span>{h.count}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-beige-dark bg-white p-5">
        <h2 className="font-semibold text-charcoal">أداء المستشارات</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-muted">
              <tr>
                <th className="px-2 py-2 text-right">المستشارة</th>
                <th className="px-2 py-2 text-right">الإجمالي</th>
                <th className="px-2 py-2 text-right">مكتمل</th>
                <th className="px-2 py-2 text-right">ملغي</th>
                <th className="px-2 py-2 text-right">لم تحضر</th>
              </tr>
            </thead>
            <tbody>
              {analytics.consultantPerformance.map((c) => (
                <tr key={c.consultantId ?? c.name} className="border-t border-beige-dark">
                  <td className="px-2 py-2">{c.name}</td>
                  <td className="px-2 py-2">{c.total}</td>
                  <td className="px-2 py-2">{c.completed}</td>
                  <td className="px-2 py-2">{c.cancelled}</td>
                  <td className="px-2 py-2">{c.noShows}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-beige-dark bg-white p-5">
        <h2 className="font-semibold text-charcoal">حسب المصدر</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {analytics.bySource.map((s) => (
            <li
              key={s.name}
              className="flex justify-between border-b border-beige-dark/50 py-1"
            >
              <span>
                {BOOKING_SOURCE_LABELS[s.name as BookingSource] || s.name}
              </span>
              <span>{s.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
