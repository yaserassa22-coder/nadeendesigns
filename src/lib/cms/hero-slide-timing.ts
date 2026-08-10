/**
 * Per-slide hero slideshow timing — display hold + crossfade transition.
 */

export const DEFAULT_HERO_SLIDE_DURATION_MS = 6000;
export const DEFAULT_HERO_SLIDE_TRANSITION_MS = 1200;

export const HERO_SLIDE_DURATION_MIN_MS = 2000;
export const HERO_SLIDE_DURATION_MAX_MS = 30000;
export const HERO_SLIDE_TRANSITION_MIN_MS = 0;
/** Up to 15s — slow luxury crossfades. */
export const HERO_SLIDE_TRANSITION_MAX_MS = 15000;

export type HeroSlideTimingFields = {
  /** How long this slide stays visible before advancing (ms). */
  duration_ms?: number;
  /** Crossfade duration when leaving/entering this slide (ms). */
  transition_ms?: number;
};

function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizeSlideDurationMs(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
  const n = clampInt(raw, HERO_SLIDE_DURATION_MIN_MS, HERO_SLIDE_DURATION_MAX_MS);
  return n === DEFAULT_HERO_SLIDE_DURATION_MS ? undefined : n;
}

export function normalizeSlideTransitionMs(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
  const n = clampInt(
    raw,
    HERO_SLIDE_TRANSITION_MIN_MS,
    HERO_SLIDE_TRANSITION_MAX_MS
  );
  return n === DEFAULT_HERO_SLIDE_TRANSITION_MS ? undefined : n;
}

export function resolveSlideDurationMs(
  slide?: HeroSlideTimingFields | null
): number {
  const raw = slide?.duration_ms;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return clampInt(raw, HERO_SLIDE_DURATION_MIN_MS, HERO_SLIDE_DURATION_MAX_MS);
  }
  return DEFAULT_HERO_SLIDE_DURATION_MS;
}

export function resolveSlideTransitionMs(
  slide?: HeroSlideTimingFields | null
): number {
  const raw = slide?.transition_ms;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return clampInt(
      raw,
      HERO_SLIDE_TRANSITION_MIN_MS,
      HERO_SLIDE_TRANSITION_MAX_MS
    );
  }
  return DEFAULT_HERO_SLIDE_TRANSITION_MS;
}

export function pickSlideTimingFields(
  item: Record<string, unknown>
): HeroSlideTimingFields | undefined {
  const duration_ms = normalizeSlideDurationMs(item.duration_ms);
  const transition_ms = normalizeSlideTransitionMs(item.transition_ms);
  const out: HeroSlideTimingFields = {};
  if (duration_ms !== undefined) out.duration_ms = duration_ms;
  if (transition_ms !== undefined) out.transition_ms = transition_ms;
  return Object.keys(out).length > 0 ? out : undefined;
}
