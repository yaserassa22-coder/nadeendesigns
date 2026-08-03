import type { ShippingRegion } from "@/types/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isMissingTableError } from "@/lib/supabase/errors";
import { SEED_SHIPPING_REGIONS } from "@/lib/shop/shipping-region-seeds";

const SEED_REGIONS = SEED_SHIPPING_REGIONS;

export type UnknownShippingRegionHint = {
  text: string;
  orderCount: number;
  sampleOrderId: string | null;
};

export async function getAdminShippingRegions(): Promise<ShippingRegion[]> {
  if (!isSupabaseConfigured()) return SEED_REGIONS;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("shipping_regions")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    if (isMissingTableError(error, "shipping_regions")) {
      console.warn("[getAdminShippingRegions] table missing — seed fallback");
      return SEED_REGIONS;
    }
    console.error("[getAdminShippingRegions]", error);
    return SEED_REGIONS;
  }
  return (data as ShippingRegion[]) ?? SEED_REGIONS;
}

/** Distinct custom / unknown regions from orders awaiting fee review. */
export async function getUnknownShippingRegionHints(): Promise<
  UnknownShippingRegionHint[]
> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("shop_orders")
    .select(
      "id, shipping_region_custom, shipping_region, shipping_region_name_ar, shipping_fee_pending, region_configured"
    )
    .eq("delivery_method", "delivery")
    .or("shipping_fee_pending.eq.true,region_configured.eq.false")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    if (
      isMissingTableError(error, "shop_orders") ||
      /shipping_fee_pending|region_configured|shipping_region_custom|column/i.test(
        error.message ?? ""
      )
    ) {
      console.warn(
        "[getUnknownShippingRegionHints] M10 columns missing — run APPLY_SMART_SHIPPING.sql"
      );
      return [];
    }
    console.error("[getUnknownShippingRegionHints]", error);
    return [];
  }

  const map = new Map<string, UnknownShippingRegionHint>();
  for (const row of data ?? []) {
    const text = (
      row.shipping_region_custom ||
      row.shipping_region_name_ar ||
      row.shipping_region ||
      ""
    ).trim();
    if (!text) continue;
    const key = text.toLowerCase();
    const prev = map.get(key);
    if (prev) {
      prev.orderCount += 1;
    } else {
      map.set(key, {
        text,
        orderCount: 1,
        sampleOrderId: row.id ?? null,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.text.localeCompare(b.text, "ar")
  );
}
