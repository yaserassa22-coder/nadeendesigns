import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCustomerApi } from "@/lib/customer-auth/customer";
import { phoneDigits } from "@/lib/phone";

export async function GET() {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const c = auth.customer;
  const map = new Map<string, Record<string, unknown>>();

  const { data: byId } = await supabase
    .from("bookings")
    .select(
      "id, name, phone, email, service_type, status, preferred_date, preferred_time, notes, created_at, customer_id"
    )
    .eq("customer_id", c.id)
    .order("created_at", { ascending: false })
    .limit(50);

  for (const row of byId ?? []) {
    map.set(String(row.id), row as Record<string, unknown>);
  }

  if (c.phone) {
    const digits = phoneDigits(c.phone);
    const { data } = await supabase
      .from("bookings")
      .select(
        "id, name, phone, email, service_type, status, preferred_date, preferred_time, notes, created_at, customer_id"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    for (const row of data ?? []) {
      const rowDigits = phoneDigits(String(row.phone || ""));
      if (
        rowDigits &&
        digits &&
        (rowDigits === digits ||
          rowDigits.endsWith(digits.slice(-9)) ||
          digits.endsWith(rowDigits.slice(-9)))
      ) {
        map.set(String(row.id), row as Record<string, unknown>);
      }
    }
  }

  if (c.email) {
    const { data } = await supabase
      .from("bookings")
      .select(
        "id, name, phone, email, service_type, status, preferred_date, preferred_time, notes, created_at, customer_id"
      )
      .ilike("email", c.email)
      .limit(50);
    for (const row of data ?? []) {
      map.set(String(row.id), row as Record<string, unknown>);
    }
  }

  const appointments = Array.from(map.values()).sort(
    (a, b) =>
      new Date(String(b.created_at)).getTime() -
      new Date(String(a.created_at)).getTime()
  );

  return NextResponse.json({ appointments });
}
