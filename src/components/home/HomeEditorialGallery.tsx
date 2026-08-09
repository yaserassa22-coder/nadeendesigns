"use client";

import { HomeEditorialTile } from "@/components/home/HomeEditorialTile";
import type { HomepageEditorialTile as GalleryTile } from "@/lib/home/homepage-editorial-gallery";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type HomeEditorialGalleryProps = {
  tiles: GalleryTile[];
};

function tileFrameClass(tile: GalleryTile): string {
  return cn(
    "relative min-w-0",
    tile.mobileSpan === 2 ? "col-span-2" : "col-span-1",
    tile.desktopSpan === 3 && "lg:col-span-3",
    tile.desktopSpan === 2 && "lg:col-span-2",
    tile.desktopSpan === 1 && "lg:col-span-1"
  );
}

function tileAspectClass(tile: GalleryTile): string {
  if (tile.desktopSpan >= 2 || tile.mobileSpan === 2) {
    return "aspect-square lg:aspect-auto lg:h-full lg:min-h-[16rem]";
  }
  return "aspect-square";
}

/**
 * Post-hero collection gallery — equal tiles + custom design in leftover gap.
 */
export function HomeEditorialGallery({ tiles }: HomeEditorialGalleryProps) {
  const { t } = useLocale();
  if (tiles.length === 0) return null;

  return (
    <section id="categories" className="bg-white pb-8 pt-8 md:pb-12 md:pt-12">
      <div className="w-full px-2 sm:px-3 md:px-4">
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-3 lg:gap-3 lg:auto-rows-fr">
          {tiles.map((tile, index) => {
            const isCustom = tile.variant === "custom";
            return (
              <div key={tile.id} className={tileFrameClass(tile)}>
                <HomeEditorialTile
                  href={tile.href}
                  imageUrl={tile.imageUrl}
                  title={tile.title}
                  eyebrow={tile.eyebrow}
                  ctaLabel={
                    tile.primaryCtaLabel ??
                    (isCustom ? undefined : t.nav.viewCollection)
                  }
                  secondaryHref={tile.secondaryHref}
                  secondaryCtaLabel={tile.secondaryCtaLabel}
                  ctaVariant="quiet"
                  titleSize={isCustom ? "md" : "sm"}
                  priority={index < 4}
                  className="h-full"
                  aspectClassName={tileAspectClass(tile)}
                  emphasize={Boolean(tile.emphasize)}
                  sizes={
                    tile.desktopSpan >= 2 || tile.mobileSpan === 2
                      ? "(max-width: 1024px) 100vw, 66vw"
                      : "(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
