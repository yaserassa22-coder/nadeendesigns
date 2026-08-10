"use client";

import { HomeEditorialGallery } from "@/components/home/HomeEditorialGallery";
import type { HomepageEditorialTile } from "@/lib/home/homepage-editorial-gallery";
import type {
  HomepageEditorialColumns,
  HomepageEditorialGap,
  HomepageEditorialTileSize,
} from "@/types/store";

type ServicesSectionProps = {
  /** Continuous editorial collection tiles (category entrances + photography). */
  tiles: HomepageEditorialTile[];
  columns?: HomepageEditorialColumns;
  gap?: HomepageEditorialGap;
  tileSize?: HomepageEditorialTileSize;
};

/**
 * Homepage category collections — one continuous visual gallery.
 */
export function ServicesSection({
  tiles,
  columns,
  gap,
  tileSize,
}: ServicesSectionProps) {
  return (
    <HomeEditorialGallery
      tiles={tiles}
      columns={columns}
      gap={gap}
      tileSize={tileSize}
    />
  );
}
