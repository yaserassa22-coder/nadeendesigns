/**
 * Hero / CMS video presentation — focal crop, rotation, speed, trim loop.
 */

export type VideoRotation = 0 | 90 | 180 | 270;

export type HeroVideoDisplay = {
  /** Horizontal focal point for object-cover (0–100). */
  focal_x?: number;
  /** Vertical focal point for object-cover (0–100). */
  focal_y?: number;
  rotation?: VideoRotation;
  /** Playback speed multiplier (0.25–2). */
  playback_rate?: number;
  /** Loop segment start (seconds). */
  start_time?: number;
  /** Loop segment end (seconds). Omit / null = full duration. */
  end_time?: number | null;
};

export const DEFAULT_HERO_VIDEO_DISPLAY: Required<
  Pick<HeroVideoDisplay, "focal_x" | "focal_y" | "rotation" | "playback_rate" | "start_time">
> &
  Pick<HeroVideoDisplay, "end_time"> = {
  focal_x: 50,
  focal_y: 20,
  rotation: 0,
  playback_rate: 1,
  start_time: 0,
  end_time: null,
};

const ROTATIONS = new Set<number>([0, 90, 180, 270]);

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function normalizeVideoRotation(raw: unknown): VideoRotation {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (ROTATIONS.has(n)) return n as VideoRotation;
  return 0;
}

export function normalizeVideoDisplay(raw: unknown): HeroVideoDisplay | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const item = raw as Record<string, unknown>;

  const focal_x =
    typeof item.focal_x === "number" && Number.isFinite(item.focal_x)
      ? clamp(Math.round(item.focal_x), 0, 100)
      : undefined;
  const focal_y =
    typeof item.focal_y === "number" && Number.isFinite(item.focal_y)
      ? clamp(Math.round(item.focal_y), 0, 100)
      : undefined;
  const rotation = normalizeVideoRotation(item.rotation);
  const playback_rate =
    typeof item.playback_rate === "number" && Number.isFinite(item.playback_rate)
      ? round1(clamp(item.playback_rate, 0.25, 2))
      : undefined;

  const start_time =
    typeof item.start_time === "number" && Number.isFinite(item.start_time)
      ? Math.max(0, round1(item.start_time))
      : undefined;

  let end_time: number | null | undefined;
  if (item.end_time === null) {
    end_time = null;
  } else if (
    typeof item.end_time === "number" &&
    Number.isFinite(item.end_time)
  ) {
    end_time = Math.max(0, round1(item.end_time));
  }

  const out: HeroVideoDisplay = {};
  if (focal_x !== undefined) out.focal_x = focal_x;
  if (focal_y !== undefined) out.focal_y = focal_y;
  if (rotation !== 0 || item.rotation !== undefined) out.rotation = rotation;
  if (playback_rate !== undefined && playback_rate !== 1)
    out.playback_rate = playback_rate;
  if (start_time !== undefined && start_time > 0) out.start_time = start_time;
  if (end_time !== undefined) out.end_time = end_time;

  return Object.keys(out).length > 0 ? out : undefined;
}

export function resolveVideoDisplay(
  partial?: HeroVideoDisplay | null
): typeof DEFAULT_HERO_VIDEO_DISPLAY {
  const base = { ...DEFAULT_HERO_VIDEO_DISPLAY };
  if (!partial) return base;

  return {
    focal_x: partial.focal_x ?? base.focal_x,
    focal_y: partial.focal_y ?? base.focal_y,
    rotation: normalizeVideoRotation(partial.rotation ?? base.rotation),
    playback_rate: partial.playback_rate ?? base.playback_rate,
    start_time: partial.start_time ?? base.start_time,
    end_time: partial.end_time ?? base.end_time,
  };
}

/** Extra scale so rotated video still covers the frame. */
export function rotationCoverScale(rotation: VideoRotation): number {
  return rotation === 90 || rotation === 270 ? 1.55 : 1;
}

export function videoDisplayObjectPosition(display: HeroVideoDisplay): string {
  const d = resolveVideoDisplay(display);
  return `${d.focal_x}% ${d.focal_y}%`;
}

export function videoDisplayTransform(display: HeroVideoDisplay): string | undefined {
  const d = resolveVideoDisplay(display);
  if (d.rotation === 0) return undefined;
  const scale = rotationCoverScale(d.rotation);
  return `rotate(${d.rotation}deg) scale(${scale})`;
}

/** Whether custom trim loop is needed (vs native HTML loop). */
export function usesCustomTrimLoop(display: HeroVideoDisplay): boolean {
  const d = resolveVideoDisplay(display);
  return d.start_time > 0 || (d.end_time != null && d.end_time > 0);
}

export function resolveTrimEnd(
  display: HeroVideoDisplay,
  duration: number
): number {
  const d = resolveVideoDisplay(display);
  if (duration > 0 && d.end_time != null && d.end_time > 0) {
    return clamp(d.end_time, d.start_time + 0.1, duration);
  }
  return duration > 0 ? duration : 0;
}
