import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getErrorMessage,
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id || id.length < 8) {
    return NextResponse.json({ error: "معرّف الطلب غير صالح" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    const found = memoryOrders().find((o) => o.id === id);
    if (!found) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }
    return NextResponse.json(found);
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("shop_orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error, "shop_orders")) {
        return NextResponse.json(
          { error: missingShopSchemaMessage() },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: getErrorMessage(error) || "فشل جلب الطلب" },
        { status: 400 }
      );
    }
    if (!data) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }
    return NextResponse.json(data as ShopOrder);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل جلب الطلب" },
      { status: 500 }
    );
  }
}
