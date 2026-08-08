import { resolveCatalogLabel } from "@/lib/i18n/category-labels";
import { localizedName } from "@/lib/i18n/localize";
import type { Locale } from "@/lib/i18n/types";
import type { ShopOrderItem, ShopProductType } from "@/types/shop";

function kindHint(productType: ShopProductType | string | null | undefined): string | null {
  if (!productType) return null;
  if (productType === "bridal-robes" || productType === "bridal_robe") {
    return "bridal_robe";
  }
  if (productType === "veils" || productType === "veil") return "veils";
  if (productType === "dresses" || productType === "dress") return "wedding";
  return String(productType);
}

/** Display name for an order line in the active locale. */
export function resolveOrderLineName(
  item: Pick<ShopOrderItem, "name_ar" | "product_type"> & {
    name_en?: string | null;
    name_he?: string | null;
  },
  locale: Locale
): string {
  if (locale === "he" && item.name_he?.trim()) return item.name_he.trim();
  if (locale === "en" && item.name_en?.trim()) return item.name_en.trim();
  if (locale === "ar" && item.name_ar?.trim()) return item.name_ar.trim();

  const fromCms = localizedName(
    {
      name_ar: item.name_ar,
      name_en: item.name_en,
      name_he: item.name_he,
    },
    locale,
    ""
  );
  if (fromCms && fromCms !== (item.name_ar || "").trim()) return fromCms;

  const mapped = resolveCatalogLabel(item.name_ar, locale, {
    kind: kindHint(item.product_type),
  });
  if (mapped && mapped !== (item.name_ar || "").trim()) return mapped;

  return fromCms || item.name_ar || "";
}

/** Trilingual line for invoices / slips: AR · HE · EN */
export function resolveOrderLineNameTrilingual(
  item: Pick<ShopOrderItem, "name_ar" | "product_type"> & {
    name_en?: string | null;
    name_he?: string | null;
  }
): string {
  const ar = resolveOrderLineName(item, "ar");
  const he = resolveOrderLineName(item, "he");
  const en = resolveOrderLineName(item, "en");
  const parts = [ar, he, en].filter(Boolean);
  // Dedupe when labels match
  return [...new Set(parts)].join(" / ");
}
