/**
 * Cloudinary video URLs — play originals (no delivery re-encode).
 * Re-encoding via q_auto/w_* transforms was reducing quality for PC uploads.
 */

const CLOUDINARY_VIDEO_UPLOAD_RE =
  /^(https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\/)(.+)$/i;

export type VideoDeliveryProfile = "hero" | "card" | "none";

/** Return the stored upload URL — no on-the-fly Cloudinary transforms. */
export function buildCloudinaryVideoDeliveryUrl(
  src: string,
  _options?: { profile?: VideoDeliveryProfile; maxWidth?: number }
): string {
  return src.trim();
}

export function heroVideoMaxWidth(): number {
  return 3840;
}

export function buildResponsiveHeroVideoUrl(src: string): string {
  return src.trim();
}

/** Strip accidental delivery transforms so CMS stores/uses the original asset. */
export function cloudinaryVideoOriginalUrl(src: string): string {
  const trimmed = src.trim();
  const match = trimmed.match(CLOUDINARY_VIDEO_UPLOAD_RE);
  if (!match) return trimmed;

  const [, prefix, rest] = match;
  const segments = rest.split("/");

  while (segments.length > 1) {
    const head = segments[0] ?? "";
    const isTransform =
      head.includes(",") ||
      (/^[a-z0-9_:-]+$/i.test(head) &&
        /^(q_|w_|h_|c_|f_|br_|vc_|sp_|fl_|g_|so_|eo_)/i.test(head));
    if (!isTransform) break;
    segments.shift();
  }

  return `${prefix}${segments.join("/")}`;
}
