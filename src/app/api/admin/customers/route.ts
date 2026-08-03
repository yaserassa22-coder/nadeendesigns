import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { selectShopOrdersList } from "@/lib/shop/order-query";
import {
  getErrorMessage,
  isMissingTableError,
} from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";

function customerKey(phone?: string | null, email?: string | null): string | null {
  const p = phone?.trim();
  if (p) return `p:${p}`;
  const e = email?.trim()?.toLowerCase();
  if (e) return `e:${e}`;
  return null;
}

/**
 * Customer overlay list: merge derived keys from orders with customer_admin_state.
 */
export async function GET() {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ customers: [] });
  }

  const supabase = await createPrivilegedClient();
  const map = new Map<
    string,
    {
      customer_key: string;
      display_name: string;
      phone: string | null;
      email: string | null;
      archived_at: string | null;
      is_deleted: boolean;
    }
  >();

  const { data: orders } = await selectShopOrdersList(supabase);
  for (const order of orders ?? []) {
    const key = customerKey(order.phone, order.email);
    if (!key || map.has(key)) continue;
    map.set(key, {
      customer_key: key,
      display_name: order.name || "",
      phone: order.phone ?? null,
      email: order.email ?? null,
      archived_at: null,
      is_deleted: false,
    });
  }

  const { data: overlay, error } = await supabase
    .from("customer_admin_state")
    .select("*");

  if (error && !isMissingTableError(error, "customer_admin_state")) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 400 }
    );
  }

  for (const row of overlay ?? []) {
    const key = String(row.customer_key);
    const existing = map.get(key);
    map.set(key, {
      customer_key: key,
      display_name: row.display_name || existing?.display_name || "",
      phone: row.phone ?? existing?.phone ?? null,
      email: row.email ?? existing?.email ?? null,
      archived_at: (row.archived_at as string | null) ?? null,
      is_deleted: Boolean(row.is_deleted),
    });
  }

  const customers = Array.from(map.values()).filter((c) => !c.is_deleted);
  customers.sort((a, b) =>
    (a.display_name || a.customer_key).localeCompare(
      b.display_name || b.customer_key,
      "ar"
    )
  );

  return NextResponse.json({ customers, count: customers.length });
}
