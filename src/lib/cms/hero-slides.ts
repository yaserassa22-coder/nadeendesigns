/**
 * Hero slideshow media — images and/or muted looping videos (CMS).
 * Backward compatible with legacy `hero_image_url` + `hero_image_urls`.
 */

import {
  pickSlideTimingFields,
  type HeroSlideTimingFields,
} from "@/lib/cms/hero-slide-timing";
import {
  normalizeVideoDisplay,
  type HeroVideoDisplay,
} from "@/lib/cms/video-display";

export const HERO_SLIDE_MAX = 4;

export type HeroSlideType = "image" | "video";

export type HeroSlide = {
  type: HeroSlideType;
  /** Image URL or video URL. */
  url: string;
  /** Optional poster/still for video slides. */
  poster_url?: string;
  /** Focal crop, rotation, speed, trim — video slides only. */
  video_display?: HeroVideoDisplay;
  /** Slideshow hold + crossfade (ms). Used when multiple slides. */
  duration_ms?: number;
  transition_ms?: number;
};

export type { HeroVideoDisplay, HeroSlideTimingFields };

export type HeroSlideSettings = {
  hero_image_url?: string | null;
  hero_image_urls?: string[] | null;
  hero_slides?: HeroSlide[] | null;
};

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith("/");
}

function looksLikeVideoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(lower)) return true;
  if (lower.includes("/video/upload/")) return true;
  return false;
}

export function normalizeHeroSlide(raw: unknown): HeroSlide | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const url = typeof item.url === "string" ? item.url.trim() : "";
  if (!url || !isHttpUrl(url)) return null;

  const typeRaw = typeof item.type === "string" ? item.type.trim() : "";
  const type: HeroSlideType =
    typeRaw === "video" || typeRaw === "image"
      ? typeRaw
      : looksLikeVideoUrl(url)
        ? "video"
        : "image";

  const poster =
    typeof item.poster_url === "string" ? item.poster_url.trim() : "";
  const video_display =
    type === "video" ? normalizeVideoDisplay(item.video_display) : undefined;
  const timing = pickSlideTimingFields(item);

  return {
    type,
    url,
    ...(type === "video" && poster ? { poster_url: poster } : {}),
    ...(video_display ? { video_display } : {}),
    ...(timing?.duration_ms !== undefined
      ? { duration_ms: timing.duration_ms }
      : {}),
    ...(timing?.transition_ms !== undefined
      ? { transition_ms: timing.transition_ms }
      : {}),
  };
}

/** CMS draft — keeps empty URL slides while editing (not for storefront). */
export function normalizeHeroSlideDraft(raw: unknown): HeroSlide | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const typeRaw = typeof item.type === "string" ? item.type.trim() : "";
  const type: HeroSlideType = typeRaw === "video" ? "video" : "image";
  const url = typeof item.url === "string" ? item.url.trim() : "";
  if (url && !isHttpUrl(url)) return null;

  const poster =
    typeof item.poster_url === "string" ? item.poster_url.trim() : "";
  const video_display =
    type === "video" ? normalizeVideoDisplay(item.video_display) : undefined;
  const timing = pickSlideTimingFields(item);

  return {
    type,
    url,
    ...(type === "video" && poster ? { poster_url: poster } : {}),
    ...(video_display ? { video_display } : {}),
    ...(timing?.duration_ms !== undefined
      ? { duration_ms: timing.duration_ms }
      : {}),
    ...(timing?.transition_ms !== undefined
      ? { transition_ms: timing.transition_ms }
      : {}),
  };
}

/** Published slides only — drops empty URLs (storefront + save). */
export function normalizeHeroSlides(raw: unknown): HeroSlide[] {
  if (!Array.isArray(raw)) return [];
  const out: HeroSlide[] = [];
  for (const entry of raw) {
    const slide = normalizeHeroSlide(entry);
    if (!slide) continue;
    out.push(slide);
    if (out.length >= HERO_SLIDE_MAX) break;
  }
  return out;
}

/** Admin editor — preserves in-progress slides with no media yet. */
export function normalizeHeroSlidesForCms(raw: unknown): HeroSlide[] {
  if (!Array.isArray(raw)) return [{ type: "image", url: "" }];
  const out: HeroSlide[] = [];
  for (const entry of raw) {
    const slide = normalizeHeroSlideDraft(entry);
    if (!slide) continue;
    out.push(slide);
    if (out.length >= HERO_SLIDE_MAX) break;
  }
  return out.length > 0 ? out : [{ type: "image", url: "" }];
}

/** Build slides from legacy image fields only. */
export function heroSlidesFromLegacyImages(settings: {
  hero_image_url?: string | null;
  hero_image_urls?: string[] | null;
}): HeroSlide[] {
  const primary = settings.hero_image_url?.trim() || "";
  const extras = Array.isArray(settings.hero_image_urls)
    ? settings.hero_image_urls
        .map((u) => (typeof u === "string" ? u.trim() : ""))
        .filter(Boolean)
    : [];

  const seen = new Set<string>();
  const slides: HeroSlide[] = [];
  for (const url of [primary, ...extras]) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    slides.push({
      type: looksLikeVideoUrl(url) ? "video" : "image",
      url,
    });
    if (slides.length >= HERO_SLIDE_MAX) break;
  }
  return slides;
}

/**
 * Resolve storefront hero slides.
 * Prefers typed `hero_slides`; falls back to legacy image URL fields.
 */
export function resolveHeroSlides(settings: HeroSlideSettings): HeroSlide[] {
  const typed = normalizeHeroSlides(settings.hero_slides);
  if (typed.length > 0) return typed;

  const legacy = heroSlidesFromLegacyImages(settings);
  if (legacy.length > 0) return legacy;

  return [{ type: "image", url: "/hero.webp" }];
}

/** @deprecated Prefer resolveHeroSlides — kept for any URL-only callers. */
export function resolveHeroSlideUrls(settings: HeroSlideSettings): string[] {
  return resolveHeroSlides(settings).map((s) => s.url);
}

/**
 * Keep legacy image fields in sync for older readers / social previews.
 * Uses first image slide, else first video poster, else first slide URL when image-like.
 */
export function syncLegacyHeroImageFields(slides: HeroSlide[]): {
  hero_image_url: string;
  hero_image_urls: string[];
} {
  const images = slides
    .filter((s) => s.type === "image")
    .map((s) => s.url.trim())
    .filter(Boolean);
  const videoPoster = slides.find(
    (s) => s.type === "video" && s.poster_url?.trim()
  )?.poster_url?.trim();

  const primary = images[0] || videoPoster || "";
  return {
    hero_image_url: primary || "/hero.webp",
    hero_image_urls: images.slice(1).slice(0, HERO_SLIDE_MAX - 1),
  };
}
