import { NextResponse } from "next/server";
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
        "[orders/:id] optional columns missing on select — retrying. Run APPLY_SMART_SHIPPING.sql"
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

    return NextResponse.json(
      normalizeShopOrderRow(data as Record<string, unknown>)
    );
  } catch (e) {
    const cached = fromMemory();
    if (cached) return NextResponse.json(cached);

    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل جلب الطلب" },
      { status: 500 }
    );
  }
}
