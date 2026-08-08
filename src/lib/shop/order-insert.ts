/**
 * Pure helpers for checkout → shop_orders insert payload construction.
 * Kept free of Supabase so smoke/unit tests can assert delivery persistence.
 */

import {
  cartNeedsShipping,
  findRegionByName,
  resolveShippingCost,
  type ShippingAddressInput,
  type ShippingSettings,
} from "@/lib/shop/shipping";
import { SEED_SHIPPING_REGIONS } from "@/lib/shop/shipping-region-seeds";
import type {
  DeliveryMethod,
  ShopOrder,
  ShopOrderItem,
} from "@/types/shop";

export type CheckoutOrderBody = {
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  items: Array<{
    product_type: ShopOrderItem["product_type"];
    product_id: string;
    name_ar: string;
    unit_price: number;
    quantity: number;
    image?: string | null;
    personalization?: ShopOrderItem["personalization"];
    gift_options?: ShopOrderItem["gift_options"];
    order_options?: ShopOrderItem["order_options"];
    extra_services?: ShopOrderItem["extra_services"];
    personalization_fee?: number | null;
    gift_fee?: number | null;
    requires_shipping?: boolean | null;
  }>;
  gift_options?: ShopOrder["gift_options"];
  total?: number;
  shipping_required?: boolean;
  delivery_method?: DeliveryMethod | null;
  shipping?: ShippingAddressInput | null;
  /** Client-calculated fee (DB column is shipping_cost) */
  shipping_cost?: number;
  /** Alias some clients may send — mapped to shipping_cost */
  shipping_fee?: number;
  notify_whatsapp?: boolean;
  notify_email?: boolean;
  payment_provider_id?: string | null;
};

export type RegionMatch = {
  id: string;
  name_ar: string;
  name_en?: string | null;
  shipping_fee: number;
  is_active?: boolean;
};

export type ResolvedDeliveryShipping = {
  needsShipping: boolean;
  deliveryMethod: DeliveryMethod | null;
  regionId: string | null;
  regionNameAr: string | null;
  regionCustom: string | null;
  regionConfigured: boolean;
  feePending: boolean;
  regionFee: number | null;
  shippingCost: number;
  itemsSubtotal: number;
  computedTotal: number;
  shipping: ShippingAddressInput | null;
};

/** Cart accessories OR explicit checkout pickup/delivery choice. */
export function resolveNeedsShipping(body: CheckoutOrderBody): boolean {
  return (
    cartNeedsShipping(body.items) ||
    body.delivery_method === "delivery" ||
    body.delivery_method === "pickup" ||
    body.shipping_required === true
  );
}

