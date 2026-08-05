/**
 * Server-side order line pricing (Sprint 2A).
 * Never trust client unit_price / extra service prices / order total.
 */

import {
  buildLineExtraServices,
  buildLineOrderOptions,
  enabledOrderOptions,
  lineChargedTotal,
  resolveProductExtraServices,
  type ExtraServiceConfig,
  type LineExtraService,
  type LineOrderOptionValue,
  type OrderOptionConfig,
  type OrderOptionKey,
  type ProductExtraServicesConfig,
  type ProductOrderOptionsConfig,
  type ServiceOfferContext,
} from "@/lib/products/order-experience";
import {
  normalizeProductExperienceConfig,
  type ProductExperienceConfig,
} from "@/lib/products/experience-designer";
import { resolveProductPricing } from "@/lib/products/pricing";
import { getStoreSettings } from "@/lib/store/settings";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ShopOrderItem, ShopProductType } from "@/types/shop";

export type CheckoutLineInput = {
  product_type: ShopProductType;
  product_id: string;
  name_ar: string;
  unit_price: number;
  quantity: number;
  image?: string | null;
  personalization?: ShopOrderItem["personalization"];
  gift_options?: ShopOrderItem["gift_options"];
  order_options?: LineOrderOptionValue[] | null;
  extra_services?: LineExtraService[] | null;
  personalization_fee?: number | null;
  requires_shipping?: boolean | null;
};

type CatalogProduct = {
  id: string;
  name_ar: string;
  price: number;
  sale_price?: number | null;
  product_type?: string | null;
  category_id?: string | null;
  collection_id?: string | null;
  order_options_config?: ProductOrderOptionsConfig | null;
  extra_services_config?: ProductExtraServicesConfig | null;
  experience_config?: ProductExperienceConfig | null;
  is_available?: boolean | null;
};

export type RecalculatedOrderLines = {
  items: ShopOrderItem[];
  itemsSubtotal: number;
};

async function loadCatalogProduct(
  productType: ShopProductType,
  productId: string
): Promise<CatalogProduct | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createAdminClient();
    const table =
      productType === "veil"
        ? "veils"
        : productType === "bridal_robe"
          ? "bridal_robes"
          : "dresses";
    const { data, error } = await supabase
      .from(table)
      .select(
        "id, name_ar, price, sale_price, product_type, category_id, collection_id, order_options_config, extra_services_config, experience_config, is_available"
      )
      .eq("id", productId)
      .maybeSingle();
    if (error) {
      // veils/robes may lack sale_price / category / experience columns
      if (/sale_price|order_options_config|extra_services_config|experience_config|category_id|collection_id|product_type|PGRST204|42703/i.test(
        error.message ?? ""
      )) {
        const retry = await supabase
          .from(table)
          .select("id, name_ar, price, is_available")
          .eq("id", productId)
          .maybeSingle();
        if (retry.error || !retry.data) return null;
        const row = retry.data as {
          id: string;
          name_ar: string;
          price: number;
          is_available?: boolean | null;
        };
        return {
          id: row.id,
          name_ar: row.name_ar,
          price: Number(row.price) || 0,
          sale_price: null,
          product_type:
            productType === "veil" || productType === "bridal_robe"
              ? "bridal_accessory"
              : null,
          category_id: null,
          collection_id: null,
          order_options_config: null,
          extra_services_config: null,
          experience_config: null,
          is_available: row.is_available,
        };
      }
      return null;
    }
    if (!data) return null;
    const row = data as CatalogProduct;
    return {
      id: row.id,
      name_ar: row.name_ar,
      price: Number(row.price) || 0,
      sale_price:
        row.sale_price != null && Number.isFinite(Number(row.sale_price))
          ? Number(row.sale_price)
          : null,
      product_type: row.product_type ?? null,
      category_id: row.category_id ?? null,
      collection_id: row.collection_id ?? null,
      order_options_config: row.order_options_config ?? null,
      extra_services_config: row.extra_services_config ?? null,
      experience_config: row.experience_config ?? null,
      is_available: row.is_available,
    };
  } catch {
    return null;
  }
}

