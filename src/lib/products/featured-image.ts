/**
 * Featured image contract: images[0] is always the featured/thumbnail image.
 * Reordering or "set as featured" must move the chosen URL to index 0.
 */

export function featuredImage(
  images: string[] | null | undefined
): string | undefined {
  if (!images?.length) return undefined;
  return images[0];
}

/** Move `url` to index 0; no-op if missing. */
export function setFeaturedImage(images: string[], url: string): string[] {
  if (!url || images[0] === url) return images;
  const rest = images.filter((u) => u !== url);
  if (rest.length === images.length) return images;
  return [url, ...rest];
}
