import { slugifyCategory } from "@/types/category";

/** Prefer English name for URL slug; fall back to Arabic-aware slugify. */
export function generateProductSlug(
  nameEn: string,
  nameAr: string,
  fallback = "product"
): string {
  const fromEn = slugifyCategory(nameEn.trim());
  if (fromEn) return fromEn;
  const fromAr = slugifyCategory(nameAr.trim());
  if (fromAr) return fromAr;
  return fallback;
}

/** SKU: ND- + uppercase slug fragment (max 12) + high-entropy random suffix. */
export function generateProductSku(slug: string): string {
  const base = slug
    .replace(/[^a-z0-9\u0600-\u06FF-]/gi, "")
    .replace(/-/g, "")
    .slice(0, 12)
    .toUpperCase();
  // Timestamp + random combo — short base slugs (e.g. single-letter) would
  // otherwise collide often with only a 4-char random tail.
  const timePart = Date.now().toString(36).slice(-4).toUpperCase();
  const randPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  const core = base || "ITEM";
  return `ND-${core}-${timePart}${randPart}`;
}

/** @deprecated Prefer `@/lib/products/pricing` — kept for existing admin imports. */
export { discountPercent } from "@/lib/products/pricing";
