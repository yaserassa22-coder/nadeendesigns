"use client";

import { HomeEditorialGallery } from "@/components/home/HomeEditorialGallery";
import type { HomepageEditorialTile } from "@/lib/home/homepage-editorial-gallery";

type ServicesSectionProps = {
  /** Continuous editorial collection tiles (category entrances + photography). */
  tiles: HomepageEditorialTile[];
};

/**
 * Homepage category collections — one continuous visual gallery.
 */
export function ServicesSection({ tiles }: ServicesSectionProps) {
  return <HomeEditorialGallery tiles={tiles} />;
}
