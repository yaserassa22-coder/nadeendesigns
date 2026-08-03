/**
 * Appointment KPIs for dashboard / reports / analytics page.
 */

import type { Booking } from "@/types";
import type { NamedCount } from "@/lib/admin/dashboard-analytics";

export type AppointmentAnalytics = {
  todayCount: number;
  tomorrowCount: number;
  completed: number;
  cancelled: number;
  noShows: number;
  avgDaily: number;
  busyHours: NamedCount[];
  busyDays: NamedCount[];
  consultantPerformance: Array<{
    consultantId: string | null;
    name: string;
    total: number;
    completed: number;
    cancelled: number;
    noShows: number;
  }>;
  bySource: NamedCount[];
  cancelRate: number;
  noShowRate: number;
};

const DAY_LABELS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(dateStr: string): Date | null {
  const d = new Date(`${dateStr}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type BookingForAnalytics = Booking & {
  consultant_id?: string | null;
  booking_source?: string | null;
  no_show_at?: string | null;
  consultant_name?: string | null;
};

export function computeAppointmentAnalytics(
  bookings: BookingForAnalytics[],
  consultants: Array<{ id: string; name_ar: string }> = [],
  now = new Date()
): AppointmentAnalytics {
  const today = dayKey(now);
  const tom = new Date(now);
  tom.setDate(tom.getDate() + 1);
  const tomorrow = dayKey(tom);

  const nameById = new Map(consultants.map((c) => [c.id, c.name_ar]));
  let todayCount = 0;
  let tomorrowCount = 0;
  let completed = 0;
  let cancelled = 0;
  let noShows = 0;

  const hourMap = new Map<string, number>();
  const dayMap = new Map<number, number>();
  const sourceMap = new Map<string, number>();
  const consultantMap = new Map<
    string,
    {
      consultantId: string | null;
      name: string;
      total: number;
      completed: number;
      cancelled: number;
      noShows: number;
    }
  >();

  const dateSet = new Set<string>();

  for (const b of bookings) {
    if (b.date === today) todayCount += 1;
    if (b.date === tomorrow) tomorrowCount += 1;
    dateSet.add(b.date);

    if (b.no_show_at) noShows += 1;
    else if (b.status === "completed") completed += 1;
    else if (b.status === "cancelled") cancelled += 1;

    const hour = (b.time || "00:00").slice(0, 2) + ":00";
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);

    const d = parseLocalDate(b.date);
    if (d) {
      const dow = d.getDay();
      dayMap.set(dow, (dayMap.get(dow) ?? 0) + 1);
    }

    const src = b.booking_source || "online";
    sourceMap.set(src, (sourceMap.get(src) ?? 0) + 1);

    const cid = b.consultant_id ?? null;
    const key = cid ?? "__none__";
    const existing = consultantMap.get(key) ?? {
      consultantId: cid,
      name:
        b.consultant_name ||
        (cid ? nameById.get(cid) ?? "مستشارة" : "غير معيّنة"),
      total: 0,
      completed: 0,
      cancelled: 0,
      noShows: 0,
    };
    existing.total += 1;
    if (b.no_show_at) existing.noShows += 1;
    else if (b.status === "completed") existing.completed += 1;
    else if (b.status === "cancelled") existing.cancelled += 1;
    consultantMap.set(key, existing);
  }

  const total = bookings.length || 1;
  const busyHours = [...hourMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const busyDays = [...dayMap.entries()]
    .map(([dow, count]) => ({ name: DAY_LABELS[dow] ?? String(dow), count }))
    .sort((a, b) => b.count - a.count);

  const bySource = [...sourceMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const daysSpan = Math.max(1, dateSet.size);

  return {
    todayCount,
    tomorrowCount,
    completed,
    cancelled,
    noShows,
    avgDaily: Math.round((bookings.length / daysSpan) * 10) / 10,
    busyHours,
    busyDays,
    consultantPerformance: [...consultantMap.values()].sort(
      (a, b) => b.total - a.total
    ),
    bySource,
    cancelRate: Math.round((cancelled / total) * 1000) / 10,
    noShowRate: Math.round((noShows / total) * 1000) / 10,
  };
}
