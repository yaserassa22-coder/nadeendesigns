/**
 * Non-destructive Cloudinary URL helpers.
 * Original stored URLs are never rewritten in the database.
 */

const CLOUDINARY_HOST = "res.cloudinary.com";

/** Cached CDN transform — PNG delivery with AI background removal (requires add-on). */
export const CLOUDINARY_PRODUCT_ISOLATION_TRANSFORM =
  "f_png,e_background_removal";

export function isCloudinaryImageUrl(src: string): boolean {
  try {
    const url = new URL(src);
    return (
      url.hostname === CLOUDINARY_HOST &&
      url.pathname.includes("/image/upload/")
    );
  } catch {
    return false;
  }
}

/** Strip delivery transforms and return the stored asset URL. */
export function cloudinaryOriginalImageUrl(src: string): string {
  const trimmed = src.trim();
  if (!trimmed || !isCloudinaryImageUrl(trimmed)) return trimmed;

  const marker = "/image/upload/";
  const markerIdx = trimmed.indexOf(marker);
  if (markerIdx < 0) return trimmed;

  const prefix = trimmed.slice(0, markerIdx + marker.length);
  const rest = trimmed.slice(markerIdx + marker.length);
  const versionMatch = rest.match(/(v\d+\/.+)$/);
  if (!versionMatch) return trimmed;

  return `${prefix}${versionMatch[1]}`;
}

function prependCloudinaryTransformSegment(
  src: string,
  segment: string
): string {
  const base = cloudinaryOriginalImageUrl(src);
  if (!base || !isCloudinaryImageUrl(base) || !segment) return src.trim();
  if (base.includes(segment)) return base;
  return base.replace("/image/upload/", `/image/upload/${segment}/`);
}

export function isCloudinaryProductIsolationUrl(src: string): boolean {
  return src.includes("e_background_removal");
}

/**
 * AI product isolation — transparent PNG with background removed.
 * Requires Cloudinary Background Removal add-on (enabled on this account).
 * URL is deterministic and CDN-cached after first generation.
 */
export function withCloudinaryProductIsolation(src: string): string {
  const trimmed = src.trim();
  if (!trimmed || !isCloudinaryImageUrl(trimmed)) return trimmed;
  if (isCloudinaryProductIsolationUrl(trimmed)) return trimmed;
  return prependCloudinaryTransformSegment(
    trimmed,
    CLOUDINARY_PRODUCT_ISOLATION_TRANSFORM
  );
}

/** Restore the original stored asset URL (fallback when isolation fails). */
export function stripCloudinaryProductIsolation(src: string): string {
  return cloudinaryOriginalImageUrl(src);
}

/** @deprecated Studio color replace — not used for product isolation. */
export function stripCloudinaryStudioBlend(src: string): string {
  return src
    .replace(/e_replace_color:[^/]+\/?/g, "")
    .replace(/f_png,e_background_removal\/?/g, "")
    .replace(/e_background_removal\/?/g, "");
}

/** @deprecated Use withCloudinaryProductIsolation instead. */
export function withCloudinaryBackgroundRemoval(src: string): string {
  return withCloudinaryProductIsolation(src);
}

/** @deprecated Not used — real isolation replaces studio blend. */
export function withCloudinaryStudioBackgroundBlend(
  src: string,
  _canvasHex: string
): string {
  return cloudinaryOriginalImageUrl(src);
}

/** Post-grid isolation pipeline at render time only. */
export function withCloudinaryUnifiedProductImage(
  src: string,
  _canvasHex: string,
  useIsolation: boolean
): string {
  const trimmed = src.trim();
  if (!trimmed || !useIsolation) return cloudinaryOriginalImageUrl(trimmed);
  return withCloudinaryProductIsolation(trimmed);
}
