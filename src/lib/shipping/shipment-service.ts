import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingTableError } from "../supabase/errors";
import { formatPublicOrderNumber } from "../shop/order-tracking-qr";
import { ensureShippingCarriersRegistered } from "./carriers";
import { getShippingCarrier } from "./carriers/registry";
import type { ShippingCarrier } from "./carriers/types";
import type {
  OrderShipment,
  ShipmentStatus,
  ShopOrder,
} from "../../types/shop";

export const SHIPMENT_SELECT =
  "id, order_id, public_token, carrier, carrier_shipment_id, carrier_tracking_number, carrier_service, carrier_label_url, shipment_status, shipped_at, delivered_at, is_primary, created_at, updated_at";

const TOKEN_BYTES = 32;

export function generateShipmentPublicToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function isValidShipmentPublicToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{32,88}$/.test(token.trim());
}

export function normalizeShipmentRow(
  row: Record<string, unknown>
): OrderShipment {
  const status = String(row.shipment_status ?? "pending") as ShipmentStatus;
  return {
    id: String(row.id),
    order_id: String(row.order_id),
    public_token: String(row.public_token),
    carrier: (row.carrier as string | null) ?? null,
    carrier_shipment_id: (row.carrier_shipment_id as string | null) ?? null,
    carrier_tracking_number:
      (row.carrier_tracking_number as string | null) ?? null,
    carrier_service: (row.carrier_service as string | null) ?? null,
    carrier_label_url: (row.carrier_label_url as string | null) ?? null,
    shipment_status: status || "pending",
    shipped_at: (row.shipped_at as string | null) ?? null,
    delivered_at: (row.delivered_at as string | null) ?? null,
    is_primary: row.is_primary !== false,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

export function buildLocalPrimaryShipment(
  order: Pick<ShopOrder, "id" | "tracking_number" | "carrier_code" | "status">,
  token = generateShipmentPublicToken()
): OrderShipment {
  const now = new Date().toISOString();
  let shipment_status: ShipmentStatus = "pending";
  if (order.status === "delivered" || order.status === "completed") {
    shipment_status = "delivered";
  } else if (order.status === "shipped") {
    shipment_status = "in_transit";
  } else if (order.status === "cancelled") {
    shipment_status = "cancelled";
  }
  return {
    id: crypto.randomUUID(),
    order_id: order.id,
    public_token: token,
    carrier: order.carrier_code?.trim() || null,
    carrier_shipment_id: null,
    carrier_tracking_number: order.tracking_number?.trim() || null,
    carrier_service: null,
    carrier_label_url: null,
    shipment_status,
    shipped_at: shipment_status === "in_transit" ? now : null,
    delivered_at: shipment_status === "delivered" ? now : null,
    is_primary: true,
    created_at: now,
    updated_at: now,
  };
}

export function attachShipmentToOrder(
  order: ShopOrder,
  shipment: OrderShipment | null
): ShopOrder {
  if (!shipment) return { ...order, shipment: order.shipment ?? null };
  return {
    ...order,
    shipment,
    tracking_number:
      order.tracking_number ?? shipment.carrier_tracking_number,
    tracking_url: order.tracking_url ?? null,
    carrier_code: order.carrier_code ?? shipment.carrier,
  };
}

async function fetchPrimaryShipment(
  supabase: SupabaseClient,
  orderId: string
): Promise<OrderShipment | null> {
  const { data, error } = await supabase
    .from("order_shipments")
    .select(SHIPMENT_SELECT)
    .eq("order_id", orderId)
    .eq("is_primary", true)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error, "order_shipments")) return null;
    console.warn("[shipment] fetch primary failed", error.message);
    return null;
  }
  return data ? normalizeShipmentRow(data as Record<string, unknown>) : null;
}

/**
 * Create (or return) the primary shipment for an order. Always automatic —
 * admin never enters an order id or QR payload.
 */
