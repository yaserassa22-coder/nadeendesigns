"use client";

import { useEffect, useRef } from "react";
import {
  resolveTrimEnd,
  resolveVideoDisplay,
  usesCustomTrimLoop,
  videoDisplayObjectPosition,
  videoDisplayTransform,
  type HeroVideoDisplay,
} from "@/lib/cms/video-display";
import { cn } from "@/lib/utils";

type AutoLoopVideoProps = {
  src: string;
  poster?: string;
  alt: string;
  /** When false, the video pauses (e.g. inactive hero slide). Default true. */
  active?: boolean;
  reduceMotion?: boolean | null;
  className?: string;
  display?: HeroVideoDisplay;
};

/**
 * Muted looping background video — plays the stored upload URL directly
 * (no Cloudinary re-encode on delivery).
 */
export function AutoLoopVideo({
  src,
  poster,
  alt,
  active = true,
  reduceMotion = false,
  className,
  display,
}: AutoLoopVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLVideoElement>(null);
  const resolved = resolveVideoDisplay(display);
  const customTrim = usesCustomTrimLoop(resolved);
  const transform = videoDisplayTransform(resolved);
  const objectPosition = videoDisplayObjectPosition(resolved);
  const rotationTransform = transform;
  const centerTransform = rotationTransform
    ? `translate(-50%, -50%) ${rotationTransform}`
    : "translate(-50%, -50%)";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.playbackRate = resolved.playback_rate;
  }, [resolved.playback_rate, src]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const applyStart = () => {
      if (resolved.start_time > 0) {
        try {
          el.currentTime = resolved.start_time;
        } catch {
          /* metadata may not be ready */
        }
      }
    };

    const onTimeUpdate = () => {
      if (!customTrim || !active || reduceMotion) return;
      const end = resolveTrimEnd(resolved, el.duration);
      if (!Number.isFinite(el.duration) || el.duration <= 0) return;
      if (end <= resolved.start_time + 0.15) return;
      if (el.currentTime >= end - 0.08) {
        try {
          el.currentTime = resolved.start_time;
        } catch {
          /* ignore seek errors */
        }
      }
    };

    el.addEventListener("loadedmetadata", applyStart);
    el.addEventListener("timeupdate", onTimeUpdate);
    if (el.readyState >= 1) applyStart();

    return () => {
      el.removeEventListener("loadedmetadata", applyStart);
      el.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [
    active,
    customTrim,
    reduceMotion,
    resolved.end_time,
    resolved.start_time,
    src,
  ]);

  useEffect(() => {
    const el = ref.current;
    const container = containerRef.current;
    if (!el) return;

    if (reduceMotion || !active) {
      el.pause();
      return;
    }

    const tryPlay = () => {
      if (el.paused) {
        void el.play().catch(() => {
          /* Browser may block until muted + playsInline — already set. */
        });
      }
    };

    tryPlay();
    el.addEventListener("loadeddata", tryPlay);
    el.addEventListener("canplay", tryPlay);

    // Observe the full container — not the transformed video node (IO was pausing hero).
    const ioTarget = container ?? el;
    const onIntersect: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && active && !reduceMotion) tryPlay();
        else if (!entry.isIntersecting) el.pause();
      }
    };

    const io = new IntersectionObserver(onIntersect, {
      threshold: 0,
      rootMargin: "0px",
    });
    io.observe(ioTarget);

    return () => {
      el.removeEventListener("loadeddata", tryPlay);
      el.removeEventListener("canplay", tryPlay);
      io.disconnect();
    };
  }, [src, active, reduceMotion]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {/*
        Center + min-width/height cover: uses native video resolution when possible
        instead of stretching a small box (sharper than inset-0 h-full w-full alone).
      */}
      <video
        ref={ref}
        className={cn("absolute left-1/2 top-1/2 max-w-none", className)}
        style={{
          minWidth: "100%",
          minHeight: "100%",
          width: "auto",
          height: "auto",
          objectFit: "cover",
          objectPosition,
          transform: centerTransform,
          transformOrigin: "center center",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
        src={src}
        poster={poster || undefined}
        aria-label={alt}
        muted
        loop={!customTrim}
        playsInline
        autoPlay={!reduceMotion && active}
        preload="auto"
      />
    </div>
  );
}
