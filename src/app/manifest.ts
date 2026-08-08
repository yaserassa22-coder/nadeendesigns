import type { MetadataRoute } from "next";

/**
 * Safe first-version PWA manifest (installable / standalone).
 * No service worker / offline caching by design.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nadeen Designs",
    short_name: "Nadeen",
    description:
      "Nadeen Designs — luxury bridal boutique for wedding dresses, rental, veils, robes, and custom design.",
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#faf8f5",
    theme_color: "#c9a96e",
    lang: "ar",
    dir: "rtl",
    categories: ["shopping", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
