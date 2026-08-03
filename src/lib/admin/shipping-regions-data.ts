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
