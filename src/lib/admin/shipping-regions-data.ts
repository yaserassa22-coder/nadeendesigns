import type { ShippingRegion } from "@/types/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isMissingTableError } from "@/lib/supabase/errors";

const SEED_REGIONS: ShippingRegion[] = [
  { id: "b1000000-0000-4000-8000-000000000001", name_ar: "الرياض", name_en: "Riyadh", shipping_fee: 35, is_active: true, sort_order: 10 },
  { id: "b1000000-0000-4000-8000-000000000002", name_ar: "جدة", name_en: "Jeddah", shipping_fee: 40, is_active: true, sort_order: 20 },
  { id: "b1000000-0000-4000-8000-000000000003", name_ar: "الدمام", name_en: "Dammam", shipping_fee: 45, is_active: true, sort_order: 30 },
  { id: "b1000000-0000-4000-8000-000000000004", name_ar: "مكة", name_en: "Makkah", shipping_fee: 40, is_active: true, sort_order: 40 },
  { id: "b1000000-0000-4000-8000-000000000005", name_ar: "المدينة", name_en: "Madinah", shipping_fee: 45, is_active: true, sort_order: 50 },
  { id: "b1000000-0000-4000-8000-000000000006", name_ar: "القصيم", name_en: "Qassim", shipping_fee: 50, is_active: true, sort_order: 60 },
  { id: "b1000000-0000-4000-8000-000000000007", name_ar: "تبوك", name_en: "Tabuk", shipping_fee: 55, is_active: true, sort_order: 70 },
  { id: "b1000000-0000-4000-8000-000000000008", name_ar: "أبها", name_en: "Abha", shipping_fee: 55, is_active: true, sort_order: 80 },
  { id: "b1000000-0000-4000-8000-000000000009", name_ar: "حائل", name_en: "Hail", shipping_fee: 55, is_active: true, sort_order: 90 },
  { id: "b1000000-0000-4000-8000-000000000010", name_ar: "الطائف", name_en: "Taif", shipping_fee: 45, is_active: true, sort_order: 100 },
  { id: "b1000000-0000-4000-8000-000000000011", name_ar: "أخرى", name_en: "Other", shipping_fee: 60, is_active: true, sort_order: 110 },
];

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
