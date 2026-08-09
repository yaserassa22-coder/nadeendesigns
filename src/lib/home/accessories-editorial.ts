import { getBridalAccessoriesProducts } from "@/lib/data/shop-queries";
import { featuredImage } from "@/lib/products/featured-image";
import { localizedName } from "@/lib/i18n/localize";
import type { Locale } from "@/lib/i18n/types";

export type AccessoriesEditorialSlide = {
  id: string;
  href: string;
  name: string;
  imageUrl: string;
};

/**
 * Mid-page Accessories editorial slideshow slides.
 * Source of truth: published veil + bridal-robe products (no hardcoded IDs).
 * Uses primary product image (`images[0]`). Skips products without imagery.
 */
export async function getAccessoriesEditorialSlides(
  locale: Locale
): Promise<AccessoriesEditorialSlide[]> {
  const products = await getBridalAccessoriesProducts();
  const slides: AccessoriesEditorialSlide[] = [];

  for (const product of products) {
    const imageUrl = featuredImage(product.images)?.trim();
    if (!imageUrl) continue;
    slides.push({
      id: `${product.kind}-${product.id}`,
      href: product.href,
      name: localizedName(product, locale, product.name_ar),
      imageUrl,
    });
  }

  return slides;
}
