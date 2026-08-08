"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/types";
import { getServiceTypeLabelLocalized } from "@/lib/i18n/service-labels";

type Appt = {
  id: string;
  service_type?: string;
  status?: string;
  date?: string;
  time?: string;
  preferred_date?: string;
  preferred_time?: string;
  created_at?: string;
};

function statusLabel(status?: string) {
  if (!status) return "";
  return BOOKING_STATUS_LABELS[status as BookingStatus] ?? status;
}

export default function AccountAppointmentsPage() {
  const { t, locale } = useLocale();
  const [rows, setRows] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch("/api/account/appointments", { cache: "no-store" })
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
        <p className="font-[family-name:var(--font-amiri)] text-xl">
          {t.account.noAppointments}
        </p>
        <p className="mt-2 text-sm text-muted">{t.account.noAppointmentsHint}</p>
        <Link
          href="/booking"
          className="mt-4 inline-block text-sm"
          style={{ color: "#C9A14A" }}
        >
          {t.account.bookAppointment}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">{t.account.rescheduleHint}</p>
      {rows.map((r) => {
        const date = r.date || r.preferred_date || "—";
        const time = (r.time || r.preferred_time || "").slice(0, 5);
        const title = r.service_type
          ? getServiceTypeLabelLocalized(r.service_type, locale)
          : t.account.appointmentFallback;
        const cancelled = r.status === "cancelled";
        return (
          <div
            key={r.id}
            className={`rounded-2xl border bg-white px-5 py-4 ${
              cancelled ? "border-red-200 opacity-80" : "border-beige-dark"
            }`}
          >
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted">
              {date}
              {time ? ` · ${time}` : ""} ·{" "}
              <span className={cancelled ? "text-red-600" : undefined}>
                {statusLabel(r.status) || t.common.underReview}
              </span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
