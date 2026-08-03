import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { computeAppointmentAnalytics } from "@/lib/admin/appointment-analytics";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { isMissingColumnError, isMissingTableError } from "@/lib/supabase/errors";
import type { BookingForAnalytics } from "@/lib/admin/appointment-analytics";

export async function GET(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      analytics: computeAppointmentAnalytics([]),
    });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const supabase = await createPrivilegedClient();

  let query = supabase.from("bookings").select("*");
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, error } = await query;
  let bookings: BookingForAnalytics[] = [];

  if (error) {
    if (isMissingColumnError(error)) {
      const retry = await supabase.from("bookings").select("*");
      bookings = (retry.data ?? []) as BookingForAnalytics[];
    } else {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } else {
    bookings = (data ?? []) as BookingForAnalytics[];
  }

  // Exclude soft-deleted if column present
  bookings = bookings.filter((b) => b.is_deleted !== true);

  let consultants: Array<{ id: string; name_ar: string }> = [];
  const cRes = await supabase
    .from("consultants")
    .select("id, name_ar")
    .order("sort_order");
  if (!cRes.error && cRes.data) {
    consultants = cRes.data as Array<{ id: string; name_ar: string }>;
  } else if (cRes.error && !isMissingTableError(cRes.error, "consultants")) {
    console.warn("[appointments/analytics] consultants", cRes.error.message);
  }

  const analytics = computeAppointmentAnalytics(bookings, consultants);
  return NextResponse.json({ analytics, count: bookings.length });
}
