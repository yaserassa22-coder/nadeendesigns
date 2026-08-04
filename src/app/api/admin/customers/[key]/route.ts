import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isMissingTableError } from "@/lib/supabase/errors";
import { phoneDigits } from "@/lib/phone";
import { selectShopOrdersList } from "@/lib/shop/order-query";

function decodeKey(raw: string): { phone?: string; email?: string; key: string } {
  const key = decodeURIComponent(raw);
  if (key.startsWith("p:")) return { key, phone: key.slice(2) };
  if (key.startsWith("e:")) return { key, email: key.slice(2) };
  return { key };
}

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ key: string }> }
) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase غير مُعد" }, { status: 503 });
  }

  const { key: raw } = await ctx.params;
  const { key, phone, email } = decodeKey(raw);
  const supabase = await createPrivilegedClient();

  // Prefer customers table match
  let customerRow: Record<string, unknown> | null = null;
  {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("customer_key", key)
      .maybeSingle();
    if (!error && data) customerRow = data as Record<string, unknown>;
    else if (phone) {
      const { data: byPhone } = await supabase
        .from("customers")
        .select("*")
        .eq("phone", phone)
        .maybeSingle();
      if (byPhone) customerRow = byPhone as Record<string, unknown>;
    } else if (email) {
      const { data: byEmail } = await supabase
        .from("customers")
        .select("*")
        .ilike("email", email)
        .maybeSingle();
      if (byEmail) customerRow = byEmail as Record<string, unknown>;
    }
  }

  const { data: overlay } = await supabase
    .from("customer_admin_state")
    .select("*")
    .eq("customer_key", key)
    .maybeSingle();

  const { data: allOrders } = await selectShopOrdersList(supabase);
  const orders = (allOrders ?? []).filter((o) => {
    if (customerRow?.id && (o as { customer_id?: string }).customer_id === customerRow.id) {
      return true;
    }
    if (phone) {
      const a = phoneDigits(phone);
      const b = phoneDigits(String(o.phone || ""));
      return a && b && (a === b || a.endsWith(b.slice(-9)) || b.endsWith(a.slice(-9)));
    }
    if (email && o.email) {
      return String(o.email).toLowerCase() === email.toLowerCase();
    }
    return false;
  });

  const totalSpent = orders.reduce(
    (s, o) => s + (Number((o as { total?: number }).total) || 0),
    0
  );
  const aov = orders.length ? totalSpent / orders.length : 0;

  let appointments: unknown[] = [];
  {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    appointments = (data ?? []).filter((b) => {
      if (customerRow?.id && b.customer_id === customerRow.id) return true;
      if (phone) {
        const a = phoneDigits(phone);
        const bDigits = phoneDigits(String(b.phone || ""));
        return (
          a &&
          bDigits &&
          (a === bDigits ||
            a.endsWith(bDigits.slice(-9)) ||
            bDigits.endsWith(a.slice(-9)))
        );
      }
      if (email && b.email) {
        return String(b.email).toLowerCase() === email.toLowerCase();
      }
      return false;
    });
  }

  let wishlist: unknown[] = [];
  let designs: unknown[] = [];
  let messages: unknown[] = [];
  let reviews: unknown[] = [];
  let loginHistory: unknown[] = [];

  if (customerRow?.id) {
    const cid = String(customerRow.id);
    const [w, d, m, r, lh] = await Promise.all([
      supabase.from("wishlist_items").select("*").eq("customer_id", cid),
      supabase.from("saved_designs").select("*").eq("customer_id", cid),
      supabase
        .from("customer_messages")
        .select("*")
        .eq("customer_id", cid)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("customer_reviews").select("*").eq("customer_id", cid),
      supabase
        .from("login_history")
        .select("*")
        .eq("customer_id", cid)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    if (!w.error || !isMissingTableError(w.error, "wishlist_items")) {
      wishlist = w.data ?? [];
    }
    designs = d.data ?? [];
    messages = m.data ?? [];
    reviews = r.data ?? [];
    loginHistory = lh.data ?? [];
  }

  return NextResponse.json({
    customer_key: key,
    overlay,
    customer: customerRow,
    orders,
    appointments,
    wishlist,
    designs,
    messages,
    reviews,
    login_history: loginHistory,
    stats: {
      orders_count: orders.length,
      total_spent: totalSpent,
      aov,
      last_login: customerRow?.last_login_at ?? null,
      login_count: customerRow?.login_count ?? 0,
    },
  });
}
