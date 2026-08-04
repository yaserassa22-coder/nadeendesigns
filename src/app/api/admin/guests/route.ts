import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";

export async function GET(request: NextRequest) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") || "all"; // all | converted | active
  const q = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 50)));

  const supabase = createAdminClient();
  let query = supabase
    .from("guest_customers")
    .select("*")
    .order("last_seen", { ascending: false })
    .limit(limit);

  if (filter === "converted") {
    query = query.not("converted_to_customer_id", "is", null);
  } else if (filter === "active") {
    query = query.is("converted_to_customer_id", null);
  }
  if (q) {
    query = query.ilike("guest_id", `%${q}%`);
  }

  const { data: guests, error } = await query;
  if (error) {
    if (isMissingTableError(error, "guest_customers")) {
      return NextResponse.json({
        guests: [],
        stub: true,
        message: "طبّقي ترحيل 031 / APPLY_GUEST_CUSTOMERS",
      });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const guestIds = (guests ?? []).map((g) => g.guest_id as string);
  const counts: Record<
    string,
    { orders: number; bookings: number; wishlist: number; cart_items: number }
  > = {};
  for (const id of guestIds) {
    counts[id] = { orders: 0, bookings: 0, wishlist: 0, cart_items: 0 };
  }

  if (guestIds.length) {
    const [orders, bookings, wishlist, carts] = await Promise.all([
      supabase
        .from("shop_orders")
        .select("guest_id")
        .in("guest_id", guestIds),
      supabase
        .from("bookings")
        .select("guest_id")
        .in("guest_id", guestIds),
      supabase
        .from("wishlist_items")
        .select("guest_id")
        .in("guest_id", guestIds),
      supabase
        .from("guest_carts")
        .select("guest_id, items")
        .in("guest_id", guestIds),
    ]);

    for (const row of orders.data ?? []) {
      const id = row.guest_id as string;
      if (counts[id]) counts[id].orders += 1;
    }
    for (const row of bookings.data ?? []) {
      const id = row.guest_id as string;
      if (counts[id]) counts[id].bookings += 1;
    }
    for (const row of wishlist.data ?? []) {
      const id = row.guest_id as string;
      if (counts[id]) counts[id].wishlist += 1;
    }
    for (const row of carts.data ?? []) {
      const id = row.guest_id as string;
      if (counts[id]) {
        counts[id].cart_items = Array.isArray(row.items)
          ? row.items.length
          : 0;
      }
    }
  }

  // KPIs
  const { count: totalGuests } = await supabase
    .from("guest_customers")
    .select("*", { count: "exact", head: true });
  const { count: converted } = await supabase
    .from("guest_customers")
    .select("*", { count: "exact", head: true })
    .not("converted_to_customer_id", "is", null);
  const { count: registered } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .eq("is_guest", false);
  const { count: abandonedCarts } = await supabase
    .from("guest_carts")
    .select("*", { count: "exact", head: true })
    .not("items", "eq", "[]");

  // Returning = last_seen > created_at + 1 day
  const { data: allForReturn } = await supabase
    .from("guest_customers")
    .select("created_at, last_seen")
    .limit(5000);
  let returning = 0;
  for (const g of allForReturn ?? []) {
    const created = new Date(g.created_at as string).getTime();
    const seen = new Date(g.last_seen as string).getTime();
    if (seen - created > 24 * 60 * 60 * 1000) returning += 1;
  }

  const total = totalGuests ?? 0;
  const conv = converted ?? 0;

  // Most wishlisted / viewed
  const { data: wishAgg } = await supabase
    .from("wishlist_items")
    .select("product_title, product_id, product_kind")
    .not("guest_id", "is", null)
    .limit(2000);
  const wishMap = new Map<string, { title: string; count: number }>();
  for (const w of wishAgg ?? []) {
    const key = `${w.product_kind}:${w.product_id}`;
    const prev = wishMap.get(key) || {
      title: (w.product_title as string) || key,
      count: 0,
    };
    prev.count += 1;
    wishMap.set(key, prev);
  }
  const mostWishlisted = [...wishMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const { data: viewAgg } = await supabase
    .from("recently_viewed")
    .select("product_title, product_id, product_kind")
    .limit(2000);
  const viewMap = new Map<string, { title: string; count: number }>();
  for (const w of viewAgg ?? []) {
    const key = `${w.product_kind}:${w.product_id}`;
    const prev = viewMap.get(key) || {
      title: (w.product_title as string) || key,
      count: 0,
    };
    prev.count += 1;
    viewMap.set(key, prev);
  }
  const mostViewed = [...viewMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return NextResponse.json({
    guests: (guests ?? []).map((g) => ({
      ...g,
      counts: counts[g.guest_id as string] || {
        orders: 0,
        bookings: 0,
        wishlist: 0,
        cart_items: 0,
      },
    })),
    kpis: {
      total_guests: total,
      returning_guests: returning,
      registered_customers: registered ?? 0,
      conversion_rate:
        total > 0 ? Math.round((conv / total) * 1000) / 10 : 0,
      converted_guests: conv,
      abandoned_guest_carts: abandonedCarts ?? 0,
      most_wishlisted: mostWishlisted,
      most_viewed: mostViewed,
    },
  });
}
