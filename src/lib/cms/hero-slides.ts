/**
 * Resolve hero slideshow URLs from CMS site settings.
 * Preserves primary `hero_image_url` as first slide; appends `hero_image_urls`.
 */
export function resolveHeroSlideUrls(settings: {
  hero_image_url?: string | null;
  hero_image_urls?: string[] | null;
}): string[] {
  const primary = settings.hero_image_url?.trim() || "";
  const extras = Array.isArray(settings.hero_image_urls)
    ? settings.hero_image_urls
        .map((u) => (typeof u === "string" ? u.trim() : ""))
        .filter(Boolean)
    : [];

  const seen = new Set<string>();
  const slides: string[] = [];
  for (const url of [primary, ...extras]) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    slides.push(url);
    if (slides.length >= 4) break;
  }

  if (slides.length === 0) slides.push("/hero.webp");
  return slides;
}
