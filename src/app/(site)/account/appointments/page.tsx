"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Appt = {
  id: string;
  service_type?: string;
  status?: string;
  preferred_date?: string;
  preferred_time?: string;
  created_at?: string;
};

export default function AccountAppointmentsPage() {
  const [rows, setRows] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch("/api/account/appointments")
        .then((r) => r.json())
        .then((d) => setRows(d.appointments ?? []))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-beige" />;

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-beige-dark bg-white/60 px-6 py-12 text-center">
        <p className="font-[family-name:var(--font-amiri)] text-xl">لا مواعيد</p>
        <p className="mt-2 text-sm text-muted">
          احجزي موعداً وسيظهر هنا عند تطابق بياناتك.
        </p>
        <Link
          href="/booking"
          className="mt-4 inline-block text-sm"
          style={{ color: "#C9A14A" }}
        >
          احجزي موعداً
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        لإعادة الجدولة أو الإلغاء — تواصلي مع البوتيك عبر الرسائل أو واتساب.
      </p>
      {rows.map((r) => (
        <div
          key={r.id}
          className="rounded-2xl border border-beige-dark bg-white px-5 py-4"
        >
          <p className="font-medium">{r.service_type || "موعد"}</p>
          <p className="text-sm text-muted">
            {r.preferred_date || "—"} {r.preferred_time || ""} ·{" "}
            {r.status || "قيد المراجعة"}
          </p>
        </div>
      ))}
    </div>
  );
}
