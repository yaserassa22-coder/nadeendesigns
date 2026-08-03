import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getErrorMessage,
  isMissingColumnError,
  isMissingTableError,
  missingShopSchemaMessage,
} from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ShopOrder } from "@/types/shop";

/** In-memory fallback shared with main orders route via process (dev only). */
declare global {
  var __nadeenMemoryOrders: ShopOrder[] | undefined;
}

function memoryOrders(): ShopOrder[] {
  if (!globalThis.__nadeenMemoryOrders) globalThis.__nadeenMemoryOrders = [];
  return globalThis.__nadeenMemoryOrders;
}

/** Core columns that exist on the original shop_orders table. */
const ORDER_SELECT_CORE =
  "id, name, phone, email, notes, items, gift_options, total, status, created_at";

/** Shipping columns from APPLY_SHOP_SHIPPING.sql + M9 delivery fields */
const ORDER_SELECT_SHIPPING =
  "shipping_required, shipping_full_name, shipping_phone, shipping_city, shipping_region, shipping_address, shipping_postal_code, shipping_notes, shipping_cost, delivery_method, shipping_region_id, shipping_region_name_ar, shipping_building_number, shipping_neighborhood";

/** Notification prefs from APPLY_NOTIFICATION_PREFERENCES.sql */
const ORDER_SELECT_NOTIFY = "notify_whatsapp, notify_email";

const ORDER_SELECT_FULL = `${ORDER_SELECT_CORE}, ${ORDER_SELECT_SHIPPING}, ${ORDER_SELECT_NOTIFY}`;
const ORDER_SELECT_WITH_SHIPPING = `${ORDER_SELECT_CORE}, ${ORDER_SELECT_SHIPPING}`;
const ORDER_SELECT_SHIPPING_LEGACY =
  "shipping_required, shipping_full_name, shipping_phone, shipping_city, shipping_region, shipping_address, shipping_postal_code, shipping_notes, shipping_cost";
const ORDER_SELECT_WITH_SHIPPING_LEGACY = `${ORDER_SELECT_CORE}, ${ORDER_SELECT_SHIPPING_LEGACY}`;
const ORDER_SELECT_FULL_LEGACY = `${ORDER_SELECT_CORE}, ${ORDER_SELECT_SHIPPING_LEGACY}, ${ORDER_SELECT_NOTIFY}`;

async function fetchOrderById(id: string) {
  const supabase = createAdminClient();

  let result = await supabase
    .from("shop_orders")
    .select(ORDER_SELECT_FULL)
    .eq("id", id)
    .maybeSingle();

  // Schema / PostgREST cache may lack newer columns — degrade gracefully.
  if (
    result.error &&
    (isMissingColumnError(result.error) ||
      /notify_|shipping_|delivery_method|column .* does not exist|Could not find the .*column/i.test(
        getErrorMessage(result.error)
      ))
  ) {
    console.warn(
      "[orders/:id] optional columns missing on select — retrying. Run APPLY_SHIPPING_REGIONS.sql"
    );
    result = await supabase
      .from("shop_orders")
      .select(ORDER_SELECT_FULL_LEGACY)
      .eq("id", id)
      .maybeSingle();

    if (
      result.error &&
      (isMissingColumnError(result.error) ||
        /notify_|shipping_|column .* does not exist|Could not find the .*column/i.test(
          getErrorMessage(result.error)
        ))
    ) {
      result = await supabase
        .from("shop_orders")
        .select(ORDER_SELECT_WITH_SHIPPING_LEGACY)
        .eq("id", id)
        .maybeSingle();

      if (
        result.error &&
        (isMissingColumnError(result.error) ||
          /shipping_|column .* does not exist|Could not find the .*column/i.test(
            getErrorMessage(result.error)
          ))
      ) {
        result = await supabase
          .from("shop_orders")
          .select(ORDER_SELECT_CORE)
          .eq("id", id)
          .maybeSingle();
      }
    }
  }

  return result;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id || id.length < 8) {
    return NextResponse.json({ error: "معرّف الطلب غير صالح" }, { status: 400 });
  }

  const fromMemory = () => memoryOrders().find((o) => o.id === id) ?? null;

  if (!isSupabaseConfigured()) {
    const found = fromMemory();
    if (!found) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }
    return NextResponse.json(found);
  }

  try {
    const { data, error } = await fetchOrderById(id);

    if (error) {
      if (isMissingTableError(error, "shop_orders")) {
        return NextResponse.json(
          { error: missingShopSchemaMessage() },
          { status: 503 }
        );
      }

      // Same-process confirmation after checkout when RLS/anon read fails.
      const cached = fromMemory();
      if (cached) return NextResponse.json(cached);

      console.error("[orders/:id] fetch failed", {
        code: (error as { code?: string }).code,
        message: getErrorMessage(error),
      });
      return NextResponse.json(
        { error: getErrorMessage(error) || "فشل جلب الطلب" },
        { status: 400 }
      );
    }

    if (!data) {
      // RLS with anon key can return empty even when the row exists.
      const cached = fromMemory();
      if (cached) return NextResponse.json(cached);

      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    return NextResponse.json(data as ShopOrder);
  } catch (e) {
    const cached = fromMemory();
    if (cached) return NextResponse.json(cached);

    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل جلب الطلب" },
      { status: 500 }
    );
  }
}
