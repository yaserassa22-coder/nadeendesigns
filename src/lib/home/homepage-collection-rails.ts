import { resolveCategoryHref } from "@/lib/categories/href";
import { getDressesForCategory } from "@/lib/data/queries";
import { getBridalRobes, getVeils } from "@/lib/data/shop-queries";
import type { Locale } from "@/lib/i18n/types";
import { localizedName } from "@/lib/i18n/localize";
import { resolveCategoryLabel } from "@/lib/i18n/category-labels";
import type { Category } from "@/types/category";
import {
  isAccessoriesGroupCategory,
  resolveCategoryProductKind,
} from "@/types/category";
import type { HomeCollectionItem } from "@/components/home/HomeCollectionSection";

/** Target cards per category band — keeps a balanced 3-up desktop grid. */
const PER_SECTION = 3;

export type HomepageCollectionRail = {
  id: string;
  title: string;
  href: string;
  items: HomeCollectionItem[];
};

function isCustomDesignCategory(cat: Category): boolean {
  const kind = resolveCategoryProductKind(cat);
  if (kind === "dress" && cat.legacy_key === "custom_design") return true;
  const key = (cat.legacy_key || cat.slug || "").toLowerCase();
  return key === "custom_design" || key === "custom-design" || key === "custom";
}

function uniqueImageUrls(images: string[] | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of images ?? []) {
    const url = raw?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

/**
 * Build up to `target` cards from real product imagery.
 * Prefers distinct products, then additional photos from those products
 * (never invents URLs).
 */
function fillFromProducts(
  products: Array<{
    id: string;
    href: string;
    title: string;
    images: string[];
    wishlist: HomeCollectionItem["wishlist"];
  }>,
  target: number
): HomeCollectionItem[] {
  const items: HomeCollectionItem[] = [];
  const usedUrls = new Set<string>();

  for (const product of products) {
    if (items.length >= target) break;
    const urls = uniqueImageUrls(product.images);
    const cover = urls[0];
    if (!cover || usedUrls.has(cover)) continue;
    usedUrls.add(cover);
    items.push({
      id: `${product.id}-0`,
      href: product.href,
      title: product.title,
      imageUrl: cover,
      wishlist: product.wishlist,
    });
  }

  for (const product of products) {
    if (items.length >= target) break;
    const urls = uniqueImageUrls(product.images).slice(1);
    for (let i = 0; i < urls.length; i++) {
      if (items.length >= target) break;
      const url = urls[i];
      if (usedUrls.has(url)) continue;
      usedUrls.add(url);
      items.push({
        id: `${product.id}-extra-${i + 1}`,
        href: product.href,
        title: product.title,
        imageUrl: url,
        wishlist: product.wishlist,
      });
    }
  }

  return items;
}

function maybeAddCover(
  items: HomeCollectionItem[],
  cat: Category,
  href: string,
  title: string,
  target: number
): HomeCollectionItem[] {
  if (items.length >= target) return items;
  const cover = cat.cover_image_url?.trim();
  if (!cover) return items;
  if (items.some((item) => item.imageUrl === cover)) return items;
  return [
    ...items,
    {
      id: `cover-${cat.id}`,
      href,
      title,
      imageUrl: cover,
    },
  ].slice(0, target);
}

/**
 * Build one homepage rail per major category — products only, no shared grid.
 * Skips accessories_group container and custom_design (own editorial section).
 * Each rail aims for 3 visual cards so the layout never collapses to one tall image.
 */
export async function getHomepageCollectionRails(
  categories: Category[],
  locale: Locale
): Promise<HomepageCollectionRail[]> {
  const [veils, robes] = await Promise.all([getVeils(), getBridalRobes()]);

  const veilProducts = veils.map((v) => ({
    id: v.id,
    href: `/veils/${v.id}`,
    title: localizedName(
      { name_ar: v.name_ar, name_en: v.name_en, name_he: v.name_he },
      locale,
      v.name_ar
    ),
    images: v.images ?? [],
    wishlist: {
      productKind: "veil" as const,
      productId: v.id,
      productSlug: v.id,
      price: v.price,
      salePrice: v.sale_price,
      nameAr: v.name_ar,
      nameEn: v.name_en,
      nameHe: v.name_he,
    },
  }));

  const robeProducts = robes.map((r) => ({
    id: r.id,
    href: `/robes/${r.id}`,
    title: localizedName(
      { name_ar: r.name_ar, name_en: r.name_en, name_he: r.name_he },
      locale,
      r.name_ar
    ),
    images: r.images ?? [],
    wishlist: {
      productKind: "bridal_robe" as const,
      productId: r.id,
      productSlug: r.id,
      price: r.price,
      salePrice: r.sale_price,
      nameAr: r.name_ar,
      nameEn: r.name_en,
      nameHe: r.name_he,
    },
  }));

  const rails: HomepageCollectionRail[] = [];

  for (const cat of categories) {
    if (isAccessoriesGroupCategory(cat)) continue;
    if (isCustomDesignCategory(cat)) continue;

    const kind = resolveCategoryProductKind(cat);
    const title = resolveCategoryLabel(cat, locale);
    const href = resolveCategoryHref(cat);

    let items: HomeCollectionItem[] = [];

    if (kind === "veil") {
      items = fillFromProducts(veilProducts, PER_SECTION);
    } else if (kind === "bridal_robe") {
      items = fillFromProducts(robeProducts, PER_SECTION);
    } else {
      const dresses = await getDressesForCategory(cat);
      items = fillFromProducts(
        dresses.map((d) => ({
          id: d.id,
          href: `/dresses/${d.id}`,
          title: localizedName(d, locale, d.name_ar),
          images: d.images ?? [],
          wishlist: {
            productKind: "dress",
            productId: d.id,
            productSlug: d.id,
            price: d.price,
            salePrice: d.sale_price,
            nameAr: d.name_ar,
            nameEn: d.name_en,
            nameHe: d.name_he,
          },
        })),
        PER_SECTION
      );
    }

    items = maybeAddCover(items, cat, href, title, PER_SECTION);

    // Skip empty / single-card bands that collapse into one oversized image.
    if (items.length < 2) continue;

    rails.push({ id: cat.id, title, href, items: items.slice(0, PER_SECTION) });
  }

  return rails;
}
