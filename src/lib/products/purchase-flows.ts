/**
 * Purchase Flows — admin-configurable CTAs per product_type.
 * Storefront falls back to hardcoded primary-action defaults when DB missing.
 */

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type PurchaseFlowCtaKind =
  | "add_to_cart"
  | "book_appointment"
  | "request_design"
  | "book_now";

export type PurchaseFlow = {
  id: string;
  product_type: string;
  name: string;
  name_ar: string;
  description_ar: string;
  primary_cta: PurchaseFlowCtaKind;
  primary_label_ar: string;
  secondary_ctas: string[];
  hide_cart: boolean;
  hide_buy_now: boolean;
  steps: string[];
  is_system: boolean;
  sort_order: number;
};

const CTA_KINDS: readonly PurchaseFlowCtaKind[] = [
  "add_to_cart",
  "book_appointment",
  "request_design",
  "book_now",
];

function isCtaKind(v: unknown): v is PurchaseFlowCtaKind {
  return typeof v === "string" && (CTA_KINDS as readonly string[]).includes(v);
}

/** Built-in defaults — keep in sync with migration 040 seed. */
export const DEFAULT_PURCHASE_FLOWS: PurchaseFlow[] = [
  {
    id: "flow_rental_dress",
    product_type: "rental_dress",
    name: "Rental Dress",
    name_ar: "فستان إيجار",
    description_ar: "حجز موعد فقط — بدون سلة أو شراء فوري",
    primary_cta: "book_appointment",
    primary_label_ar: "احجزي موعد",
    secondary_ctas: ["wishlist"],
    hide_cart: true,
    hide_buy_now: true,
    steps: ["view", "wishlist", "book_appointment"],
    is_system: true,
    sort_order: 10,
  },
  {
    id: "flow_bridal_accessory",
    product_type: "bridal_accessory",
    name: "Bridal Accessory",
    name_ar: "إكسسوار عروس",
    description_ar: "شراء فوري + سلة + مفضلة",
    primary_cta: "add_to_cart",
    primary_label_ar: "أضف إلى السلة",
    secondary_ctas: ["buy_now", "wishlist"],
    hide_cart: false,
    hide_buy_now: false,
    steps: ["view", "configure", "add_to_cart", "buy_now", "wishlist"],
    is_system: true,
    sort_order: 20,
  },
  {
    id: "flow_ready_to_buy",
    product_type: "ready_to_buy",
    name: "Ready to Buy",
    name_ar: "جاهز للشراء",
    description_ar:
      "Alias لسلوك الشراء مثل الإكسسوارات (سلة + شراء الآن) — فساتين الزفاف/نوف تستخدم rental_dress",
    primary_cta: "add_to_cart",
    primary_label_ar: "أضف إلى السلة",
    secondary_ctas: ["buy_now", "wishlist"],
    hide_cart: false,
    hide_buy_now: false,
    steps: ["view", "configure", "add_to_cart", "buy_now", "wishlist"],
    is_system: true,
    sort_order: 30,
  },
  {
    id: "flow_custom_design",
    product_type: "custom_design",
    name: "Custom Design",
    name_ar: "تصميم خاص",
    description_ar: "طلب تصميم — بدون سلة أو شراء",
    primary_cta: "request_design",
    primary_label_ar: "اطلبي تصميم",
    secondary_ctas: ["wishlist"],
    hide_cart: true,
    hide_buy_now: true,
    steps: ["view", "request_design", "wishlist"],
    is_system: true,
    sort_order: 40,
  },
  {
    id: "flow_service",
    product_type: "service",
    name: "Service",
    name_ar: "خدمة",
    description_ar: "حجز خدمة (مستقبلي)",
    primary_cta: "book_now",
    primary_label_ar: "احجز الآن",
    secondary_ctas: [],
    hide_cart: true,
    hide_buy_now: true,
    steps: ["view", "book_now"],
    is_system: true,
    sort_order: 50,
  },
];

function asStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

function mapRow(row: Record<string, unknown>): PurchaseFlow {
  return {
    id: String(row.id ?? ""),
    product_type: String(row.product_type ?? ""),
    name: String(row.name ?? ""),
    name_ar: String(row.name_ar ?? row.name ?? ""),
    description_ar: String(row.description_ar ?? ""),
    primary_cta: isCtaKind(row.primary_cta) ? row.primary_cta : "add_to_cart",
    primary_label_ar: String(row.primary_label_ar ?? ""),
    secondary_ctas: asStringArray(row.secondary_ctas),
    hide_cart: Boolean(row.hide_cart),
    hide_buy_now: Boolean(row.hide_buy_now),
    steps: asStringArray(row.steps),
    is_system: Boolean(row.is_system),
    sort_order: Number(row.sort_order) || 0,
  };
}

export const listPurchaseFlows = cache(async function listPurchaseFlows(): Promise<
  PurchaseFlow[]
> {
  if (!isSupabaseConfigured()) return DEFAULT_PURCHASE_FLOWS;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("purchase_flows")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      if (/purchase_flows|PGRST205|42P01/i.test(error.message ?? "")) {
        return DEFAULT_PURCHASE_FLOWS;
      }
      console.error("[purchase-flows] list", error.message);
      return DEFAULT_PURCHASE_FLOWS;
    }
    if (!data?.length) return DEFAULT_PURCHASE_FLOWS;
    return (data as Record<string, unknown>[]).map(mapRow);
  } catch {
    return DEFAULT_PURCHASE_FLOWS;
  }
});

export async function getPurchaseFlowForType(
  productType: string
): Promise<PurchaseFlow | null> {
  const flows = await listPurchaseFlows();
  return flows.find((f) => f.product_type === productType) ?? null;
}

export function getDefaultPurchaseFlow(
  productType: string
): PurchaseFlow | null {
  return (
    DEFAULT_PURCHASE_FLOWS.find((f) => f.product_type === productType) ?? null
  );
}

export async function savePurchaseFlow(
  input: Partial<PurchaseFlow> & { id: string; product_type: string }
): Promise<PurchaseFlow | null> {
  if (!isSupabaseConfigured() || !input.id.trim()) return null;
  try {
    const supabase = createAdminClient();
    const row = {
      id: input.id.trim(),
      product_type: input.product_type,
      name: input.name ?? "",
      name_ar: input.name_ar ?? input.name ?? "",
      description_ar: input.description_ar ?? "",
      primary_cta: isCtaKind(input.primary_cta)
        ? input.primary_cta
        : "add_to_cart",
      primary_label_ar: input.primary_label_ar ?? "",
      secondary_ctas: input.secondary_ctas ?? [],
      hide_cart: Boolean(input.hide_cart),
      hide_buy_now: Boolean(input.hide_buy_now),
      steps: input.steps ?? [],
      is_system: Boolean(input.is_system),
      sort_order: input.sort_order ?? 0,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("purchase_flows")
      .upsert(row, { onConflict: "id" })
      .select("*")
      .single();
    if (error || !data) {
      console.error("[purchase-flows] save", error?.message);
      return null;
    }
    return mapRow(data as Record<string, unknown>);
  } catch {
    return null;
  }
}
