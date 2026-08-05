/**
 * Experience Feature Library — reusable capabilities assigned per product.
 * Storefront shows only enabled features for that product (+ purchase flow).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ProductCommerceType } from "@/lib/products/primary-action";
import type { ShopProductType } from "@/types/shop";

export const FEATURE_GROUP_KEYS = [
  "personalization",
  "commerce",
  "gift",
  "delivery",
  "booking",
  "general",
] as const;

export type FeatureGroupKey = (typeof FEATURE_GROUP_KEYS)[number];

export const FEATURE_GROUP_LABELS: Record<FeatureGroupKey, string> = {
  personalization: "التخصيص",
  commerce: "الشراء",
  gift: "الهدايا",
  delivery: "التوصيل",
  booking: "الحجوزات",
  general: "عام",
};

/** Stable feature IDs seeded in migration 040. */
export const SYSTEM_FEATURE_IDS = [
  "veil_writing",
  "robe_writing",
  "font_selection",
  "color_selection",
  "gift_wrap",
  "gift_message",
  "luxury_box",
  "express_delivery",
  "appointment_booking",
  "request_design",
  "add_to_cart",
  "buy_now",
  "wishlist",
] as const;

export type SystemFeatureId = (typeof SYSTEM_FEATURE_IDS)[number];

export type ExperienceFeature = {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  group_key: FeatureGroupKey;
  maps_to: string | null;
  is_system: boolean;
  enabled: boolean;
  sort_order: number;
};

/** Per-product assignment JSONB. */
export type ProductFeaturesConfig = {
  use_custom?: boolean;
  enabled_ids?: string[];
};

const FALLBACK_FEATURES: ExperienceFeature[] = [
  {
    id: "veil_writing",
    name: "Writing on Veil",
    name_ar: "كتابة على الطرحة",
    description: "",
    description_ar: "تخصيص كتابة الطرحة",
    group_key: "personalization",
    maps_to: "personalization",
    is_system: true,
    enabled: true,
    sort_order: 10,
  },
  {
    id: "robe_writing",
    name: "Writing on Robe",
    name_ar: "كتابة على البرنص",
    description: "",
    description_ar: "تخصيص كتابة البرنص",
    group_key: "personalization",
    maps_to: "personalization",
    is_system: true,
    enabled: true,
    sort_order: 20,
  },
  {
    id: "font_selection",
    name: "Font Selection",
    name_ar: "اختيار الخط",
    description: "",
    description_ar: "اختيار خط الكتابة",
    group_key: "personalization",
    maps_to: "personalization",
    is_system: true,
    enabled: true,
    sort_order: 30,
  },
  {
    id: "color_selection",
    name: "Color Selection",
    name_ar: "اختيار اللون",
    description: "",
    description_ar: "اختيار لون الكتابة",
    group_key: "personalization",
    maps_to: "personalization",
    is_system: true,
    enabled: true,
    sort_order: 40,
  },
  {
    id: "gift_wrap",
    name: "Gift Wrap",
    name_ar: "تغليف هدية",
    description: "",
    description_ar: "تغليف فاخر للهدايا",
    group_key: "gift",
    maps_to: "gift_wrap",
    is_system: true,
    enabled: true,
    sort_order: 50,
  },
  {
    id: "gift_message",
    name: "Gift Message",
    name_ar: "رسالة هدية",
    description: "",
    description_ar: "بطاقة تهنئة / رسالة",
    group_key: "gift",
    maps_to: "greeting_card",
    is_system: true,
    enabled: true,
    sort_order: 60,
  },
  {
    id: "luxury_box",
    name: "Luxury Box",
    name_ar: "علبة فاخرة",
    description: "",
    description_ar: "علبة تقديم فاخرة",
    group_key: "gift",
    maps_to: "luxury_box",
    is_system: true,
    enabled: true,
    sort_order: 70,
  },
  {
    id: "express_delivery",
    name: "Express Delivery",
    name_ar: "توصيل سريع",
    description: "",
    description_ar: "خيار توصيل سريع",
    group_key: "delivery",
    maps_to: "express_delivery",
    is_system: true,
    enabled: true,
    sort_order: 80,
  },
  {
    id: "appointment_booking",
    name: "Appointment Booking",
    name_ar: "حجز موعد",
    description: "",
    description_ar: "احجزي موعد معاينة",
    group_key: "booking",
    maps_to: "book_appointment",
    is_system: true,
    enabled: true,
    sort_order: 90,
  },
  {
    id: "request_design",
    name: "Request Design",
    name_ar: "طلب تصميم",
    description: "",
    description_ar: "اطلبي تصميم خاص",
    group_key: "booking",
    maps_to: "request_design",
    is_system: true,
    enabled: true,
    sort_order: 100,
  },
  {
    id: "add_to_cart",
    name: "Add to Cart",
    name_ar: "إضافة للسلة",
    description: "",
    description_ar: "زر أضف إلى السلة",
    group_key: "commerce",
    maps_to: "add_to_cart",
    is_system: true,
    enabled: true,
    sort_order: 110,
  },
  {
    id: "buy_now",
    name: "Buy Now",
    name_ar: "شراء الآن",
    description: "",
    description_ar: "زر شراء فوري",
    group_key: "commerce",
    maps_to: "buy_now",
    is_system: true,
    enabled: true,
    sort_order: 120,
  },
  {
    id: "wishlist",
    name: "Wishlist",
    name_ar: "المفضلة",
    description: "",
    description_ar: "إضافة للمفضلة",
    group_key: "commerce",
    maps_to: "wishlist",
    is_system: true,
    enabled: true,
    sort_order: 130,
  },
];

function isGroupKey(v: unknown): v is FeatureGroupKey {
  return (
    typeof v === "string" &&
    (FEATURE_GROUP_KEYS as readonly string[]).includes(v)
  );
}