/** Prefer shipping_cost; accept shipping_fee alias from older clients. */
export function clientShippingFee(body: CheckoutOrderBody): number {
  const raw =
    body.shipping_cost !== undefined && body.shipping_cost !== null
      ? body.shipping_cost
      : body.shipping_fee;
  const n = Number(raw ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Match region from DB rows, then seed catalog (same source as /api/shipping-regions).
 * Prevents checkout seed fees from being wiped when the regions table is empty/missing.
 */
export function matchShippingRegion(
  regionId: string | null | undefined,
  regionText: string,
  dbRows: RegionMatch[] | null | undefined
): { match: RegionMatch; source: "db" | "seed" } | null {
  const id = regionId?.trim() || null;
  const text = regionText.trim();
  const rows = dbRows ?? [];

  if (id) {
    const byId = rows.find((r) => r.id === id && r.is_active !== false);
    if (byId) return { match: byId, source: "db" };
  }
  if (text) {
    const byName = findRegionByName(
      rows.filter((r) => r.is_active !== false),
      text
    );
    if (byName) return { match: byName, source: "db" };
  }

  const seeds = SEED_SHIPPING_REGIONS.filter((r) => r.is_active !== false);
  if (id) {
    const seedById = seeds.find((r) => r.id === id);
    if (seedById) {
      return {
        match: {
          id: seedById.id,
          name_ar: seedById.name_ar,
          name_en: seedById.name_en,
          shipping_fee: Number(seedById.shipping_fee) || 0,
          is_active: seedById.is_active,
        },
        source: "seed",
      };
    }
  }
  if (text) {
    const seedByName = findRegionByName(seeds, text);
    if (seedByName) {
      return {
        match: {
          id: seedByName.id,
          name_ar: seedByName.name_ar,
          name_en: seedByName.name_en,
          shipping_fee: Number(seedByName.shipping_fee) || 0,
          is_active: seedByName.is_active,
        },
        source: "seed",
      };
    }
  }
  return null;
}

/**
 * Resolve fee + totals for a checkout body after delivery method / region are known.
 * Never zeroes a positive client fee for delivery unless fee is pending (unknown region).
 */
export function resolveDeliveryShipping(input: {
  body: CheckoutOrderBody;
  needsShipping: boolean;
  deliveryMethod: DeliveryMethod | null;
  matched: RegionMatch | null;
  /** When match came from seed catalog only, do not persist shipping_region_id FK. */
  regionMatchSource?: "db" | "seed" | null;
  regionText: string;
  siteSettings: ShippingSettings;
}): ResolvedDeliveryShipping {
  const {
    body,
    needsShipping,
    deliveryMethod,
    matched,
    regionMatchSource,
    regionText,
    siteSettings,
  } = input;

  // Prefer caller-supplied server-recalculated subtotal when present via
  // unit_price + extras already baked into a pre-pass; still sum from lines.
  const itemsSubtotal = body.items.reduce((sum, i) => {
    const base = Number(i.unit_price) || 0;
    const qty = Number(i.quantity) || 0;
    const extras = Array.isArray(i.extra_services)
      ? i.extra_services.reduce((s, e) => {
          const p = Number(e?.price);
          return s + (Number.isFinite(p) && p > 0 ? p : 0);
        }, 0)
      : 0;
    const pers = Number(i.personalization_fee ?? 0);
    const persSafe = Number.isFinite(pers) && pers > 0 ? pers : 0;
    const gift = Number(i.gift_fee ?? 0);
    const giftSafe = Number.isFinite(gift) && gift > 0 ? gift : 0;
    return sum + (base + extras + persSafe + giftSafe) * qty;
  }, 0);

  let regionId: string | null = null;
  let regionNameAr: string | null = null;
  let regionCustom: string | null = null;
  let regionConfigured = true;
  let feePending = false;
  let regionFee: number | null = null;

  if (needsShipping && deliveryMethod === "delivery") {
    if (matched) {
      // Seed-only match: keep fee + name, skip FK (row may not exist in DB yet).
      regionId = regionMatchSource === "seed" ? null : matched.id;
      regionNameAr = matched.name_ar;
      regionFee = Number(matched.shipping_fee) || 0;
      regionConfigured = true;
      feePending = false;
      regionCustom = null;
    } else {
      regionId = null;
      regionNameAr = regionText || body.shipping?.region?.trim() || null;
      regionCustom = regionNameAr;
      regionFee = null;
      regionConfigured = false;
      feePending = true;
    }
  }

  const shipping =
    needsShipping && deliveryMethod === "delivery" ? body.shipping ?? null : null;

  let shippingCost = feePending
    ? 0
    : resolveShippingCost(needsShipping, itemsSubtotal, siteSettings, {
        deliveryMethod,
        regionFee,
      });

  // Delivery with a known/matched region must not silently drop the checkout fee.
  // Prefer server calc; if that is 0 but the client sent a positive fee, keep it.
  if (
    deliveryMethod === "delivery" &&
    !feePending &&
    shippingCost <= 0
  ) {
    const fromClient = clientShippingFee(body);
    if (fromClient > 0) {
      shippingCost = fromClient;
    }
  }

  if (deliveryMethod === "pickup") {
    shippingCost = 0;
    feePending = false;
  }

  const computedTotal = feePending
    ? itemsSubtotal
    : itemsSubtotal + shippingCost;

  return {
    needsShipping,
    deliveryMethod,
    regionId,
    regionNameAr,
    regionCustom,
    regionConfigured:
      needsShipping && deliveryMethod === "delivery" ? regionConfigured : true,
    feePending,
    regionFee,
    shippingCost,
    itemsSubtotal,
    computedTotal,
    shipping,
  };
}

export function buildShopOrderRow(
  body: CheckoutOrderBody,
  resolved: ResolvedDeliveryShipping,
  ids?: { id?: string; created_at?: string },
  extra?: { customer_id?: string | null; guest_id?: string | null }
): ShopOrder {
  const id = ids?.id ?? crypto.randomUUID();
  const created_at = ids?.created_at ?? new Date().toISOString();
  const ship = resolved.shipping;

  return {
    id,
    name: body.name.trim(),
    phone: body.phone.trim(),
    email: body.email?.trim() ? body.email.trim() : null,
    notes: body.notes?.trim() ? body.notes.trim() : null,
    items: body.items.map((i) => ({
      product_type: i.product_type,
      product_id: i.product_id,
      name_ar: i.name_ar,
      unit_price: Number(i.unit_price),
      quantity: Number(i.quantity),
      image: i.image ?? undefined,
      personalization: i.personalization ?? null,
      gift_options: i.gift_options ?? null,
      order_options: i.order_options?.length ? i.order_options : null,
      extra_services: i.extra_services?.length ? i.extra_services : null,
      personalization_fee:
        i.personalization_fee != null && Number(i.personalization_fee) > 0
          ? Number(i.personalization_fee)
          : null,
      gift_fee:
        i.gift_fee != null && Number(i.gift_fee) > 0
          ? Number(i.gift_fee)
          : null,
      requires_shipping:
        i.requires_shipping === true
          ? true
          : i.requires_shipping === false
            ? false
            : undefined,
    })),
    gift_options: body.gift_options ?? null,
    total: resolved.computedTotal,
    status: "pending",
    created_at,
    customer_id: extra?.customer_id ?? null,
    guest_id: extra?.guest_id ?? null,
    shipping_required: resolved.needsShipping,
    delivery_method: resolved.needsShipping ? resolved.deliveryMethod : null,
    shipping_full_name: ship?.full_name?.trim() || null,
    shipping_phone: ship?.phone?.trim() || null,
    shipping_city: ship?.city?.trim() || null,
    shipping_region: ship?.region?.trim() || resolved.regionNameAr || null,
    shipping_region_id: resolved.regionId,
    shipping_region_name_ar: resolved.regionNameAr,
    shipping_region_custom: resolved.regionCustom,
    region_configured: resolved.regionConfigured,
    shipping_fee_pending: resolved.feePending,
    shipping_address: ship?.address?.trim() || null,
    shipping_building_number: ship?.building_number?.trim() || null,
    shipping_neighborhood: ship?.neighborhood?.trim() || null,
    shipping_postal_code: ship?.postal_code?.trim() || null,
    shipping_notes: ship?.notes?.trim() || null,
    shipping_cost: resolved.shippingCost,
    tracking_number: null,
    tracking_url: null,
    internal_shipping_notes: null,
    carrier_code: null,
    notify_whatsapp: body.notify_whatsapp ?? true,
    notify_email: body.notify_email ?? true,
    payment_provider_id: body.payment_provider_id?.trim() || "cod",
    payment_status: "unpaid",
  };
}

export type InsertPayload = Record<string, unknown>;

/**
 * Progressive insert tiers. When the customer chose pickup/delivery, never
 * include core-only payloads that would drop delivery_method / shipping_cost.
 */
export function buildProgressiveInsertPayloads(row: ShopOrder): InsertPayload[] {
  const core = {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    items: row.items,
    gift_options: row.gift_options,
    total: row.total,
    status: row.status,
  };
  const withShippingLegacy = {
    ...core,
    shipping_required: row.shipping_required,
    shipping_full_name: row.shipping_full_name,
    shipping_phone: row.shipping_phone,
    shipping_city: row.shipping_city,
    shipping_region: row.shipping_region,
    shipping_address: row.shipping_address,
    shipping_postal_code: row.shipping_postal_code,
    shipping_notes: row.shipping_notes,
    shipping_cost: row.shipping_cost,
  };
  const withShippingM9 = {
    ...withShippingLegacy,
    delivery_method: row.delivery_method,
    shipping_region_id: row.shipping_region_id,
    shipping_region_name_ar: row.shipping_region_name_ar,
    shipping_building_number: row.shipping_building_number,
    shipping_neighborhood: row.shipping_neighborhood,
  };
  const insertFull = {
    ...withShippingM9,
    shipping_region_custom: row.shipping_region_custom,
    region_configured: row.region_configured,
    shipping_fee_pending: row.shipping_fee_pending,
    tracking_number: row.tracking_number,
    tracking_url: row.tracking_url,
    internal_shipping_notes: row.internal_shipping_notes,
    carrier_code: row.carrier_code,
    notify_whatsapp: row.notify_whatsapp ?? true,
    notify_email: row.notify_email ?? true,
    ...(row.customer_id ? { customer_id: row.customer_id } : {}),
    ...(row.guest_id ? { guest_id: row.guest_id } : {}),
    ...(row.payment_provider_id
      ? {
          payment_provider_id: row.payment_provider_id,
          payment_status: row.payment_status ?? "unpaid",
        }
      : {}),
  };

  const customerPatch = {
    ...(row.customer_id ? { customer_id: row.customer_id } : {}),
    ...(row.guest_id ? { guest_id: row.guest_id } : {}),
  };

  const shippingTiers: InsertPayload[] = [
    insertFull,
    {
      ...withShippingM9,
      notify_whatsapp: row.notify_whatsapp ?? true,
      notify_email: row.notify_email ?? true,
      ...customerPatch,
    },
    { ...withShippingM9, ...customerPatch },
    {
      ...withShippingLegacy,
      notify_whatsapp: row.notify_whatsapp ?? true,
      notify_email: row.notify_email ?? true,
      ...customerPatch,
    },
    { ...withShippingLegacy, ...customerPatch },
  ];

  // Explicit delivery/pickup: never fall back to core-only (silent data loss).
  if (row.delivery_method === "delivery" || row.delivery_method === "pickup") {
    return shippingTiers;
  }

  return [
    ...shippingTiers,
    {
      ...core,
      notify_whatsapp: row.notify_whatsapp ?? true,
      notify_email: row.notify_email ?? true,
    },
    core,
  ];
}

/** Keys that must survive for delivery orders (backfill target). */
export const DELIVERY_PERSIST_KEYS = [
  "delivery_method",
  "shipping_required",
  "shipping_cost",
  "shipping_fee_pending",
  "shipping_full_name",
  "shipping_phone",
  "shipping_city",
  "shipping_region",
  "shipping_region_id",
  "shipping_region_name_ar",
  "shipping_region_custom",
  "region_configured",
  "shipping_address",
  "shipping_building_number",
  "shipping_neighborhood",
  "shipping_postal_code",
  "shipping_notes",
  "total",
] as const;
