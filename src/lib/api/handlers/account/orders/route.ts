import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCustomerApi } from "@/lib/customer-auth/customer";
import { phoneDigits } from "@/lib/phone";
import {
  isMissingColumnError,
  isMissingTableError,
} from "@/lib/supabase/errors";

const SELECT_CANDIDATES = [
  "id, name, phone, email, status, total, created_at, items, shipping_city, tracking_number, customer_id, invoice_number, invoice_type, invoice_issued_at",
  "id, name, phone, email, status, total, created_at, items, shipping_city, tracking_number, customer_id",
  "id, name, phone, email, status, total, created_at, items",
] as const;

type OrderRow = {
  id: string;
  phone?: string | null;
  email?: string | null;
  created_at?: string;
  [key: string]: unknown;
};

async function queryOrders(
  run: (
    cols: string
  ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>
): Promise<OrderRow[]> {
  for (const cols of SELECT_CANDIDATES) {
    const { data, error } = await run(cols);
    if (!error) {
      return Array.isArray(data) ? (data as OrderRow[]) : [];
    }
    if (isMissingTableError(error, "shop_orders")) return [];
    if (!isMissingColumnError(error)) {
      console.error("[account/orders]", error);
      return [];
    }
  }
  return [];
}

/** Orders matched by customer_id or phone/email identity. */
export async function GET() {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const c = auth.customer;
  const map = new Map<string, OrderRow>();

  const byId = await queryOrders(async (cols) =>
    supabase
      .from("shop_orders")
      .select(cols)
      .eq("customer_id", c.id)
      .order("created_at", { ascending: false })
      .limit(50)
  );

  for (const row of byId) {
    map.set(String(row.id), row);
  }

  if (c.phone) {
    const digits = phoneDigits(c.phone);
    const listed = await queryOrders(async (cols) =>
      supabase
        .from("shop_orders")
        .select(cols)
        .order("created_at", { ascending: false })
        .limit(100)
    );
    for (const row of listed) {
      const rowDigits = phoneDigits(String(row.phone || ""));
      if (
        rowDigits &&
        digits &&
        (rowDigits === digits ||
          rowDigits.endsWith(digits.slice(-9)) ||
          digits.endsWith(rowDigits.slice(-9)))
      ) {
        map.set(String(row.id), row);
      }
    }
  }

  if (c.email) {
    const email = c.email;
    const byEmail = await queryOrders(async (cols) =>
      supabase
        .from("shop_orders")
        .select(cols)
        .ilike("email", email)
        .order("created_at", { ascending: false })
        .limit(50)
    );
    for (const row of byEmail) {
      map.set(String(row.id), row);
    }
  }

  const orders = Array.from(map.values()).sort(
    (a, b) =>
      new Date(String(b.created_at)).getTime() -
      new Date(String(a.created_at)).getTime()
  );

  return NextResponse.json({ orders });
}
