import { resolveCategoryHref } from "@/lib/categories/href";
import { getDressesForCategory } from "@/lib/data/queries";
import { getBridalRobes, getVeils } from "@/lib/data/shop-queries";
import type { Locale } from "@/lib/i18n/types";
import { resolveCategoryLabel } from "@/lib/i18n/category-labels";
import type { Category } from "@/types/category";
import {
  isAccessoriesGroupCategory,
  resolveCategoryProductKind,
} from "@/types/category";

/**
 * Explicit grid occupancy — packed so rows never leave empty cells.
 * Mobile grid is 2 columns; desktop is 3.
 */
export type HomepageEditorialTile = {
  id: string;
  href: string;
  title: string;
  imageUrl: string;
  eyebrow?: string;
  /** Columns occupied on the 2-col mobile grid (1 or 2). */
  mobileSpan: 1 | 2;
  /** Columns occupied on the 3-col desktop grid (1, 2, or 3). */
  desktopSpan: 1 | 2 | 3;
  emphasize?: boolean;
};

type RawTile = Omit<HomepageEditorialTile, "mobileSpan" | "desktopSpan"> & {
  preferFeature?: boolean;
};

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

/**
 * Pack column spans so every row is completely filled (no orphan empty cells).
 * Uses a deliberate wide / standard / feature rhythm, then forces a clean finish.
 */
function packColumnSpans(
  count: number,
  columns: 2 | 3,
  preferFeature: boolean[]
): number[] {
  const spans: number[] = new Array(count).fill(1);
  // Costs always sum in multiples of `columns` so rows close cleanly.
  const pattern =
    columns === 3
      ? [2, 1, 1, 1, 1, 1, 2, 3, 1, 1] // wide+1 | 3×1 | wide | full | 2×1 …
      : [2, 1, 1, 1, 1, 2, 1, 1]; // full | pair | pair | full | pair …

  let col = 0;
  let patternIdx = 0;

  for (let i = 0; i < count; i++) {
    const leftInRow = columns - col;
    const leftTiles = count - i;

    let span = 1;

    if (leftTiles === 1) {
      // Final tile absorbs whatever remains in the row
      span = leftInRow;
    } else if (columns === 3 && leftTiles === 2 && leftInRow === 3) {
      // wide + normal closes a 3-col row with two tiles
      span = 2;
    } else if (col === 0) {
      // New row — pick next rhythm value (feature tiles prefer full width)
      let wish = pattern[patternIdx % pattern.length];
      patternIdx += 1;
      if (preferFeature[i]) {
        wish = columns;
      }
      wish = Math.min(wish, leftInRow, leftTiles);
      // Keep enough tiles to fill the rest of this row
      while (wish > 1 && leftTiles - 1 < leftInRow - wish) {
        wish -= 1;
      }
      span = Math.max(1, wish);
    } else {
      // Mid-row: only standard cells (avoids holes from oversized spans)
      span = 1;
    }

    spans[i] = span;
    col = (col + span) % columns;
  }

  // Safety net — expand the last tile if a row somehow remained open
  if (col !== 0 && count > 0) {
    spans[count - 1] = Math.min(spans[count - 1] + (columns - col), columns);
  }

  return spans;
}

/**
 * Assign mobile + desktop spans with independent packing (both fill completely).
 */
export function composeEditorialLayout(
  raw: RawTile[]
): HomepageEditorialTile[] {
  if (raw.length === 0) return [];

  const prefer = raw.map((t) => Boolean(t.preferFeature));
  const mobile = packColumnSpans(raw.length, 2, prefer);
  const desktop = packColumnSpans(raw.length, 3, prefer);

  return raw.map((tile, i) => {
    const mobileSpan = (mobile[i] === 2 ? 2 : 1) as 1 | 2;
    const desktopSpan = Math.min(Math.max(desktop[i], 1), 3) as 1 | 2 | 3;
    return {
      id: tile.id,
      href: tile.href,
      title: tile.title,
      imageUrl: tile.imageUrl,
      eyebrow: tile.eyebrow,
      mobileSpan,
      desktopSpan,
      emphasize: desktopSpan >= 2 || mobileSpan === 2 || tile.preferFeature,
    };
  });
}

/**
 * Continuous editorial gallery tiles from homepage categories + real product
 * photography. Custom design is omitted (own cinematic band). Never invents URLs.
 */
export async function getHomepageEditorialTiles(
  categories: Category[],
  locale: Locale
): Promise<HomepageEditorialTile[]> {
  const [veils, robes] = await Promise.all([getVeils(), getBridalRobes()]);
  const veilImages = veils.flatMap((v) => uniqueUrls(v.images));
  const robeImages = robes.flatMap((r) => uniqueUrls(r.images));

  const raw: RawTile[] = [];
  const usedUrls = new Set<string>();

  for (const cat of categories) {
    if (isCustomDesignCategory(cat)) continue;
    // Accessories parent becomes the mid-page editorial slideshow — skip static banner tiles.
    if (isAccessoriesGroupCategory(cat)) continue;

    const kind = resolveCategoryProductKind(cat);
    const title = resolveCategoryLabel(cat, locale);
    const href = resolveCategoryHref(cat);
    const isFeatured = cat.featured_collection === true;

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
    const pool = [...(cover ? [cover] : []), ...productImages].filter((url) => {
      if (usedUrls.has(url)) return false;
      usedUrls.add(url);
      return true;
    });

    if (pool.length === 0) continue;

    raw.push({
      id: `cat-${cat.id}`,
      href,
      title,
      imageUrl: pool[0],
      preferFeature: isFeatured,
    });

    const extras = pool.slice(1, isFeatured ? 3 : 2);
    for (let i = 0; i < extras.length; i++) {
      raw.push({
        id: `cat-${cat.id}-photo-${i + 1}`,
        href,
        title,
        imageUrl: extras[i],
        preferFeature: false,
      });
    }
  }

  return composeEditorialLayout(raw);
}