export async function ensurePrimaryShipment(
  supabase: SupabaseClient | null,
  order: ShopOrder
): Promise<OrderShipment> {
  if (order.shipment?.public_token) {
    return order.shipment;
  }
  if (!supabase) {
    return buildLocalPrimaryShipment(order);
  }

  const existing = await fetchPrimaryShipment(supabase, order.id);
  if (existing) return existing;

  const local = buildLocalPrimaryShipment(order);
  const { data, error } = await supabase
    .from("order_shipments")
    .insert({
      id: local.id,
      order_id: order.id,
      public_token: local.public_token,
      carrier: local.carrier,
      carrier_tracking_number: local.carrier_tracking_number,
      shipment_status: local.shipment_status,
      shipped_at: local.shipped_at,
      delivered_at: local.delivered_at,
      is_primary: true,
    })
    .select(SHIPMENT_SELECT)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, "order_shipments")) {
      console.warn(
        "[shipment] order_shipments missing — run supabase/APPLY_ORDER_SHIPMENTS.sql"
      );
      return local;
    }
    const raced = await fetchPrimaryShipment(supabase, order.id);
    if (raced) return raced;
    console.warn("[shipment] insert failed", error.message);
    return local;
  }

  return data
    ? normalizeShipmentRow(data as Record<string, unknown>)
    : local;
}

export async function attachPrimaryShipments(
  supabase: SupabaseClient,
  orders: ShopOrder[]
): Promise<ShopOrder[]> {
  if (orders.length === 0) return orders;
  const ids = orders.map((o) => o.id);
  const { data, error } = await supabase
    .from("order_shipments")
    .select(SHIPMENT_SELECT)
    .in("order_id", ids)
    .eq("is_primary", true);
  if (error) {
    if (!isMissingTableError(error, "order_shipments")) {
      console.warn("[shipment] list attach failed", error.message);
    }
    return orders;
  }
  const byOrder = new Map<string, OrderShipment>();
  for (const row of data ?? []) {
    const shipment = normalizeShipmentRow(row as Record<string, unknown>);
    byOrder.set(shipment.order_id, shipment);
  }
  return orders.map((order) =>
    attachShipmentToOrder(order, byOrder.get(order.id) ?? null)
  );
}

export async function findShipmentByPublicToken(
  supabase: SupabaseClient | null,
  token: string,
  memoryOrders: ShopOrder[] = []
): Promise<{ shipment: OrderShipment; orderId: string } | null> {
  const trimmed = token.trim();
  if (!isValidShipmentPublicToken(trimmed)) return null;

  const fromMemory = memoryOrders.find(
    (o) => o.shipment?.public_token === trimmed
  );
  if (fromMemory?.shipment) {
    return { shipment: fromMemory.shipment, orderId: fromMemory.id };
  }

  if (!supabase) return null;

  const { data, error } = await supabase
    .from("order_shipments")
    .select(SHIPMENT_SELECT)
    .eq("public_token", trimmed)
    .maybeSingle();
  if (error) {
    if (!isMissingTableError(error, "order_shipments")) {
      console.warn("[shipment] token lookup failed", error.message);
    }
    return null;
  }
  if (!data) return null;
  const shipment = normalizeShipmentRow(data as Record<string, unknown>);
  return { shipment, orderId: shipment.order_id };
}

async function syncOrderMirrors(
  supabase: SupabaseClient,
  shipment: OrderShipment
): Promise<void> {
  const { error } = await supabase
    .from("shop_orders")
    .update({
      tracking_number: shipment.carrier_tracking_number,
      carrier_code: shipment.carrier,
    })
    .eq("id", shipment.order_id);
  if (error && !isMissingTableError(error, "shop_orders")) {
    const patch: Record<string, unknown> = {
      tracking_number: shipment.carrier_tracking_number,
      carrier_code: shipment.carrier,
    };
    const retry = await supabase
      .from("shop_orders")
      .update(patch)
      .eq("id", shipment.order_id);
    if (retry.error) {
      console.warn("[shipment] mirror sync failed", retry.error.message);
    }
  }
}

/** Manual fallback: copy order tracking fields onto the primary shipment. */
export async function syncPrimaryShipmentFromOrderMirrors(
  supabase: SupabaseClient | null,
  order: ShopOrder
): Promise<OrderShipment | null> {
  if (!supabase) {
    if (!order.shipment) return null;
    const next: OrderShipment = {
      ...order.shipment,
      carrier: order.carrier_code?.trim() || order.shipment.carrier,
      carrier_tracking_number:
        order.tracking_number?.trim() || order.shipment.carrier_tracking_number,
      updated_at: new Date().toISOString(),
    };
    return next;
  }
  const shipment = await ensurePrimaryShipment(supabase, order);
  const { data, error } = await supabase
    .from("order_shipments")
    .update({
      carrier: order.carrier_code?.trim() || shipment.carrier,
      carrier_tracking_number:
        order.tracking_number?.trim() || shipment.carrier_tracking_number,
      updated_at: new Date().toISOString(),
    })
    .eq("id", shipment.id)
    .select(SHIPMENT_SELECT)
    .maybeSingle();
  if (error) {
    console.warn("[shipment] fallback sync failed", error.message);
    return shipment;
  }
  return data
    ? normalizeShipmentRow(data as Record<string, unknown>)
    : shipment;
}

