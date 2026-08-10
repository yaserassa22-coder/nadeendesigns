import { resolveCategoryHref } from "@/lib/categories/href";
import { getDressesForCategory } from "@/lib/data/queries";
import { getBridalRobes, getVeils } from "@/lib/data/shop-queries";
import type { Locale } from "@/lib/i18n/types";
import { resolveCategoryLabel } from "@/lib/i18n/category-labels";
import { getDictionary, localizedName } from "@/lib/i18n";
import { featuredImage } from "@/lib/products/featured-image";
import type { Category } from "@/types/category";
import type { Dress } from "@/types";
import type {
  HomepageEditorialColumns,
  HomepageEditorialPattern,
} from "@/types/store";
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
  desktopSpan: 1 | 2 | 3 | 4;
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

function clampSpan(
  span: number,
  columns: HomepageEditorialColumns
): 1 | 2 | 3 | 4 {
  const n = Math.max(1, Math.min(span, columns)) as 1 | 2 | 3 | 4;
  return n;
}

/** Magazine / spotlight span rhythm over equal base tiles. */
export function applyEditorialPattern(
  tiles: HomepageEditorialTile[],
  pattern: HomepageEditorialPattern,
  columns: HomepageEditorialColumns
): HomepageEditorialTile[] {
  if (pattern === "uniform" || tiles.length === 0) {
    return tiles.map((t) => ({
      ...t,
      mobileSpan: 1 as const,
      desktopSpan: 1 as const,
      emphasize: false,
    }));
  }

  if (pattern === "spotlight") {
    return tiles.map((t, i) => {
      if (i !== 0) {
        return {
          ...t,
          mobileSpan: 1 as const,
          desktopSpan: 1 as const,
          emphasize: false,
        };
      }
      return {
        ...t,
        mobileSpan: 2 as const,
        desktopSpan: clampSpan(Math.min(2, columns), columns),
        emphasize: true,
      };
    });
  }

  // editorial — repeating wide+narrow magazine rhythm
  const cycle: number[] =
    columns >= 4
      ? [2, 1, 1, 1, 1, 1, 1]
      : columns === 2
        ? [2, 1, 1]
        : [2, 1, 1, 1, 1];

  return tiles.map((t, i) => {
    const desktopSpan = clampSpan(cycle[i % cycle.length] ?? 1, columns);
    const mobileSpan: 1 | 2 =
      i % 5 === 0 && tiles.length > 1 ? 2 : 1;
    return {
      ...t,
      mobileSpan,
      desktopSpan,
      emphasize: desktopSpan >= 2,
    };
  });
}

/**
 * Patterned collection/product tiles, then optional custom-design tile sized to
 * fill any leftover last-row gap (mobile 2-col / desktop N-col).
 */
export function composeEditorialLayout(
  raw: RawTile[],
  custom?: RawTile | null,
  columns: HomepageEditorialColumns = 3,
  pattern: HomepageEditorialPattern = "uniform"
): HomepageEditorialTile[] {
  const tiles = applyEditorialPattern(raw.map(toEqualTile), pattern, columns);
  if (!custom) return tiles;

  const n = tiles.reduce((sum, t) => sum + t.desktopSpan, 0);
  const mobileCells = tiles.reduce((sum, t) => sum + t.mobileSpan, 0);
  const mobileSpan: 1 | 2 = mobileCells % 2 === 0 ? 2 : 1;
  const rem = n % columns;
  const desktopSpan = clampSpan(rem === 0 ? columns : columns - rem, columns);

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
  /**
   * Admin-managed tile membership + order (`cat-…`, `dress-…`).
   * When `editorialManual` is true, only listed ids appear (no auto-append).
   * When false/omitted, empty order keeps all candidates (auto mode).
   */
  editorialOrder?: string[];
  editorialManual?: boolean;
  /** Desktop column count (affects leftover custom-tile span). */
  editorialColumns?: HomepageEditorialColumns;
  /** Magazine / spotlight / uniform composition. */
  editorialPattern?: HomepageEditorialPattern;
};

/**
 * Apply admin order.
 * Auto mode (manual=false): empty order → all candidates; non-empty → reorder + append new.
 * Manual mode: only listed ids, in order (supports empty grid).
 */
export function sortTilesByEditorialOrder<T extends { id: string }>(
  tiles: T[],
  order: string[] | null | undefined,
  manual = false
): T[] {
  if (!order?.length) return manual ? [] : tiles;
  const map = new Map(tiles.map((t) => [t.id, t]));
  const sorted: T[] = [];
  const used = new Set<string>();
  for (const id of order) {
    const tile = map.get(id);
    if (!tile || used.has(id)) continue;
    sorted.push(tile);
    used.add(id);
  }
  if (!manual) {
    for (const tile of tiles) {
      if (!used.has(tile.id)) sorted.push(tile);
    }
  }
  return sorted;
}

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
  const columns = options.editorialColumns ?? 3;
  const pattern = options.editorialPattern ?? "uniform";

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

  const ordered = sortTilesByEditorialOrder(
    raw,
    options.editorialOrder,
    Boolean(options.editorialManual)
  );
  return composeEditorialLayout(ordered, customTile, columns, pattern);
}

/** Parse dress UUIDs from editorial tile ids. */
export function parseEditorialDressIds(order: string[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const raw of order) {
    if (!raw.startsWith("dress-")) continue;
    const id = raw.slice("dress-".length).trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/** Parse category UUIDs from editorial tile ids. */
export function parseEditorialCategoryIds(order: string[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const raw of order) {
    if (!raw.startsWith("cat-")) continue;
    const id = raw.slice("cat-".length).trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}
