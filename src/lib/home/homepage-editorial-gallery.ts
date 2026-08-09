import { resolveCategoryHref } from "@/lib/categories/href";
import { getDressesForCategory } from "@/lib/data/queries";
import { getBridalRobes, getVeils } from "@/lib/data/shop-queries";
import type { Locale } from "@/lib/i18n/types";
import { resolveCategoryLabel } from "@/lib/i18n/category-labels";
import { getDictionary, localizedName } from "@/lib/i18n";
import { featuredImage } from "@/lib/products/featured-image";
import type { Category } from "@/types/category";
import type { Dress } from "@/types";
import {
  isAccessoriesGroupCategory,
  resolveCategoryProductKind,
} from "@/types/category";

/**
 * Grid occupancy — standard tiles are 1 cell; custom design may span
 * leftover last-row columns so no empty ivory/white hole remains.
 */
export type HomepageEditorialTile = {
  id: string;
  href: string;
  title: string;
  imageUrl: string;
  eyebrow?: string;
  mobileSpan: 1 | 2;
  desktopSpan: 1 | 2 | 3;
  emphasize?: boolean;
  /** Custom-design tile: dual CTAs (journey + booking). */
  variant?: "default" | "custom";
  secondaryHref?: string;
  secondaryCtaLabel?: string;
  primaryCtaLabel?: string;
};

type RawTile = Omit<HomepageEditorialTile, "mobileSpan" | "desktopSpan">;

function isCustomDesignCategory(cat: Category): boolean {
  const kind = resolveCategoryProductKind(cat);
  if (kind === "dress" && cat.legacy_key === "custom_design") return true;
  const key = (cat.legacy_key || cat.slug || "").toLowerCase();
  return key === "custom_design" || key === "custom-design" || key === "custom";
}

function uniqueUrls(images: string[] | null | undefined): string[] {
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

function categoryCover(cat: Category): string | null {
  return (
    cat.cover_image_url?.trim() ||
    cat.seo_og_image_url?.trim() ||
    cat.icon_url?.trim() ||
    null
  );
}

function toEqualTile(tile: RawTile): HomepageEditorialTile {
  return {
    ...tile,
    mobileSpan: 1,
    desktopSpan: 1,
    emphasize: false,
    variant: tile.variant ?? "default",
  };
}

/**
 * Equal collection/product tiles, then optional custom-design tile sized to
 * fill any leftover last-row gap (desktop 3-col / mobile 2-col).
 */
export function composeEditorialLayout(
  raw: RawTile[],
  custom?: RawTile | null
): HomepageEditorialTile[] {
  const tiles = raw.map(toEqualTile);
  if (!custom) return tiles;

  const n = tiles.length;
  const mobileSpan: 1 | 2 = n % 2 === 0 ? 2 : 1;
  const rem = n % 3;
  const desktopSpan: 1 | 2 | 3 =
    rem === 0 ? 3 : rem === 1 ? 2 : 1;

  tiles.push({
    ...custom,
    mobileSpan,
    desktopSpan,
    emphasize: true,
    variant: "custom",
  });

  return tiles;
}

export type HomepageEditorialOptions = {
  /** Featured dresses folded into the post-hero grid (no separate section). */
  featuredDresses?: Dress[];
  /** Custom design folded into leftover last-row space (no separate band). */
  customDesign?: {
    imageUrl: string | null;
  } | null;
};

/**
 * Continuous editorial gallery: categories + featured dresses + optional
 * custom-design gap fill. Never invents image URLs.
 */
export async function getHomepageEditorialTiles(
  categories: Category[],
  locale: Locale,
  options: HomepageEditorialOptions = {}
): Promise<HomepageEditorialTile[]> {
  const [veils, robes] = await Promise.all([getVeils(), getBridalRobes()]);
  const veilImages = veils.flatMap((v) => uniqueUrls(v.images));
  const robeImages = robes.flatMap((r) => uniqueUrls(r.images));
  const dict = getDictionary(locale);

  const raw: RawTile[] = [];
  const usedUrls = new Set<string>();

  for (const cat of categories) {
    if (isCustomDesignCategory(cat)) continue;
    if (isAccessoriesGroupCategory(cat)) continue;

    const kind = resolveCategoryProductKind(cat);
    const title = resolveCategoryLabel(cat, locale);
    const href = resolveCategoryHref(cat);

    let productImages: string[] = [];
    if (kind === "veil") {
      productImages = veilImages;
    } else if (kind === "bridal_robe") {
      productImages = robeImages;
    } else {
      const dresses = await getDressesForCategory(cat);
      productImages = dresses.flatMap((d) => uniqueUrls(d.images));
    }

    const cover = categoryCover(cat);
    const candidates = [...(cover ? [cover] : []), ...productImages];
    const imageUrl = candidates.find((url) => {
      const trimmed = url?.trim();
      return Boolean(trimmed) && !usedUrls.has(trimmed);
    });

    if (!imageUrl) continue;
    usedUrls.add(imageUrl);

    raw.push({
      id: `cat-${cat.id}`,
      href,
      title,
      imageUrl,
    });
  }

  for (const dress of options.featuredDresses ?? []) {
    const imageUrl = featuredImage(dress.images)?.trim();
    if (!imageUrl || usedUrls.has(imageUrl)) continue;
    usedUrls.add(imageUrl);

    raw.push({
      id: `dress-${dress.id}`,
      href: `/dresses/${dress.id}`,
      title: localizedName(dress, locale, dress.name_ar),
      imageUrl,
    });
  }

  const customOpt = options.customDesign;
  const customTile: RawTile | null = customOpt
    ? {
        id: "custom-design",
        href: "/custom-design",
        title: dict.nav.customDesign,
        eyebrow: dict.home.customEyebrow,
        imageUrl: customOpt.imageUrl?.trim() || "",
        variant: "custom",
        primaryCtaLabel: dict.home.customStartCta,
        secondaryHref: "/booking?service=custom_design",
        secondaryCtaLabel: dict.home.customBookCta,
      }
    : null;

  return composeEditorialLayout(raw, customTile);
}
