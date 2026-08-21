import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  findShipmentByPublicToken,
  isValidShipmentPublicToken,
  toPublicShipmentView,
} from "@/lib/shipping/shipment-service";
import { formatPublicOrderNumber } from "@/lib/shop/order-tracking-qr";
import type { ShopOrder } from "@/types/shop";

declare global {
  var __nadeenMemoryOrders: ShopOrder[] | undefined;
}

function memoryOrders(): ShopOrder[] {
  if (!globalThis.__nadeenMemoryOrders) globalThis.__nadeenMemoryOrders = [];
  return globalThis.__nadeenMemoryOrders;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token: raw } = await context.params;
  const token = decodeURIComponent(raw ?? "").trim();
  if (!isValidShipmentPublicToken(token)) {
    return NextResponse.json({ error: "معرّف الشحنة غير صالح" }, { status: 400 });
  }

  const { user } = await requireAdminApi();
  const isAdmin = Boolean(user);

  const supabase = isSupabaseConfigured()
    ? await createPrivilegedClient()
    : null;

  const found = await findShipmentByPublicToken(
    supabase,
    token,
    memoryOrders()
  );
  if (!found) {
    return NextResponse.json({ error: "الشحنة غير موجودة" }, { status: 404 });
  }

  let orderStatus: string | null = null;
  const mem = memoryOrders().find((o) => o.id === found.orderId);
  if (mem) {
    orderStatus = mem.status;
  } else if (supabase) {
    const { data, error } = await supabase
      .from("shop_orders")
      .select("id, status")
      .eq("id", found.orderId)
      .maybeSingle();
    if (error && !isMissingTableError(error, "shop_orders")) {
      console.warn("[shipments/by-token] order fetch failed", error.message);
    }
    orderStatus = (data?.status as string | undefined) ?? null;
  }

  const publicShipment = toPublicShipmentView(found.shipment);

  return NextResponse.json({
    order_number: formatPublicOrderNumber(found.orderId),
    order_status: orderStatus,
    shipment: publicShipment,
    ...(isAdmin ? { order_id: found.orderId } : {}),
  });
}
