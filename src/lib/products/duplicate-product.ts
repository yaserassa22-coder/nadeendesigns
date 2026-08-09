import {
  generateProductSku,
  generateProductSlug,
} from "@/lib/products/slug-sku";
import { sanitizeProductFeaturesConfig } from "@/lib/products/experience-features";
import { resolveProductCommerceType } from "@/lib/products/primary-action";
import type { Dress } from "@/types";
import type { BridalRobe, Veil } from "@/types/shop";

/** English copy marker used on primary product names. */
export const COPY_SUFFIX_EN = "(Copy)";
const COPY_SUFFIX_HE = "(עותק)";

const COPY_MARKER_RE = /\s*\((Copy|نسخة|עותק)\)\s*$/i;

function deepCloneJson<T>(value: T): T {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Append a locale-appropriate "(Copy)" marker without stacking duplicates. */
export function withCopyName(
  name: string | null | undefined,
  marker: string
): string {
  const base = (name ?? "").trim();
  if (!base) return `Product ${marker}`;
  if (COPY_MARKER_RE.test(base)) return base;
  return `${base} ${marker}`;
}

/** Independent image URL list — mutating the clone's array never mutates the source row. */
export function cloneImageUrls(images: string[] | null | undefined): string[] {
  return [...(images ?? [])].map((url) => String(url)).filter(Boolean);
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Build a create payload for a new dress row from an existing product.
 * Does not include id, timestamps, soft-delete, or history fields.
 */
export function buildDressDuplicateInsert(
  source: Dress
): Record<string, unknown> {
  const name_ar = withCopyName(source.name_ar, COPY_SUFFIX_EN);
  const name_en = source.name_en?.trim()
    ? withCopyName(source.name_en, COPY_SUFFIX_EN)
    : null;
  const name_he = source.name_he?.trim()
    ? withCopyName(source.name_he, COPY_SUFFIX_HE)
    : null;

  const slugBase = generateProductSlug(
    name_en ?? "",
    name_ar,
    "product"
  );
  const slug = `${slugBase}-copy-${Math.random().toString(36).slice(2, 6)}`;
  const sku = generateProductSku(slug);
  const productType = resolveProductCommerceType(
    source.product_type,
    "ready_to_buy"
  );

  return {
    name_ar,
    name_en,
    name_he,
    description_ar: source.description_ar ?? "",
    short_description: emptyToNull(source.short_description ?? null),
    slug,
    sku,
    category: source.category,
    category_id: source.category_id ?? null,
    collection_id: source.collection_id ?? null,
    product_type: productType,
    order_options_config: deepCloneJson(source.order_options_config ?? null),
    extra_services_config: deepCloneJson(source.extra_services_config ?? null),
    experience_config: deepCloneJson(source.experience_config ?? null),
    features_config: sanitizeProductFeaturesConfig(
      deepCloneJson(source.features_config ?? null),
      { productType }
    ),
    price: source.price ?? null,
    sale_price: source.sale_price ?? null,
    cost_price: source.cost_price ?? null,
    rental_price: source.rental_price ?? null,
    size: source.size ?? null,
    color: source.color ?? null,
    style: source.style ?? null,
    tags: [...(source.tags ?? [])],
    // New product starts as draft so the copy is not live until reviewed
    status: "draft",
    is_available: false,
    is_featured: false,
    images: cloneImageUrls(source.images),
    updated_at: new Date().toISOString(),
  };
}

function buildShopAccessoryDuplicateBase(
  source: Veil | BridalRobe
): Record<string, unknown> {
  return {
    name_ar: withCopyName(source.name_ar, COPY_SUFFIX_EN),
    name_en: source.name_en?.trim()
      ? withCopyName(source.name_en, COPY_SUFFIX_EN)
      : null,
    name_he: source.name_he?.trim()
      ? withCopyName(source.name_he, COPY_SUFFIX_HE)
      : null,
    description_ar: source.description_ar ?? "",
    price: source.price ?? 0,
    sale_price: source.sale_price ?? null,
    images: cloneImageUrls(source.images),
    color: source.color ?? null,
    material: source.material ?? null,
    stock_quantity: source.stock_quantity ?? 0,
    is_featured: false,
    is_available: false,
    product_type: "bridal_accessory",
    order_options_config: deepCloneJson(source.order_options_config ?? null),
    extra_services_config: deepCloneJson(source.extra_services_config ?? null),
    experience_config: deepCloneJson(source.experience_config ?? null),
    features_config: deepCloneJson(source.features_config ?? null),
    updated_at: new Date().toISOString(),
  };
}

export function buildVeilDuplicateInsert(
  source: Veil
): Record<string, unknown> {
  return {
    ...buildShopAccessoryDuplicateBase(source),
    category: source.category || "كلاسيكي",
  };
}

export function buildBridalRobeDuplicateInsert(
  source: BridalRobe
): Record<string, unknown> {
  return {
    ...buildShopAccessoryDuplicateBase(source),
    size: source.size ?? null,
  };
}
