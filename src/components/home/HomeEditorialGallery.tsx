"use client";

import { HomeEditorialTile } from "@/components/home/HomeEditorialTile";
import type { HomepageEditorialTile as GalleryTile } from "@/lib/home/homepage-editorial-gallery";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type HomeEditorialGalleryProps = {
  tiles: GalleryTile[];
};

function tileFrameClass(tile: GalleryTile): string {
  // No row-span — holes come from row-span + auto-placement.
  // Explicit column spans only; packer guarantees each breakpoint fills rows.
  return cn(
    "relative min-w-0",
    tile.mobileSpan === 2 ? "col-span-2" : "col-span-1",
    tile.desktopSpan === 3 && "lg:col-span-3",
    tile.desktopSpan === 2 && "lg:col-span-2",
    tile.desktopSpan === 1 && "lg:col-span-1",
    // Shared height rhythm — feature/wide tiles read taller
    tile.desktopSpan === 3 || tile.mobileSpan === 2
      ? "min-h-[72vw] sm:min-h-[46vw] lg:min-h-[32rem]"
      : tile.desktopSpan === 2
        ? "min-h-[58vw] sm:min-h-[40vw] lg:min-h-[28rem]"
        : "min-h-[58vw] sm:min-h-[40vw] lg:min-h-[28rem]"
  );
}

/**
 * Continuous post-hero collection gallery — packed editorial grid, no empty cells.
 */
export function HomeEditorialGallery({ tiles }: HomeEditorialGalleryProps) {
  const { t } = useLocale();
  if (tiles.length === 0) return null;

  return (
    <section id="categories" className="bg-ivory">
      <div className="w-full px-1 sm:px-1.5">
        <div className="grid grid-cols-2 gap-1 sm:gap-1.5 lg:grid-cols-3 lg:gap-1.5">
          {tiles.map((tile, index) => (
            <div key={tile.id} className={tileFrameClass(tile)}>
              <HomeEditorialTile
                href={tile.href}
                imageUrl={tile.imageUrl}
                title={tile.title}
                eyebrow={tile.eyebrow}
                ctaLabel={t.nav.viewCollection}
                ctaVariant="quiet"
                titleSize={tile.emphasize ? "lg" : "md"}
                priority={index < 4}
                className="h-full"
                aspectClassName="h-full min-h-[inherit]"
                sizes={
                  tile.desktopSpan >= 2 || tile.mobileSpan === 2
                    ? "(max-width: 1024px) 100vw, 66vw"
                    : "(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                }
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
