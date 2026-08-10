"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_HERO_VIDEO_DISPLAY,
  resolveVideoDisplay,
  rotationCoverScale,
  type HeroVideoDisplay,
  type VideoRotation,
} from "@/lib/cms/video-display";
import { cn } from "@/lib/utils";

type VideoDisplayLabels = {
  sectionTitle: string;
  sectionHint: string;
  focalTitle: string;
  focalHint: string;
  focalX: string;
  focalY: string;
  rotationTitle: string;
  speedTitle: string;
  speedHint: string;
  trimTitle: string;
  trimHint: string;
  trimStart: string;
  trimEnd: string;
  trimFull: string;
  reset: string;
};

type VideoDisplayControlsProps = {
  src: string;
  poster?: string;
  value?: HeroVideoDisplay;
  onChange: (next: HeroVideoDisplay) => void;
  labels: VideoDisplayLabels;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function VideoDisplayControls({
  src,
  poster,
  value,
  onChange,
  labels,
}: VideoDisplayControlsProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const resolved = resolveVideoDisplay(value);

  const patch = useCallback(
    (partial: Partial<HeroVideoDisplay>) => {
      onChange({ ...resolved, ...partial });
    },
    [onChange, resolved]
  );

  useEffect(() => {
    setDuration(0);
  }, [src]);

  const onMetadata = () => {
    const el = videoRef.current;
    if (!el || !Number.isFinite(el.duration)) return;
    setDuration(el.duration);
  };

  const trimEndValue =
    resolved.end_time != null && resolved.end_time > 0
      ? resolved.end_time
      : duration > 0
        ? duration
        : 0;

  const setFocalFromPointer = (clientX: number, clientY: number, rect: DOMRect) => {
    const x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
    patch({ focal_x: Math.round(x), focal_y: Math.round(y) });
  };

  const transform =
    resolved.rotation === 0
      ? undefined
      : `rotate(${resolved.rotation}deg) scale(${rotationCoverScale(resolved.rotation)})`;

  return (
    <div className="space-y-4 rounded-xl border border-beige-dark/60 bg-white/80 p-4">
      <div>
        <p className="text-sm font-semibold text-charcoal">{labels.sectionTitle}</p>
        <p className="mt-0.5 text-xs text-muted">{labels.sectionHint}</p>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-charcoal">{labels.focalTitle}</p>
        <p className="mb-2 text-xs text-muted">{labels.focalHint}</p>
        <div
          className="relative aspect-[4/5] max-w-xs cursor-crosshair overflow-hidden rounded-lg border border-beige-dark bg-charcoal/5"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setFocalFromPointer(e.clientX, e.clientY, rect);
          }}
          onKeyDown={() => {
            /* pointer-only control */
          }}
          role="presentation"
        >
          <video
            ref={videoRef}
            src={src}
            poster={poster || undefined}
            muted
            loop
            playsInline
            preload="metadata"
            onLoadedMetadata={onMetadata}
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              objectPosition: `${resolved.focal_x}% ${resolved.focal_y}%`,
              ...(transform
                ? {
                    transform,
                    transformOrigin: "center center",
                  }
                : {}),
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold bg-gold/30 shadow"
            style={{
              left: `${resolved.focal_x}%`,
              top: `${resolved.focal_y}%`,
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute z-10 h-px w-full bg-gold/50"
            style={{ top: `${resolved.focal_y}%` }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute z-10 h-full w-px bg-gold/50"
            style={{ left: `${resolved.focal_x}%` }}
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-charcoal">
            <span className="mb-1 block text-muted">{labels.focalX}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={resolved.focal_x}
              onChange={(e) => patch({ focal_x: Number(e.target.value) })}
              className="w-full accent-gold"
            />
          </label>
          <label className="block text-xs text-charcoal">
            <span className="mb-1 block text-muted">{labels.focalY}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={resolved.focal_y}
              onChange={(e) => patch({ focal_y: Number(e.target.value) })}
              className="w-full accent-gold"
            />
          </label>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-charcoal">{labels.rotationTitle}</p>
        <div className="flex flex-wrap gap-2">
          {([0, 90, 180, 270] as VideoRotation[]).map((deg) => (
            <button
              key={deg}
              type="button"
              onClick={() => patch({ rotation: deg })}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                resolved.rotation === deg
                  ? "bg-gold text-white"
                  : "bg-beige/40 text-charcoal ring-1 ring-beige-dark hover:bg-beige/70"
              )}
            >
              {deg}°
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-charcoal">{labels.speedTitle}</p>
        <p className="mb-2 text-xs text-muted">{labels.speedHint}</p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0.25}
            max={2}
            step={0.05}
            value={resolved.playback_rate}
            onChange={(e) =>
              patch({ playback_rate: round1(Number(e.target.value)) })
            }
            className="min-w-0 flex-1 accent-gold"
          />
          <span className="w-10 shrink-0 text-end text-xs font-medium text-charcoal">
            {resolved.playback_rate}x
          </span>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-charcoal">{labels.trimTitle}</p>
        <p className="mb-2 text-xs text-muted">{labels.trimHint}</p>
        {duration > 0 ? (
          <div className="space-y-3">
            <label className="block text-xs text-charcoal">
              <span className="mb-1 flex justify-between text-muted">
                <span>{labels.trimStart}</span>
                <span>{round1(resolved.start_time)}s</span>
              </span>
              <input
                type="range"
                min={0}
                max={Math.max(0, trimEndValue - 0.5)}
                step={0.1}
                value={Math.min(resolved.start_time, trimEndValue - 0.1)}
                onChange={(e) => {
                  const start = round1(Number(e.target.value));
                  const end =
                    resolved.end_time != null && resolved.end_time > 0
                      ? Math.max(start + 0.1, resolved.end_time)
                      : null;
                  patch({ start_time: start, end_time: end });
                }}
                className="w-full accent-gold"
              />
            </label>
            <label className="block text-xs text-charcoal">
              <span className="mb-1 flex justify-between text-muted">
                <span>{labels.trimEnd}</span>
                <span>
                  {resolved.end_time != null && resolved.end_time > 0
                    ? `${round1(resolved.end_time)}s`
                    : labels.trimFull}
                </span>
              </span>
              <input
                type="range"
                min={resolved.start_time + 0.1}
                max={duration}
                step={0.1}
                value={trimEndValue}
                onChange={(e) => {
                  const end = round1(Number(e.target.value));
                  patch({
                    end_time: end >= duration - 0.05 ? null : end,
                  });
                }}
                className="w-full accent-gold"
              />
            </label>
          </div>
        ) : (
          <p className="text-xs text-muted">{labels.trimHint}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onChange({ ...DEFAULT_HERO_VIDEO_DISPLAY })}
        className="text-xs text-gold hover:underline"
      >
        {labels.reset}
      </button>
    </div>
  );
}
