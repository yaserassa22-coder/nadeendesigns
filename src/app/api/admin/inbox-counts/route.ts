import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import {
  isLifecycleSchemaError,
  isMissingTableError,
} from "@/lib/supabase/errors";
import { createPrivilegedClient } from "@/lib/supabase/privileged";

/**
 * Unread / pending counters for Admin sidebar badges.
 * - messages: unread contact_messages
 * - bookings: pending bookings
 * - orders: pending shop orders
 *
 * Uses privileged client (service role or admin session) — never bare anon,
 * which cannot SELECT contact_messages and silently returns 0.
 */
export async function GET() {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  const supabase = await createPrivilegedClient();

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
      if (retry.error) {
        console.error("[inbox-counts] messages retry", retry.error);
        return 0;
      }
      return retry.count ?? 0;
    }
    if (error && isMissingTableError(error, "contact_messages")) return 0;
    if (error) {
      console.error("[inbox-counts] messages", error);
      return 0;
    }
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
      if (retry.error) {
        console.error(`[inbox-counts] ${table} retry`, retry.error);
        return 0;
      }
      return retry.count ?? 0;
    }
    if (error && isMissingTableError(error, table)) return 0;
    if (error) {
      console.error(`[inbox-counts] ${table}`, error);
      return 0;
    }
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