function optionsFromClientLine(
  enabled: OrderOptionConfig[],
  client: LineOrderOptionValue[] | null | undefined
): LineOrderOptionValue[] {
  if (!client?.length || !enabled.length) return [];
  const values: Partial<Record<OrderOptionKey, string>> = {};
  for (const row of client) {
    if (!row || typeof row.key !== "string") continue;
    if (typeof row.value === "string" && row.value.trim()) {
      values[row.key as OrderOptionKey] = row.value;
    }
  }
  return buildLineOrderOptions(enabled, values);
}

function extrasFromClientLine(
  available: ExtraServiceConfig[],
  client: LineExtraService[] | null | undefined
): LineExtraService[] {
  if (!client?.length || !available.length) return [];
  const ids = client
    .map((s) => (s && typeof s.id === "string" ? s.id : ""))
    .filter(Boolean);
  return buildLineExtraServices(available, ids);
}

/**
 * Recalculate every line from catalog + store config.
 * Falls back to client base price only when catalog row is missing (seed/dev).
 */
export async function recalculateCheckoutLines(
  lines: CheckoutLineInput[]
): Promise<RecalculatedOrderLines> {
  const store = await getStoreSettings(true);
  const items: ShopOrderItem[] = [];
  let itemsSubtotal = 0;

  for (const line of lines) {
    const catalog = await loadCatalogProduct(line.product_type, line.product_id);
    const pricing = resolveProductPricing({
      price: catalog?.price ?? line.unit_price,
      salePrice: catalog?.sale_price ?? null,
    });
    const baseUnit =
      pricing.currentPrice != null && Number.isFinite(pricing.currentPrice)
        ? pricing.currentPrice
        : Math.max(0, Number(line.unit_price) || 0);

    const enabledOpts = enabledOrderOptions(
      store.order_options,
      catalog?.order_options_config
    );
    const offerCtx: ServiceOfferContext = {
      productId: line.product_id,
      shopProductType: line.product_type,
      productType:
        catalog?.product_type ??
        (line.product_type === "veil" || line.product_type === "bridal_robe"
          ? "bridal_accessory"
          : null),
      categoryId: catalog?.category_id ?? null,
      collectionId: catalog?.collection_id ?? null,
      channel: "online",
    };
    const availableExtras = resolveProductExtraServices(
      store.extra_services,
      catalog?.extra_services_config,
      offerCtx
    );

    const orderOptions = optionsFromClientLine(enabledOpts, line.order_options);
    const extraServices = extrasFromClientLine(
      availableExtras,
      line.extra_services
    );
    // Charge catalog personalization fee when the line has personalization.
    // Never trust client personalization_fee — read from experience_config.
    const persUi = catalog?.experience_config
      ? normalizeProductExperienceConfig(catalog.experience_config)
          .personalization_ui
      : null;
    const personalizationFee =
      line.personalization && persUi
        ? Math.max(0, Number(persUi.extra_price) || 0)
        : 0;

    const quantity = Math.max(1, Math.min(20, Math.floor(Number(line.quantity) || 1)));
    const lineTotal = lineChargedTotal({
      baseUnitPrice: baseUnit,
      quantity,
      personalizationFee,
      extraServices,
    });
    itemsSubtotal += lineTotal;

    items.push({
      product_type: line.product_type,
      product_id: line.product_id,
      name_ar: (catalog?.name_ar || line.name_ar || "").trim() || line.name_ar,
      unit_price: baseUnit,
      quantity,
      image: line.image ?? undefined,
      personalization: line.personalization ?? null,
      gift_options: line.gift_options ?? null,
      order_options: orderOptions.length ? orderOptions : null,
      extra_services: extraServices.length ? extraServices : null,
      personalization_fee: personalizationFee > 0 ? personalizationFee : null,
      requires_shipping:
        line.requires_shipping === true
          ? true
          : line.requires_shipping === false
            ? false
            : undefined,
    });
  }

  return { items, itemsSubtotal };
}
