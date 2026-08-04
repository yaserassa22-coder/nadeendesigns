import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCustomerApi } from "@/lib/customer-auth/customer";
import { phoneDigits } from "@/lib/phone";
import { isMissingTableError } from "@/lib/supabase/errors";

/** Orders matched by customer_id or phone/email identity. */
export async function GET() {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const c = auth.customer;
  const selectCols =
    "id, name, phone, email, status, total, payment_status, created_at, items, shipping_city, tracking_number, customer_id";

  const map = new Map<string, Record<string, unknown>>();

  const { data: byId, error: byIdErr } = await supabase
    .from("shop_orders")
    .select(selectCols)
    .eq("customer_id", c.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (byIdErr && !isMissingTableError(byIdErr, "shop_orders")) {
    // customer_id column may be missing pre-migration — fall through
  }

  for (const row of byId ?? []) {
    map.set(String(row.id), row as Record<string, unknown>);
  }

  if (c.phone) {
    const digits = phoneDigits(c.phone);
    const { data } = await supabase
      .from("shop_orders")
      .select(selectCols)
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
      .from("shop_orders")
      .select(selectCols)
      .ilike("email", c.email)
      .order("created_at", { ascending: false })
      .limit(50);
    for (const row of data ?? []) {
      map.set(String(row.id), row as Record<string, unknown>);
    }
  }

  const orders = Array.from(map.values()).sort(
    (a, b) =>
      new Date(String(b.created_at)).getTime() -
      new Date(String(a.created_at)).getTime()
  );

  return NextResponse.json({ orders });
}
