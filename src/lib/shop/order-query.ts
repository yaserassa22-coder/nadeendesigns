import {
  getErrorMessage,
  isMissingColumnError,
} from "@/lib/supabase/errors";
import type { ShopOrder } from "@/types/shop";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Core columns that exist on the original shop_orders table. */
export const ORDER_SELECT_CORE =
  "id, name, phone, email, notes, items, gift_options, total, status, created_at";

/** Shipping columns from APPLY_SHOP_SHIPPING.sql + M9/M10 delivery fields */
export const ORDER_SELECT_SHIPPING =
  "shipping_required, shipping_full_name, shipping_phone, shipping_city, shipping_region, shipping_address, shipping_postal_code, shipping_notes, shipping_cost, delivery_method, shipping_region_id, shipping_region_name_ar, shipping_building_number, shipping_neighborhood, shipping_region_custom, region_configured, shipping_fee_pending, tracking_number, tracking_url, internal_shipping_notes, carrier_code";

/** M9 columns without M10 smart-shipping fields */
export const ORDER_SELECT_SHIPPING_M9 =
  "shipping_required, shipping_full_name, shipping_phone, shipping_city, shipping_region, shipping_address, shipping_postal_code, shipping_notes, shipping_cost, delivery_method, shipping_region_id, shipping_region_name_ar, shipping_building_number, shipping_neighborhood";

/** Notification prefs from APPLY_NOTIFICATION_PREFERENCES.sql */
export const ORDER_SELECT_NOTIFY = "notify_whatsapp, notify_email";

export const ORDER_SELECT_FULL = `${ORDER_SELECT_CORE}, ${ORDER_SELECT_SHIPPING}, ${ORDER_SELECT_NOTIFY}`;
export const ORDER_SELECT_FULL_M9 = `${ORDER_SELECT_CORE}, ${ORDER_SELECT_SHIPPING_M9}, ${ORDER_SELECT_NOTIFY}`;
export const ORDER_SELECT_SHIPPING_LEGACY =
  "shipping_required, shipping_full_name, shipping_phone, shipping_city, shipping_region, shipping_address, shipping_postal_code, shipping_notes, shipping_cost";
export const ORDER_SELECT_WITH_SHIPPING_LEGACY = `${ORDER_SELECT_CORE}, ${ORDER_SELECT_SHIPPING_LEGACY}`;
export const ORDER_SELECT_FULL_LEGACY = `${ORDER_SELECT_CORE}, ${ORDER_SELECT_SHIPPING_LEGACY}, ${ORDER_SELECT_NOTIFY}`;

/** True when PostgREST/Postgres reports missing optional order columns. */
export function isOrderSchemaError(error: unknown): boolean {
  if (isMissingColumnError(error)) return true;
  return /notify_|shipping_|delivery_method|tracking_|region_configured|carrier_code|column .* does not exist|Could not find the .*column/i.test(
    getErrorMessage(error)
  );
}

export function normalizeShopOrderRow(row: Record<string, unknown>): ShopOrder {
  const items = Array.isArray(row.items) ? row.items : [];
  return {
    ...(row as unknown as ShopOrder),
    items: items as ShopOrder["items"],
    total: Number(row.total ?? 0),
    shipping_cost:
      row.shipping_cost === null || row.shipping_cost === undefined
        ? row.shipping_cost
        : Number(row.shipping_cost),
    shipping_fee_pending:
      row.shipping_fee_pending === null || row.shipping_fee_pending === undefined
        ? row.shipping_fee_pending
        : Boolean(row.shipping_fee_pending),
    region_configured:
      row.region_configured === null || row.region_configured === undefined
        ? row.region_configured
        : Boolean(row.region_configured),
  };
}

type ListResult = {
  data: ShopOrder[];
  error: { message?: string; code?: string } | null;
  count: number | null;
};

/**
 * List shop_orders with progressive column fallback so a missing M9/M10
 * column never empties the entire admin order list.
 */
export async function selectShopOrdersList(
  supabase: SupabaseClient
): Promise<ListResult> {
  const attempts = [
    "*",
    ORDER_SELECT_FULL,
    ORDER_SELECT_FULL_M9,
    ORDER_SELECT_FULL_LEGACY,
    ORDER_SELECT_WITH_SHIPPING_LEGACY,
    ORDER_SELECT_CORE,
  ] as const;

  let lastError: { message?: string; code?: string } | null = null;

  for (let i = 0; i < attempts.length; i++) {
    const cols = attempts[i];
    // Dynamic column lists are intentional (schema fallback); bypass generated parser types.
    const { data, error, count } = await supabase
      .from("shop_orders")
      .select(cols as "*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (!error) {
      const orders = ((data ?? []) as unknown as Record<string, unknown>[]).map(
        normalizeShopOrderRow
      );
      return {
        data: orders,
        error: null,
        count: typeof count === "number" ? count : orders.length,
      };
    }

    lastError = error;
    const canFallback =
      i < attempts.length - 1 && isOrderSchemaError(error);
    if (!canFallback) {
      return { data: [], error, count: 0 };
    }
    console.warn(
      `[selectShopOrdersList] select failed (${cols === "*" ? "*" : "explicit"}) — retrying narrower columns`,
      getErrorMessage(error)
    );
  }

  return { data: [], error: lastError, count: 0 };
}

/** Delivery orders that should show the shipping-slip print action. */
export function isDeliveryOrderForSlip(order: {
  delivery_method?: string | null;
  shipping_required?: boolean | null;
  shipping_address?: string | null;
  shipping_full_name?: string | null;
  shipping_city?: string | null;
}): boolean {
  if (order.delivery_method === "pickup") return false;
  if (order.delivery_method === "delivery") return true;
  // Legacy rows / columns not persisted: address implies courier delivery
  if (order.shipping_required === false) return false;
  return Boolean(
    order.shipping_address ||
      order.shipping_full_name ||
      order.shipping_city
  );
}
