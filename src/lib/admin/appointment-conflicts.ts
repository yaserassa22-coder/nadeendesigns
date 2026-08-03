/**
 * Appointment conflict detection — same consultant only.
 * Occupied window includes buffer_before / buffer_after.
 * Cancelled / soft-deleted / no-show do NOT block.
 *
 * Race mitigation: call assertNoConflict then insert in the same request.
 * Optional Postgres EXCLUDE on tstzrange is deferred (legacy nullable consultant_id).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingColumnError, isMissingTableError } from "@/lib/supabase/errors";
import { timeToMinutes } from "@/lib/admin/appointment-settings";

export const CONFLICT_MESSAGE_AR =
  "هذا الموعد محجوز مسبقًا، يرجى اختيار موعد آخر.";

export type BookingWindowInput = {
  date: string;
  time: string;
  duration_minutes?: number | null;
  buffer_before?: number | null;
  buffer_after?: number | null;
  consultant_id?: string | null;
  exclude_id?: string | null;
};

export type ExistingBookingRow = {
  id: string;
  date: string;
  time: string;
  duration_minutes?: number | null;
  buffer_before?: number | null;
  buffer_after?: number | null;
  consultant_id?: string | null;
  status?: string | null;
  is_deleted?: boolean | null;
  no_show_at?: string | null;
};

export function normalizeTimeHHMM(time: string): string {
  const t = time.trim();
  if (t.length >= 5) return t.slice(0, 5);
  return t;
}

export function bookingOccupiesMinutes(row: {
  time: string;
  duration_minutes?: number | null;
  buffer_before?: number | null;
  buffer_after?: number | null;
}): { start: number; end: number } {
  const startMin = timeToMinutes(normalizeTimeHHMM(row.time));
  const duration = Math.max(1, Number(row.duration_minutes) || 60);
  const before = Math.max(0, Number(row.buffer_before) || 0);
  const after = Math.max(0, Number(row.buffer_after) || 0);
  return {
    start: startMin - before,
    end: startMin + duration + after,
  };
}

export function windowsOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number }
): boolean {
  return a.start < b.end && b.start < a.end;
}

export function isBlockingBooking(row: ExistingBookingRow): boolean {
  if (row.is_deleted === true) return false;
  if (row.status === "cancelled") return false;
  if (row.no_show_at) return false;
  return true;
}

/** Pure overlap check against an in-memory list (same consultant). */
export function findConflict(
  candidate: BookingWindowInput,
  existing: ExistingBookingRow[]
): ExistingBookingRow | null {
  const consultantId = candidate.consultant_id ?? null;
  const cand = bookingOccupiesMinutes({
    time: candidate.time,
    duration_minutes: candidate.duration_minutes,
    buffer_before: candidate.buffer_before,
    buffer_after: candidate.buffer_after,
  });

  for (const row of existing) {
    if (candidate.exclude_id && row.id === candidate.exclude_id) continue;
    if (!isBlockingBooking(row)) continue;
    const rowConsultant = row.consultant_id ?? null;
    // Only conflict when both have the same non-null consultant,
    // OR both null (legacy / unassigned share one pool).
    if (consultantId !== rowConsultant) continue;
    if (row.date !== candidate.date) continue;
    const occ = bookingOccupiesMinutes(row);
    if (windowsOverlap(cand, occ)) return row;
  }
  return null;
}

export type ConflictCheckResult =
  | { ok: true }
  | { ok: false; conflict: true; message: string; conflictingId?: string }
  | { ok: false; conflict: false; message: string; status: number };

/**
 * Load same-day bookings for consultant and check overlap.
 * When consultant_id is null, checks other null-consultant bookings on that date.
 */
export async function assertNoConflict(
  supabase: SupabaseClient,
  candidate: BookingWindowInput,
  options?: { force?: boolean; isOwner?: boolean }
): Promise<ConflictCheckResult> {
  if (options?.force) {
    if (!options.isOwner) {
      return {
        ok: false,
        conflict: false,
        status: 403,
        message: "تجاوز التعارض متاح للمالك فقط",
      };
    }
    return { ok: true };
  }

  if (!candidate.date || !candidate.time) {
    return {
      ok: false,
      conflict: false,
      status: 400,
      message: "التاريخ والوقت مطلوبان",
    };
  }

  let query = supabase
    .from("bookings")
    .select(
      "id, date, time, duration_minutes, buffer_before, buffer_after, consultant_id, status, is_deleted, no_show_at"
    )
    .eq("date", candidate.date);

  if (candidate.consultant_id) {
    query = query.eq("consultant_id", candidate.consultant_id);
  } else {
    query = query.is("consultant_id", null);
  }

  const { data, error } = await query;

  if (error) {
    // Columns missing → skip conflict (pre-migration); do not block booking flow
    if (
      isMissingColumnError(error) ||
      isMissingTableError(error, "bookings") ||
      /duration_minutes|consultant_id|buffer_|no_show/i.test(error.message)
    ) {
      console.warn(
        "[appointment-conflicts] columns missing — skipping check. Run APPLY_SMART_APPOINTMENTS.sql"
      );
      return { ok: true };
    }
    return {
      ok: false,
      conflict: false,
      status: 400,
      message: error.message,
    };
  }

  const conflict = findConflict(
    candidate,
    (data ?? []) as ExistingBookingRow[]
  );
  if (conflict) {
    return {
      ok: false,
      conflict: true,
      message: CONFLICT_MESSAGE_AR,
      conflictingId: conflict.id,
    };
  }
  return { ok: true };
}