function mapRow(row: Record<string, unknown>): ExperienceFeature {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    name_ar: String(row.name_ar ?? row.name ?? ""),
    description: String(row.description ?? ""),
    description_ar: String(row.description_ar ?? ""),
    group_key: isGroupKey(row.group_key) ? row.group_key : "general",
    maps_to: row.maps_to != null ? String(row.maps_to) : null,
    is_system: Boolean(row.is_system),
    enabled: row.enabled !== false,
    sort_order: Number(row.sort_order) || 0,
  };
}

export function normalizeProductFeaturesConfig(
  raw: unknown
): ProductFeaturesConfig | null {
  if (raw == null || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const enabled_ids = Array.isArray(obj.enabled_ids)
    ? obj.enabled_ids.filter((x): x is string => typeof x === "string")
    : [];
  return {
    use_custom: Boolean(obj.use_custom),
    enabled_ids,
  };
}

/**
 * Smart defaults when features_config is null / not custom.
 * Driven by product_type + shop surface — never category names.
 */
export function defaultFeatureIdsForProduct(input: {
  productType?: ProductCommerceType | string | null;
  shopProductType?: ShopProductType | null;
}): string[] {
  const shop = input.shopProductType;
  if (shop === "veil") {
    return [
      "veil_writing",
      "font_selection",
      "color_selection",
      "gift_wrap",
      "gift_message",
      "luxury_box",
      "express_delivery",
      "add_to_cart",
      "buy_now",
      "wishlist",
    ];
  }
  if (shop === "bridal_robe") {
    return [
      "robe_writing",
      "font_selection",
      "color_selection",
      "gift_wrap",
      "gift_message",
      "luxury_box",
      "express_delivery",
      "add_to_cart",
      "buy_now",
      "wishlist",
    ];
  }

  const type = String(input.productType ?? "ready_to_buy");
  if (type === "rental_dress") {
    return ["appointment_booking", "wishlist"];
  }
  if (type === "custom_design") {
    return ["request_design", "wishlist"];
  }
  if (type === "service") {
    return ["appointment_booking"];
  }
  // bridal_accessory | ready_to_buy (cart alias)
  return [
    "gift_wrap",
    "gift_message",
    "luxury_box",
    "express_delivery",
    "add_to_cart",
    "buy_now",
    "wishlist",
  ];
}

/** Resolve enabled feature IDs for a product. */
export function resolveEnabledFeatureIds(input: {
  features_config?: ProductFeaturesConfig | null;
  productType?: ProductCommerceType | string | null;
  shopProductType?: ShopProductType | null;
}): string[] {
  const cfg = normalizeProductFeaturesConfig(input.features_config);
  if (cfg?.use_custom && Array.isArray(cfg.enabled_ids)) {
    return [...cfg.enabled_ids];
  }
  return defaultFeatureIdsForProduct(input);
}

export function isFeatureEnabled(
  enabledIds: readonly string[],
  featureId: string
): boolean {
  return enabledIds.includes(featureId);
}

/** Personalization writing is on when veil/robe writing + font/color allow it. */
export function featuresAllowPersonalization(
  enabledIds: readonly string[],
  shopProductType?: ShopProductType | null
): boolean {
  if (shopProductType === "veil") {
    return isFeatureEnabled(enabledIds, "veil_writing");
  }
  if (shopProductType === "bridal_robe") {
    return isFeatureEnabled(enabledIds, "robe_writing");
  }
  return (
    isFeatureEnabled(enabledIds, "veil_writing") ||
    isFeatureEnabled(enabledIds, "robe_writing")
  );
}

export function featuresAllowGiftWrap(enabledIds: readonly string[]): boolean {
  return isFeatureEnabled(enabledIds, "gift_wrap");
}

export async function listExperienceFeatures(): Promise<ExperienceFeature[]> {
  if (!isSupabaseConfigured()) return FALLBACK_FEATURES;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("experience_features")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      if (/experience_features|PGRST205|42P01/i.test(error.message ?? "")) {
        return FALLBACK_FEATURES;
      }
      console.error("[experience-features] list", error.message);
      return FALLBACK_FEATURES;
    }
    if (!data?.length) return FALLBACK_FEATURES;
    return (data as Record<string, unknown>[]).map(mapRow);
  } catch {
    return FALLBACK_FEATURES;
  }
}

export async function saveExperienceFeature(input: {
  id: string;
  name?: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  group_key?: FeatureGroupKey;
  maps_to?: string | null;
  enabled?: boolean;
  sort_order?: number;
  is_system?: boolean;
}): Promise<ExperienceFeature | null> {
  if (!isSupabaseConfigured() || !input.id.trim()) return null;
  try {
    const supabase = createAdminClient();
    const row = {
      id: input.id.trim(),
      name: input.name ?? "",
      name_ar: input.name_ar ?? input.name ?? "",
      description: input.description ?? "",
      description_ar: input.description_ar ?? "",
      group_key: input.group_key ?? "general",
      maps_to: input.maps_to ?? null,
      enabled: input.enabled !== false,
      sort_order: input.sort_order ?? 0,
      is_system: Boolean(input.is_system),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("experience_features")
      .upsert(row, { onConflict: "id" })
      .select("*")
      .single();
    if (error || !data) {
      console.error("[experience-features] save", error?.message);
      return null;
    }
    return mapRow(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function deleteExperienceFeature(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !id) return false;
  try {
    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from("experience_features")
      .select("is_system")
      .eq("id", id)
      .maybeSingle();
    if (existing && (existing as { is_system?: boolean }).is_system) {
      return false;
    }
    const { error } = await supabase
      .from("experience_features")
      .delete()
      .eq("id", id);
    return !error;
  } catch {
    return false;
  }
}
