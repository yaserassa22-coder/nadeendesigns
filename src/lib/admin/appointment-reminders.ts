/**
 * Appointment reminder runner — future-cron ready.
 * Offsets: 7d, 3d, 1d, 2h (from appointment start).
 * Respects notify_whatsapp / notify_email on booking rows.
 * Full scheduled cron is NOT deployed — call /api/admin/appointments/send-reminders manually or via cron later.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/notifications/email";
import { sendWhatsApp } from "@/lib/notifications/whatsapp";
import { loadAppointmentSettings } from "@/lib/admin/appointment-slots";
import { normalizeTimeHHMM } from "@/lib/admin/appointment-conflicts";
import { isMissingColumnError } from "@/lib/supabase/errors";

export type ReminderOffset = "7d" | "3d" | "1d" | "2h" | string;

function offsetToMs(offset: string): number | null {
  const m = /^(\d+)(d|h)$/.exec(offset.trim());
  if (!m) return null;
  const n = Number(m[1]);
  if (m[2] === "d") return n * 24 * 60 * 60 * 1000;
  if (m[2] === "h") return n * 60 * 60 * 1000;
  return null;
}

function appointmentStartMs(date: string, time: string): number {
  const t = normalizeTimeHHMM(time);
  return new Date(`${date}T${t}:00`).getTime();
}

type ReminderBooking = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  date: string;
  time: string;
  status: string | null;
  notify_whatsapp?: boolean | null;
  notify_email?: boolean | null;
  is_deleted?: boolean | null;
};

export type ReminderSendResult = {
  bookingId: string;
  offset: string;
  channel: "whatsapp" | "email";
  ok: boolean;
  error?: string;
};

/**
 * Find bookings whose start is within ±tolerance of (now + offset).
 * Default tolerance: 30 minutes for hours, 6 hours for days.
 */
export function bookingsDueForOffset(
  bookings: ReminderBooking[],
  offset: string,
  now = Date.now()
): ReminderBooking[] {
  const ms = offsetToMs(offset);
  if (ms == null) return [];
  const target = now + ms;
  const isHour = offset.endsWith("h");
  const window = isHour ? 30 * 60 * 1000 : 6 * 60 * 60 * 1000;

  return bookings.filter((b) => {
    if (b.is_deleted) return false;
    if (b.status === "cancelled" || b.status === "completed") return false;
    const start = appointmentStartMs(b.date, b.time);
    if (Number.isNaN(start)) return false;
    return Math.abs(start - target) <= window;
  });
}

function reminderBody(name: string, date: string, time: string, offset: string) {
  const when =
    offset === "2h"
      ? "خلال ساعتين"
      : offset === "1d"
        ? "غدًا"
        : offset === "3d"
          ? "بعد ٣ أيام"
          : offset === "7d"
            ? "بعد أسبوع"
            : `قريبًا (${offset})`;
  return `تذكير من NadEEN Designs: موعدكِ ${when} بتاريخ ${date} الساعة ${normalizeTimeHHMM(time)}. نراكِ قريبًا يا ${name} ✨`;
}

export async function sendAppointmentReminders(
  supabase: SupabaseClient,
  options?: { dryRun?: boolean }
): Promise<{
  sent: ReminderSendResult[];
  scanned: number;
  offsets: string[];
  warning?: string;
}> {
  const settings = await loadAppointmentSettings(supabase);
  if (!settings.reminders.enabled) {
    return {
      sent: [],
      scanned: 0,
      offsets: settings.reminders.offsets,
      warning: "التذكيرات معطّلة في إعدادات المواعيد",
    };
  }

  const offsets = settings.reminders.offsets.length
    ? settings.reminders.offsets
    : ["7d", "3d", "1d", "2h"];

  // Look ahead up to 8 days
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 8);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  const primary = await supabase
    .from("bookings")
    .select(
      "id, name, phone, email, date, time, status, notify_whatsapp, notify_email, is_deleted"
    )
    .gte("date", fromStr)
    .lte("date", toStr);

  let bookings: ReminderBooking[] = [];
  let loadError = primary.error;

  if (
    primary.error &&
    (isMissingColumnError(primary.error) ||
      /notify_|is_deleted/i.test(primary.error.message))
  ) {
    const retry = await supabase
      .from("bookings")
      .select("id, name, phone, email, date, time, status")
      .gte("date", fromStr)
      .lte("date", toStr);
    loadError = retry.error;
    bookings = (retry.data ?? []) as ReminderBooking[];
  } else if (!primary.error) {
    bookings = (primary.data ?? []) as ReminderBooking[];
  }

  if (loadError && bookings.length === 0) {
    return {
      sent: [],
      scanned: 0,
      offsets,
      warning: loadError.message,
    };
  }
  const results: ReminderSendResult[] = [];

  for (const offset of offsets) {
    const due = bookingsDueForOffset(bookings, offset);
    for (const b of due) {
      const body = reminderBody(b.name, b.date, normalizeTimeHHMM(b.time), offset);
      const wantWa = b.notify_whatsapp !== false && Boolean(b.phone?.trim());
      const wantEmail = b.notify_email !== false && Boolean(b.email?.trim());

      if (options?.dryRun) {
        if (wantWa) {
          results.push({
            bookingId: b.id,
            offset,
            channel: "whatsapp",
            ok: true,
          });
        }
        if (wantEmail) {
          results.push({
            bookingId: b.id,
            offset,
            channel: "email",
            ok: true,
          });
        }
        continue;
      }

      if (wantWa) {
        const wa = await sendWhatsApp({ to: b.phone, body });
        results.push({
          bookingId: b.id,
          offset,
          channel: "whatsapp",
          ok: wa.ok,
          error: wa.ok ? undefined : wa.error,
        });
      }

      if (wantEmail) {
        const em = await sendEmail({
          to: b.email!,
          subject: "تذكير بموعدكِ — NadEEN Designs",
          html: `<p dir="rtl">${body}</p>`,
        });
        results.push({
          bookingId: b.id,
          offset,
          channel: "email",
          ok: em.ok,
          error: em.ok ? undefined : em.error,
        });
      }
    }
  }

  return { sent: results, scanned: bookings.length, offsets };
}
