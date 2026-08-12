"use client";

import { HomeEditorialTile } from "@/components/home/HomeEditorialTile";
import type { HomepageEditorialTile as GalleryTile } from "@/lib/home/homepage-editorial-gallery";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  isProductIsolationEnabled,
  isUnifiedBackgroundEnabled,
  unifiedBackgroundStyle,
  unifiedCanvasClassName,
  unifiedCanvasInsetClassName,
  unifiedGalleryGapClass,
  unifiedTileImageUrl,
  unifiedTilePresentation,
} from "@/lib/home/visual-unified-background";
import { cn } from "@/lib/utils";
import type {
  HomepageEditorialColumns,
  HomepageEditorialGap,
  HomepageEditorialTileSize,
  VisualUnifiedBackgroundSettings,
} from "@/types/store";

type HomeEditorialGalleryProps = {
  tiles: GalleryTile[];
  /** Desktop column count (Admin-managed). Default 3. */
  columns?: HomepageEditorialColumns;
  /** Gutter between tiles. */
  gap?: HomepageEditorialGap;
  /** Tile visual size / aspect. */
  tileSize?: HomepageEditorialTileSize;
  /** Optional shared editorial canvas. Off keeps the existing card grid. */
  unified?: VisualUnifiedBackgroundSettings;
};

function tileFrameClass(tile: GalleryTile): string {
  return cn(
    "relative min-w-0",
    tile.mobileSpan === 2 ? "col-span-2" : "col-span-1",
    tile.desktopSpan === 4 && "lg:col-span-4",
    tile.desktopSpan === 3 && "lg:col-span-3",
    tile.desktopSpan === 2 && "lg:col-span-2",
    tile.desktopSpan === 1 && "lg:col-span-1"
  );
}

function desktopGridClass(columns: HomepageEditorialColumns): string {
  if (columns === 2) return "lg:grid-cols-2";
  if (columns === 4) return "lg:grid-cols-4";
  return "lg:grid-cols-3";
}

function gapClass(gap: HomepageEditorialGap): string {
  switch (gap) {
    case "none":
      return "gap-0";
    case "sm":
      return "gap-1 sm:gap-1.5 lg:gap-2";
    case "lg":
      return "gap-3 sm:gap-4 lg:gap-5";
    case "xl":
      return "gap-4 sm:gap-5 lg:gap-8";
    case "md":
    default:
      return "gap-2 sm:gap-2.5 lg:gap-3";
  }
}

function tileAspectClass(
  tile: GalleryTile,
  tileSize: HomepageEditorialTileSize
): string {
  const tallMin =
    tileSize === "sm"
      ? "lg:min-h-[12rem]"
      : tileSize === "lg"
        ? "lg:min-h-[22rem]"
        : "lg:min-h-[16rem]";

  if (tile.desktopSpan >= 2 || tile.mobileSpan === 2) {
    return cn("aspect-square lg:aspect-auto lg:h-full", tallMin);
  }

  if (tileSize === "sm") return "aspect-[5/4]";
  if (tileSize === "lg") return "aspect-[3/4]";
  return "aspect-square";
}

/**
 * Post-hero collection gallery — Admin-controlled columns, gap, size, pattern.
 */
export function HomeEditorialGallery({
  tiles,
  columns = 3,
  gap = "md",
  tileSize = "md",
  unified,
}: HomeEditorialGalleryProps) {
  const { t } = useLocale();
  if (tiles.length === 0) return null;
  const unifiedOn = isUnifiedBackgroundEnabled(unified);
  const presentation = unifiedTilePresentation(unified);

  return (
    <section
      id="categories"
      className={cn(
        "pb-8 pt-8 md:pb-12 md:pt-12",
        unifiedOn ? "" : "bg-white"
      )}
    >
      <div className="w-full px-2 sm:px-3 md:px-4">
        <div
          className={cn(
            "grid grid-cols-2 lg:auto-rows-fr",
            unifiedOn ? unifiedGalleryGapClass(true) : gapClass(gap),
            desktopGridClass(columns),
            unifiedOn &&
              cn(unifiedCanvasClassName(true), unifiedCanvasInsetClassName(true))
          )}
          style={unifiedOn && unified ? unifiedBackgroundStyle(unified) : undefined}
        >
          {tiles.map((tile, index) => {
            const isCustom = tile.variant === "custom";
            return (
              <div key={tile.id} className={tileFrameClass(tile)}>
                <HomeEditorialTile
                  href={tile.href}
                  imageUrl={unifiedTileImageUrl(tile.imageUrl, unified)}
                  originalImageUrl={tile.imageUrl}
                  title={tile.title}
                  eyebrow={tile.eyebrow}
                  ctaLabel={
                    unifiedOn
                      ? tile.primaryCtaLabel
                      : tile.primaryCtaLabel ??
                        (isCustom ? undefined : t.nav.viewCollection)
                  }
                  secondaryHref={tile.secondaryHref}
                  secondaryCtaLabel={tile.secondaryCtaLabel}
                  ctaVariant="quiet"
                  titleSize={isCustom ? "md" : "sm"}
                  priority={index < 4}
                  className="h-full bg-transparent"
                  aspectClassName={tileAspectClass(tile, tileSize)}
                  emphasize={Boolean(tile.emphasize)}
                  sizes={
                    tile.desktopSpan >= 2 || tile.mobileSpan === 2
                      ? "(max-width: 1024px) 100vw, 66vw"
                      : columns === 4
                        ? "(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                        : columns === 2
                          ? "(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 50vw"
                          : "(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                  }
                  presentation={presentation.presentation}
                  productIsolation={isProductIsolationEnabled(unified)}
                  canvasColor={presentation.canvasColor}
                  imageScale={presentation.imageScale}
                  imageOffsetX={presentation.imageOffsetX}
                  imageOffsetY={presentation.imageOffsetY}
                  dropShadow={presentation.dropShadow}
                  shadowIntensity={presentation.shadowIntensity}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
