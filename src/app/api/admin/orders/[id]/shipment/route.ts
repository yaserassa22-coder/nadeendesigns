import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  isMissingTableError,
  missingShopSchemaMessage,
} from "@/lib/supabase/errors";
import {
  ORDER_SELECT_CORE,
  ORDER_SELECT_FULL,
  isOrderSchemaError,
  normalizeShopOrderRow,
} from "@/lib/shop/order-query";
import {
  attachShipmentToOrder,
  cancelOrderShipment,
  createShipmentForOrder,
  getOrderShipmentLabel,
  refreshShipmentTracking,
} from "@/lib/shipping/shipment-service";
import type { ShopOrder } from "@/types/shop";

declare global {
  var __nadeenMemoryOrders: ShopOrder[] | undefined;
}

function memoryOrders(): ShopOrder[] {
  if (!globalThis.__nadeenMemoryOrders) globalThis.__nadeenMemoryOrders = [];
  return globalThis.__nadeenMemoryOrders;
}

async function loadOrder(id: string): Promise<ShopOrder | null> {
  const cached = memoryOrders().find((o) => o.id === id) ?? null;
  if (!isSupabaseConfigured()) return cached;

  const supabase = await createPrivilegedClient();
  let result = await supabase
    .from("shop_orders")
    .select(ORDER_SELECT_FULL as "*")
    .eq("id", id)
    .maybeSingle();
  if (result.error && isOrderSchemaError(result.error)) {
    result = await supabase
      .from("shop_orders")
      .select(ORDER_SELECT_CORE as "*")
      .eq("id", id)
      .maybeSingle();
  }
  if (result.error) {
    if (isMissingTableError(result.error, "shop_orders")) {
      throw new Error(missingShopSchemaMessage());
    }
    return cached;
  }
  if (!result.data) return cached;
  return normalizeShopOrderRow(result.data as Record<string, unknown>);
}

const bodySchema = z.object({
  action: z.enum(["create", "refresh", "cancel", "label"]),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const gate = await requireAdminApi("canMutateStore");
  if (gate.error) return gate.error;

  const { id } = await ctx.params;
  if (!id || id.length < 8) {
    return NextResponse.json({ error: "معرّف الطلب غير صالح" }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 });
  }

  let order: ShopOrder | null;
  try {
    order = await loadOrder(id);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل جلب الطلب" },
      { status: 503 }
    );
  }
  if (!order) {
    return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  }

  const supabase = isSupabaseConfigured()
    ? await createPrivilegedClient()
    : null;

  if (parsed.data.action === "label") {
    const result = await getOrderShipmentLabel(order);
    return NextResponse.json({
      ok: Boolean(result.labelUrl),
      label_url: result.labelUrl,
      skipped: result.skipped,
      error: result.error ?? null,
      order: attachShipmentToOrder(order, order.shipment ?? null),
    });
  }

  const run =
    parsed.data.action === "create"
      ? createShipmentForOrder
      : parsed.data.action === "refresh"
        ? refreshShipmentTracking
        : cancelOrderShipment;

  const result = await run(supabase, order);
  const next = attachShipmentToOrder(order, result.shipment);

  const mem = memoryOrders();
  const idx = mem.findIndex((o) => o.id === order.id);
  if (idx >= 0) mem[idx] = next;

  const skipped =
    "skipped" in result ? result.skipped : undefined;
  const carrierConnected =
    parsed.data.action === "create" && "carrierConnected" in result
      ? result.carrierConnected
      : undefined;

  return NextResponse.json({
    ok: !skipped,
    skipped: skipped ?? null,
    error: result.error ?? null,
    carrier_connected: carrierConnected ?? null,
    order: next,
  });
}
