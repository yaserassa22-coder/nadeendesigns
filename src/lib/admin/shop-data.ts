import { SEED_BRIDAL_ROBES, SEED_VEILS } from "@/lib/data/shop-seed";
import { selectShopOrdersList } from "@/lib/shop/order-query";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import type { BridalRobe, ShopOrder, Veil } from "@/types/shop";
import type { ContactMessage } from "@/types";

export async function getAdminVeils(): Promise<Veil[]> {
  if (!isSupabaseConfigured()) return SEED_VEILS;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("veils")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return SEED_VEILS;
  return data as Veil[];
}

export async function getAdminBridalRobes(): Promise<BridalRobe[]> {
  if (!isSupabaseConfigured()) return SEED_BRIDAL_ROBES;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bridal_robes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return SEED_BRIDAL_ROBES;
  return data as BridalRobe[];
}

export type AdminOrdersResult = {
  orders: ShopOrder[];
  error: string | null;
  count: number;
};

/**
 * Fetch all shop_orders (veils / robes / any accessory checkout).
 * Uses privileged client (service role OR authenticated admin session)
 * so RLS does not silently return [] — same pattern as getAdminBookings.
 * Progressive column fallback: missing M9/M10 columns must never empty the list.
 */
export async function getAdminOrders(): Promise<AdminOrdersResult> {
  if (!isSupabaseConfigured()) {
    return { orders: [], error: null, count: 0 };
  }

  try {
    const supabase = await createPrivilegedClient();
    const { data, error, count } = await selectShopOrdersList(supabase);

    if (error) {
      console.error("[getAdminOrders] supabase error", error);
      return {
        orders: [],
        error: error.message || "فشل جلب الطلبات من Supabase",
        count: 0,
      };
    }

    const orders = data ?? [];
    return {
      orders,
      error: null,
      count: typeof count === "number" ? count : orders.length,
    };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "خطأ غير متوقع أثناء جلب الطلبات";
    console.error("[getAdminOrders] unexpected", e);
    return { orders: [], error: message, count: 0 };
  }
}

export async function getAdminMessages(): Promise<ContactMessage[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as ContactMessage[];
}