async function resolveCarrierForOrder(
  supabase: SupabaseClient | null,
  order: ShopOrder,
  shipment: OrderShipment
): Promise<ShippingCarrier> {
  ensureShippingCarriersRegistered();
  if (!supabase) {
    return getShippingCarrier(shipment.carrier || order.carrier_code);
  }
  const { bindActiveShippingCarrier, bindCarrierForCode } = await import(
    "./providers/store"
  );
  const active = await bindActiveShippingCarrier();
  if (active.code !== "noop") return active;
  const code = shipment.carrier || order.carrier_code;
  if (code) return bindCarrierForCode(code);
  return getShippingCarrier(code);
}

async function boundCarrier(code?: string | null): Promise<ShippingCarrier> {
  const { bindCarrierForCode } = await import("./providers/store");
  return bindCarrierForCode(code);
}

function mapCarrierStatus(status: string): ShipmentStatus {
  const s = status.trim().toLowerCase();
  if (s === "delivered" || s === "completed") return "delivered";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "failed" || s === "error") return "failed";
  if (s === "label_created" || s === "label created") return "label_created";
  if (s === "in_transit" || s === "in transit" || s === "shipped") {
    return "in_transit";
  }
  return "in_transit";
}

/**
 * Happy path for a connected carrier: create at the courier, then persist
 * tracking/label/status automatically. NoopCarrier / unconfigured writes nothing.
 */
export async function createShipmentForOrder(
  supabase: SupabaseClient | null,
  order: ShopOrder
): Promise<{
  shipment: OrderShipment;
  carrierConnected: boolean;
  skipped?: "not_connected" | "not_configured" | "not_implemented";
  error?: string;
}> {
  const shipment = await ensurePrimaryShipment(supabase, order);
  const carrier = await resolveCarrierForOrder(supabase, order, shipment);
  if (!carrier.isConnected()) {
    return { shipment, carrierConnected: false, skipped: "not_connected" };
  }

  const created = await carrier.createShipment({
    orderId: order.id,
    orderNumber: formatPublicOrderNumber(order.id),
    shipmentId: shipment.id,
    publicToken: shipment.public_token,
    deliveryMethod: order.delivery_method ?? null,
  });

  if (!created.ok) {
    const skipped =
      created.reason === "not_configured" || created.reason === "not_implemented"
        ? created.reason
        : created.reason === "not_connected"
          ? "not_connected"
          : undefined;
    return {
      shipment,
      carrierConnected: carrier.isConnected(),
      skipped,
      error: created.error,
    };
  }

  const now = new Date().toISOString();
  const patch = {
    carrier: carrier.code,
    carrier_shipment_id: created.carrierShipmentId,
    carrier_tracking_number: created.trackingNumber,
    carrier_service: created.service ?? null,
    carrier_label_url: created.labelUrl ?? null,
    shipment_status: "label_created" as ShipmentStatus,
    updated_at: now,
  };

  if (!supabase) {
    const next = { ...shipment, ...patch };
    await Promise.resolve();
    return { shipment: next, carrierConnected: true };
  }

  const { data, error } = await supabase
    .from("order_shipments")
    .update(patch)
    .eq("id", shipment.id)
    .select(SHIPMENT_SELECT)
    .maybeSingle();
  const saved = data
    ? normalizeShipmentRow(data as Record<string, unknown>)
    : { ...shipment, ...patch };
  if (error) {
    console.warn("[shipment] carrier save failed", error.message);
  } else {
    await syncOrderMirrors(supabase, saved);
    if (created.trackingUrl) {
      await supabase
        .from("shop_orders")
        .update({ tracking_url: created.trackingUrl })
        .eq("id", order.id);
    }
  }
  return { shipment: saved, carrierConnected: true };
}

