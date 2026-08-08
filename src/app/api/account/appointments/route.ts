import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCustomerApi } from "@/lib/customer-auth/customer";
import { phoneDigits } from "@/lib/phone";
import { isMissingColumnError } from "@/lib/supabase/errors";

const BOOKING_SELECT =
  "id, name, phone, email, service_type, status, date, time, notes, created_at, customer_id, is_deleted";

function normalizeAppointmentRow(
  row: Record<string, unknown>
): Record<string, unknown> {
  const date = String(row.date ?? row.preferred_date ?? "");
  const time = String(row.time ?? row.preferred_time ?? "").slice(0, 5);
  return {
    ...row,
    date,
    time,
    preferred_date: date || null,
    preferred_time: time || null,
  };
}

function isVisibleToCustomer(row: Record<string, unknown>): boolean {
  // Soft-deleted appointments must not appear in Account
  if (row.is_deleted === true) return false;
  return true;
}

async function selectBookings(
  supabase: ReturnType<typeof createAdminClient>,
  build: (cols: string) => PromiseLike<{
    data: unknown[] | null;
    error: { message?: string } | null;
  }>
) {
  const full = await build(BOOKING_SELECT);
  if (
    full.error &&
    (isMissingColumnError(full.error) ||
      /is_deleted/i.test(full.error.message || ""))
  ) {
    const retry = await build(
      "id, name, phone, email, service_type, status, date, time, notes, created_at, customer_id"
    );
    return retry;
  }
  return full;
}

export async function GET() {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const c = auth.customer;
  const map = new Map<string, Record<string, unknown>>();

  const byId = await selectBookings(supabase, (cols) =>
    supabase
      .from("bookings")
      .select(cols)
      .eq("customer_id", c.id)
      .order("created_at", { ascending: false })
      .limit(50)
  );

  for (const row of byId.data ?? []) {
    const r = row as Record<string, unknown>;
    if (!isVisibleToCustomer(r)) continue;
    map.set(String(r.id), normalizeAppointmentRow(r));
  }

  if (c.phone) {
    const digits = phoneDigits(c.phone);
    const data = await selectBookings(supabase, (cols) =>
      supabase
        .from("bookings")
        .select(cols)
        .order("created_at", { ascending: false })
        .limit(100)
    );
    for (const row of data.data ?? []) {
      const r = row as Record<string, unknown>;
      if (!isVisibleToCustomer(r)) continue;
      const rowDigits = phoneDigits(String(r.phone || ""));
      if (
        rowDigits &&
        digits &&
        (rowDigits === digits ||
          rowDigits.endsWith(digits.slice(-9)) ||
          digits.endsWith(rowDigits.slice(-9)))
      ) {
        map.set(String(r.id), normalizeAppointmentRow(r));
      }
    }
  }

  if (c.email) {
    const data = await selectBookings(supabase, (cols) =>
      supabase.from("bookings").select(cols).ilike("email", c.email!).limit(50)
    );
    for (const row of data.data ?? []) {
      const r = row as Record<string, unknown>;
      if (!isVisibleToCustomer(r)) continue;
      map.set(String(r.id), normalizeAppointmentRow(r));
    }
  }

  const appointments = Array.from(map.values()).sort(
    (a, b) =>
      new Date(String(b.created_at)).getTime() -
      new Date(String(a.created_at)).getTime()
  );

  return NextResponse.json({ appointments });
}
