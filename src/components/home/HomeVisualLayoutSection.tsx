"use client";

import { HomeEditorialGallery } from "@/components/home/HomeEditorialGallery";
import { HomeEditorialTile } from "@/components/home/HomeEditorialTile";
import { HomeVisualGridPages } from "@/components/home/HomeVisualGridPages";
import { HomeVisualProductRunway } from "@/components/home/HomeVisualProductRunway";
import type { HomepageEditorialTile } from "@/lib/home/homepage-editorial-gallery";
import {
  isGridScrollLayout,
  isHorizontalScrollLayout,
  type VisualGridLayoutId,
} from "@/lib/home/visual-layout-grid";
import {
  isProductIsolationEnabled,
  isUnifiedBackgroundEnabled,
  unifiedBackgroundStyle,
  unifiedCanvasClassName,
  unifiedTileImageUrl,
  unifiedTilePresentation,
} from "@/lib/home/visual-unified-background";
import { cn } from "@/lib/utils";
import type {
  HomepageEditorialColumns,
  HomepageEditorialGap,
  HomepageEditorialTileSize,
  HomepageVisualLayoutItem,
  VisualUnifiedBackgroundSettings,
} from "@/types/store";

type Props = {
  tiles: HomepageEditorialTile[];
  layoutItems: HomepageVisualLayoutItem[];
  height: number;
  columns?: HomepageEditorialColumns;
  gap?: HomepageEditorialGap;
  tileSize?: HomepageEditorialTileSize;
  unified?: VisualUnifiedBackgroundSettings;
  layoutGrid?: VisualGridLayoutId;
};

function styleFor(item: HomepageVisualLayoutItem) {
  return {
    left: `${item.x}%`,
    top: `${item.y}%`,
    width: `${item.w}%`,
    height: `${item.h}%`,
    zIndex: item.z + 1,
  };
}

export function HomeVisualLayoutSection({
  tiles,
  layoutItems,
  height,
  columns = 3,
  gap = "md",
  tileSize = "md",
  unified,
  layoutGrid = "editorial_split",
}: Props) {
  const tileMap = new Map(tiles.map((tile) => [tile.id, tile]));
  const orderedTiles = layoutItems
    .slice()
    .sort((a, b) => a.z - b.z)
    .map((item) => tileMap.get(item.id))
    .filter((tile): tile is HomepageEditorialTile => Boolean(tile));
  const unifiedOn = isUnifiedBackgroundEnabled(unified);
  const presentation = unifiedTilePresentation(unified);

  if (orderedTiles.length === 0) return null;

  if (isHorizontalScrollLayout(layoutGrid)) {
    return (
      <HomeVisualProductRunway tiles={orderedTiles} unified={unified} />
    );
  }

  if (isGridScrollLayout(layoutGrid)) {
    return <HomeVisualGridPages tiles={orderedTiles} unified={unified} />;
  }

  return (
    <>
      <section
        className={cn(
          "hidden px-2 pb-8 pt-8 lg:block md:px-4 md:pb-12 md:pt-12",
          unifiedOn ? "" : "bg-white"
        )}
      >
        <div
          className={cn(
            "relative mx-auto w-full overflow-hidden",
            unifiedOn
              ? cn("border border-transparent", unifiedCanvasClassName(true))
              : "rounded-[32px] border border-beige-dark/30 bg-white"
          )}
          style={{
            height,
            ...(unifiedOn && unified ? unifiedBackgroundStyle(unified) : {}),
          }}
        >
          {layoutItems
            .slice()
            .sort((a, b) => a.z - b.z)
            .map((item) => {
              const tile = tileMap.get(item.id);
              if (!tile) return null;
              const isCustom = tile.variant === "custom";
              return (
                <div
                  key={item.id}
                  className={cn(
                    "absolute bg-transparent",
                    unifiedOn && presentation.presentation === "float"
                      ? "p-0"
                      : "p-1.5 sm:p-2"
                  )}
                  style={styleFor(item)}
                >
                  <HomeEditorialTile
                    href={tile.href}
                    imageUrl={unifiedTileImageUrl(tile.imageUrl, unified)}
                    originalImageUrl={tile.imageUrl}
                    title={tile.title}
                    eyebrow={tile.eyebrow}
                    ctaLabel={tile.primaryCtaLabel}
                    secondaryHref={tile.secondaryHref}
                    secondaryCtaLabel={tile.secondaryCtaLabel}
                    ctaVariant="quiet"
                    titleSize={isCustom ? "md" : "sm"}
                    className="h-full bg-transparent"
                    aspectClassName="h-full"
                    emphasize={Boolean(tile.emphasize) || isCustom}
                    sizes="100vw"
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
      </section>
      <div className="lg:hidden">
        <HomeEditorialGallery
          tiles={orderedTiles}
          columns={columns}
          gap={gap}
          tileSize={tileSize}
          unified={unified}
        />
      </div>
    </>
  );
}