export async function refreshShipmentTracking(
  supabase: SupabaseClient | null,
  order: ShopOrder
): Promise<{
  shipment: OrderShipment;
  skipped?: "not_connected" | "not_configured" | "not_implemented";
  error?: string;
}> {
  const shipment = await ensurePrimaryShipment(supabase, order);
  if (!shipment.carrier_shipment_id) {
    return { shipment, skipped: "not_connected" };
  }
  const carrier = await boundCarrier(shipment.carrier);
  const result = await carrier.getTrackingStatus(shipment.carrier_shipment_id);
  if (!result.ok) {
    return {
      shipment,
      skipped:
        result.reason === "not_connected" ||
        result.reason === "not_configured" ||
        result.reason === "not_implemented"
          ? result.reason
          : undefined,
      error: result.error,
    };
  }

  const now = new Date().toISOString();
  const patch = {
    shipment_status: mapCarrierStatus(result.status),
    carrier_tracking_number:
      result.trackingNumber ?? shipment.carrier_tracking_number,
    shipped_at: result.shippedAt ?? shipment.shipped_at,
    delivered_at: result.deliveredAt ?? shipment.delivered_at,
    updated_at: now,
  };

  if (!supabase) {
    return { shipment: { ...shipment, ...patch } };
  }

  const { data, error } = await supabase
    .from("order_shipments")
    .update(patch)
    .eq("id", shipment.id)
    .select(SHIPMENT_SELECT)
    .maybeSingle();
  const saved = data
    ? normalizeShipmentRow(data as Record<string, unknown>)
    : { ...shipment, ...patch };
  if (error) {
    console.warn("[shipment] tracking refresh failed", error.message);
  } else {
    await syncOrderMirrors(supabase, saved);
  }
  return { shipment: saved };
}

export async function cancelOrderShipment(
  supabase: SupabaseClient | null,
  order: ShopOrder
): Promise<{
  shipment: OrderShipment;
  skipped?: "not_connected" | "not_configured" | "not_implemented";
  error?: string;
}> {
  const shipment = await ensurePrimaryShipment(supabase, order);
  if (!shipment.carrier_shipment_id) {
    return { shipment, skipped: "not_connected" };
  }
  const carrier = await boundCarrier(shipment.carrier);
  const result = await carrier.cancelShipment(shipment.carrier_shipment_id);
  if (!result.ok) {
    return {
      shipment,
      skipped:
        result.reason === "not_connected" ||
        result.reason === "not_configured" ||
        result.reason === "not_implemented"
          ? result.reason
          : undefined,
      error: result.error,
    };
  }

  const now = new Date().toISOString();
  const patch = {
    shipment_status: "cancelled" as ShipmentStatus,
    updated_at: now,
  };
  if (!supabase) {
    return { shipment: { ...shipment, ...patch } };
  }
  const { data, error } = await supabase
    .from("order_shipments")
    .update(patch)
    .eq("id", shipment.id)
    .select(SHIPMENT_SELECT)
    .maybeSingle();
  const saved = data
    ? normalizeShipmentRow(data as Record<string, unknown>)
    : { ...shipment, ...patch };
  if (error) {
    console.warn("[shipment] cancel failed", error.message);
  }
  return { shipment: saved };
}

export async function getOrderShipmentLabel(
  order: ShopOrder
): Promise<{
  labelUrl: string | null;
  skipped?: "not_connected" | "not_configured" | "not_implemented";
  error?: string;
}> {
  const shipment = order.shipment;
  if (shipment?.carrier_label_url) {
    return { labelUrl: shipment.carrier_label_url };
  }
  if (!shipment?.carrier_shipment_id) {
    return { labelUrl: null, skipped: "not_connected" };
  }
  const carrier = await boundCarrier(shipment.carrier);
  const result = await carrier.getShippingLabel(shipment.carrier_shipment_id);
  if (!result.ok) {
    return {
      labelUrl: null,
      skipped:
        result.reason === "not_connected" ||
        result.reason === "not_configured" ||
        result.reason === "not_implemented"
          ? result.reason
          : undefined,
      error: result.error,
    };
  }
  return { labelUrl: result.labelUrl };
}

export function toPublicShipmentView(shipment: OrderShipment): {
  public_token: string;
  carrier: string | null;
  carrier_tracking_number: string | null;
  shipment_status: ShipmentStatus;
} {
  return {
    public_token: shipment.public_token,
    carrier: shipment.carrier,
    carrier_tracking_number: shipment.carrier_tracking_number,
    shipment_status: shipment.shipment_status,
  };
}
