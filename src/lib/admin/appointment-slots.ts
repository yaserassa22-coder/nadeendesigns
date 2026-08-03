/**
 * Public / admin available slot generation.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type AppointmentSettings,
  minutesToTime,
  normalizeAppointmentSettings,
  timeToMinutes,
} from "@/lib/admin/appointment-settings";
import {
  bookingOccupiesMinutes,
  isBlockingBooking,
  normalizeTimeHHMM,
  type ExistingBookingRow,
  windowsOverlap,
} from "@/lib/admin/appointment-conflicts";
import { isMissingColumnError, isMissingTableError } from "@/lib/supabase/errors";

export type SlotInfo = {
  time: string;
  available: boolean;
  label?: string;
};

export async function loadAppointmentSettings(
  supabase: SupabaseClient
): Promise<AppointmentSettings> {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "appointments")
    .maybeSingle();
  if (error || !data?.value) {
    return normalizeAppointmentSettings(null);
  }
  return normalizeAppointmentSettings(
    data.value as Partial<AppointmentSettings>
  );
}

export async function loadSpecialDayDates(
  supabase: SupabaseClient,
  date: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("special_days")
    .select("id")
    .eq("day_date", date)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error, "special_days")) return false;
    return false;
  }
  return Boolean(data);
}

function isInBreak(
  startMin: number,
  duration: number,
  breakWin: { enabled: boolean; start: string; end: string }
): boolean {
  if (!breakWin.enabled) return false;
  const bStart = timeToMinutes(breakWin.start);
  const bEnd = timeToMinutes(breakWin.end);
  const end = startMin + duration;
  return startMin < bEnd && bStart < end;
}

export function generateDaySlots(params: {
  date: string;
  settings: AppointmentSettings;
  durationMinutes: number;
  bufferBefore: number;
  bufferAfter: number;
  bookings: ExistingBookingRow[];
  isSpecialDay: boolean;
}): SlotInfo[] {
  const { date, settings, durationMinutes, bufferBefore, bufferAfter, bookings, isSpecialDay } =
    params;

  if (isSpecialDay) {
    return [];
  }

  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return [];
  const dow = d.getDay();
  if (!settings.working_days.includes(dow)) {
    return [];
  }

  const open = timeToMinutes(settings.opening_time);
  const close = timeToMinutes(settings.closing_time);
  const interval = settings.slot_interval_minutes;
  const duration = Math.max(1, durationMinutes);
  const slots: SlotInfo[] = [];

  for (let t = open; t + duration <= close; t += interval) {
    const time = minutesToTime(t);
    if (
      isInBreak(t, duration, settings.lunch_break) ||
      isInBreak(t, duration, settings.prayer_break)
    ) {
      slots.push({ time, available: false, label: "غير متاح" });
      continue;
    }

    const cand = bookingOccupiesMinutes({
      time,
      duration_minutes: duration,
      buffer_before: bufferBefore,
      buffer_after: bufferAfter,
    });

    const blocked = bookings.some((row) => {
      if (!isBlockingBooking(row)) return false;
      if (row.date !== date) return false;
      return windowsOverlap(cand, bookingOccupiesMinutes(row));
    });

    slots.push(
      blocked
        ? { time, available: false, label: "غير متاح" }
        : { time, available: true }
    );
  }

  return slots;
}

export async function getAvailableSlots(
  supabase: SupabaseClient,
  opts: {
    date: string;
    consultantId?: string | null;
    durationMinutes?: number;
  }
): Promise<{
  slots: SlotInfo[];
  settings: AppointmentSettings;
  warning?: string;
}> {
  const settings = await loadAppointmentSettings(supabase);
  const duration =
    opts.durationMinutes ?? settings.duration_presets.consultation;
  const bufferBefore = settings.default_buffer_before;
  const bufferAfter = settings.default_buffer_after;
  const consultantId =
    opts.consultantId ?? settings.default_consultant_id ?? null;

  const isSpecial = await loadSpecialDayDates(supabase, opts.date);

  let query = supabase
    .from("bookings")
    .select(
      "id, date, time, duration_minutes, buffer_before, buffer_after, consultant_id, status, is_deleted, no_show_at"
    )
    .eq("date", opts.date);

  if (consultantId) {
    query = query.eq("consultant_id", consultantId);
  } else {
    query = query.is("consultant_id", null);
  }

  const { data, error } = await query;
  let bookings: ExistingBookingRow[] = [];
  let warning: string | undefined;

  if (error) {
    if (
      isMissingColumnError(error) ||
      /consultant_id|duration_minutes/i.test(error.message)
    ) {
      warning =
        "أعمدة المواعيد الذكية غير موجودة بعد. نفّذي APPLY_SMART_APPOINTMENTS.sql";
      // Fallback: load basic bookings for the day
      const retry = await supabase
        .from("bookings")
        .select("id, date, time, status")
        .eq("date", opts.date);
      bookings = ((retry.data ?? []) as ExistingBookingRow[]).map((r) => ({
        ...r,
        time: normalizeTimeHHMM(r.time),
        duration_minutes: duration,
        buffer_before: 0,
        buffer_after: 0,
      }));
    } else {
      warning = error.message;
    }
  } else {
    bookings = (data ?? []) as ExistingBookingRow[];
  }

  const slots = generateDaySlots({
    date: opts.date,
    settings,
    durationMinutes: duration,
    bufferBefore,
    bufferAfter,
    bookings,
    isSpecialDay: isSpecial,
  });

  return { slots, settings, warning };
}
