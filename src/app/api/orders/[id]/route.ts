import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getErrorMessage,
  isMissingTableError,
  missingShopSchemaMessage,
} from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  ORDER_SELECT_CORE,
  ORDER_SELECT_FULL,
  ORDER_SELECT_FULL_LEGACY,
  ORDER_SELECT_FULL_M9,
  ORDER_SELECT_WITH_SHIPPING_LEGACY,
  isOrderSchemaError,
  normalizeShopOrderRow,
} from "@/lib/shop/order-query";
import {
  publicEstimatedDeliveryFromRegion,
  toPublicShopOrder,
} from "@/lib/shop/to-public-order";
import { logMissingPublicSiteUrl } from "@/lib/shop/order-tracking-qr";
import type { ShopOrder } from "@/types/shop";

/** In-memory fallback shared with main orders route via process (dev only). */
declare global {
  var __nadeenMemoryOrders: ShopOrder[] | undefined;
}

function memoryOrders(): ShopOrder[] {
  if (!globalThis.__nadeenMemoryOrders) globalThis.__nadeenMemoryOrders = [];
  return globalThis.__nadeenMemoryOrders;
}

async function fetchOrderById(id: string) {
  const supabase = createAdminClient();

  const attempts = [
    ORDER_SELECT_FULL,
    ORDER_SELECT_FULL_M9,
    ORDER_SELECT_FULL_LEGACY,
    ORDER_SELECT_WITH_SHIPPING_LEGACY,
    ORDER_SELECT_CORE,
  ] as const;

  let result = await supabase
    .from("shop_orders")
    .select(attempts[0] as "*")
    .eq("id", id)
    .maybeSingle();

  for (let i = 1; i < attempts.length; i++) {
    if (!result.error || !isOrderSchemaError(result.error)) break;
    if (i === 1) {
      console.warn(
        "[orders/:id] optional columns missing on select — retrying. Run APPLY_MISSING_MIGRATIONS.sql"
      );
    }
    result = await supabase
      .from("shop_orders")
      .select(attempts[i] as "*")
      .eq("id", id)
      .maybeSingle();
  }

  return result;
}

async function enrichEstimatedDelivery(
  order: ShopOrder
): Promise<string | null> {
  if (order.estimated_delivery) return order.estimated_delivery;
  if (!order.shipping_region_id || !isSupabaseConfigured()) return null;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("shipping_regions")
      .select(
        "estimated_delivery_ar, estimated_days_min, estimated_days_max, estimated_days"
      )
      .eq("id", order.shipping_region_id)
      .maybeSingle();
    if (!data) return null;
    return publicEstimatedDeliveryFromRegion(data);
  } catch {
    return null;
  }
}

/**
 * Admins (shipping slip) get the full row; public tracking gets a sanitized
 * payload without internal notes or admin-only fields.
 */
async function asTrackingResponse(order: ShopOrder, isAdmin: boolean) {
  const estimated = await enrichEstimatedDelivery(order);
  if (isAdmin) {
    // Server console only — never expose config details in the admin UI in production.
    logMissingPublicSiteUrl("admin order fetch");
    return {
      ...order,
      estimated_delivery: estimated ?? order.estimated_delivery ?? null,
    };
  }
  return toPublicShopOrder(order, { estimated_delivery: estimated });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id || id.length < 8) {
    return NextResponse.json({ error: "معرّف الطلب غير صالح" }, { status: 400 });
  }

  const { user } = await requireAdminApi();
  const isAdmin = Boolean(user);
  const fromMemory = () => memoryOrders().find((o) => o.id === id) ?? null;

  if (!isSupabaseConfigured()) {
    const found = fromMemory();
    if (!found) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }
    return NextResponse.json(await asTrackingResponse(found, isAdmin));
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
      if (cached) {
        return NextResponse.json(await asTrackingResponse(cached, isAdmin));
      }

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
      if (cached) {
        return NextResponse.json(await asTrackingResponse(cached, isAdmin));
      }

      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    const order = normalizeShopOrderRow(data as Record<string, unknown>);
    return NextResponse.json(await asTrackingResponse(order, isAdmin));
  } catch (e) {
    const cached = fromMemory();
    if (cached) {
      return NextResponse.json(await asTrackingResponse(cached, isAdmin));
    }

    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل جلب الطلب" },
      { status: 500 }
    );
  }
}
