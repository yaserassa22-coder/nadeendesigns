import { SEED_BRIDAL_ROBES, SEED_VEILS } from "@/lib/data/shop-seed";
import {
  filterLifecycleRows,
  isLifecycleSchemaError,
} from "@/lib/admin/query-lifecycle";
import { selectShopOrdersList } from "@/lib/shop/order-query";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import type { AccessoryItem, BridalRobe, ShopOrder, Veil } from "@/types/shop";
import type { ContactMessage } from "@/types";

export async function getAdminVeils(): Promise<Veil[]> {
  if (!isSupabaseConfigured()) return SEED_VEILS;
  const supabase = createAdminClient();
  let query = supabase
    .from("veils")
    .select("*")
    .order("created_at", { ascending: false });
  query = query.eq("is_deleted", false) as typeof query;
  const { data, error } = await query;
  if (error && isLifecycleSchemaError(error)) {
    const retry = await supabase
      .from("veils")
      .select("*")
      .order("created_at", { ascending: false });
    if (retry.error || !retry.data) return SEED_VEILS;
    return retry.data as Veil[];
  }
  if (error || !data) return SEED_VEILS;
  return filterLifecycleRows(data as Veil[], "all");
}

export async function getAdminBridalRobes(): Promise<BridalRobe[]> {
  if (!isSupabaseConfigured()) return SEED_BRIDAL_ROBES;
  const supabase = createAdminClient();
  let query = supabase
    .from("bridal_robes")
    .select("*")
    .order("created_at", { ascending: false });
  query = query.eq("is_deleted", false) as typeof query;
  const { data, error } = await query;
  if (error && isLifecycleSchemaError(error)) {
    const retry = await supabase
      .from("bridal_robes")
      .select("*")
      .order("created_at", { ascending: false });
    if (retry.error || !retry.data) return SEED_BRIDAL_ROBES;
    return retry.data as BridalRobe[];
  }
  if (error || !data) return SEED_BRIDAL_ROBES;
  return filterLifecycleRows(data as BridalRobe[], "all");
}

/** Generic bridal-accessory rows for one category (migration 056). */
export async function getAdminAccessoryItems(
  categoryId: string
): Promise<AccessoryItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createAdminClient();
  let query = supabase
    .from("accessory_items")
    .select("*")
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false });
  query = query.eq("is_deleted", false) as typeof query;
  const { data, error } = await query;
  if (error && isLifecycleSchemaError(error)) {
    const retry = await supabase
      .from("accessory_items")
      .select("*")
      .eq("category_id", categoryId)
      .order("created_at", { ascending: false });
    if (retry.error || !retry.data) return [];
    return retry.data as AccessoryItem[];
  }
  if (error || !data) return [];
  return filterLifecycleRows(data as AccessoryItem[], "all");
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

    const orders = filterLifecycleRows(
      (data ?? []) as Array<
        ShopOrder & { is_deleted?: boolean | null; archived_at?: string | null }
      >,
      "all"
    ) as ShopOrder[];

    // Enrich Customer Type: Registered | Guest
    const customerIds = [
      ...new Set(
        orders
          .map((o) => o.customer_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const typeById = new Map<string, "registered" | "guest">();
    if (customerIds.length > 0) {
      try {
        const admin = createAdminClient();
        const { data: customers } = await admin
          .from("customers")
          .select("id, auth_user_id, is_guest")
          .in("id", customerIds);
        for (const c of customers ?? []) {
          const registered =
            Boolean(c.auth_user_id) || c.is_guest === false;
          typeById.set(
            c.id as string,
            registered ? "registered" : "guest"
          );
        }
      } catch {
        /* non-fatal */
      }
    }

    const enriched = orders.map((o) => ({
      ...o,
      customer_type: o.customer_id
        ? typeById.get(o.customer_id) ?? "guest"
        : ("guest" as const),
    }));

    return {
      orders: enriched,
      error: null,
      count: typeof count === "number" ? count : enriched.length,
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
  /**
   * Must NOT use bare createAdminClient() without SERVICE_ROLE — that falls
   * back to anon, which has INSERT-only RLS on contact_messages. Anon SELECT
   * returns [] with no error (rows exist but are invisible).
   * Prefer service role; otherwise the authenticated admin cookie session.
   *
   * Also sync /account/messages (customer_messages) into this inbox so
   * logged-in customer chats appear here.
   */
  const supabase = await createPrivilegedClient();

  try {
    const { syncAccountMessagesIntoInbox } = await import(
      "@/lib/admin/account-message-bridge"
    );
    await syncAccountMessagesIntoInbox(supabase);
  } catch (e) {
    console.warn("[getAdminMessages] account sync skipped", e);
  }

  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAdminMessages] select failed", error);
    return [];
  }

  const rows = (data ?? []) as ContactMessage[];
  if (rows.length === 0 && process.env.NODE_ENV !== "production") {
    console.warn(
      "[getAdminMessages] 0 rows — if Contact Form inserts work, check SUPABASE_SERVICE_ROLE_KEY and Admin RLS on contact_messages"
    );
  }

  // Exclude soft-deleted; keep archived (UI visibility filter handles that).
  // NULL / missing is_deleted ⇒ active (legacy rows before lifecycle migration).
  return filterLifecycleRows(rows, "all").filter(
    (m) =>
      (m as ContactMessage & { is_deleted?: boolean | null }).is_deleted !== true
  );
}
