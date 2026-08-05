import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { isLifecycleSchemaError } from "@/lib/admin/query-lifecycle";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";

/**
 * Unread / pending counters for Admin sidebar badges.
 * - messages: unread contact_messages
 * - bookings: pending bookings
 * - orders: pending shop orders
 */
export async function GET() {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  const supabase = createAdminClient();

  async function countUnreadMessages(): Promise<number> {
    let q = supabase
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false);
    q = q.eq("is_deleted", false) as typeof q;
    const { count, error } = await q;
    if (error && isLifecycleSchemaError(error)) {
      const retry = await supabase
        .from("contact_messages")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false);
      return retry.count ?? 0;
    }
    if (error && isMissingTableError(error, "contact_messages")) return 0;
    return count ?? 0;
  }

  async function countPending(
    table: "bookings" | "shop_orders"
  ): Promise<number> {
    let q = supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    q = q.eq("is_deleted", false) as typeof q;
    const { count, error } = await q;
    if (error && isLifecycleSchemaError(error)) {
      const retry = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      return retry.count ?? 0;
    }
    if (error && isMissingTableError(error, table)) return 0;
    return count ?? 0;
  }

  const [messages, bookings, orders] = await Promise.all([
    countUnreadMessages(),
    countPending("bookings"),
    countPending("shop_orders"),
  ]);

  return NextResponse.json({
    messages,
    bookings,
    orders,
    total: messages + bookings + orders,
  });
}
