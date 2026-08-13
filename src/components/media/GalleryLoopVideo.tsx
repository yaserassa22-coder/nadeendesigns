"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

type GalleryLoopVideoProps = {
  src: string;
  poster?: string;
  alt: string;
  className?: string;
  controls?: boolean;
};

/** Muted autoplay loop for storefront gallery videos. */
export function GalleryLoopVideo({
  src,
  poster,
  alt,
  className,
  controls = false,
}: GalleryLoopVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduceMotion) {
      el.pause();
      return;
    }

    const tryPlay = () => {
      if (el.paused) void el.play().catch(() => {});
    };

    tryPlay();
    el.addEventListener("canplay", tryPlay);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) tryPlay();
          else el.pause();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => {
      el.removeEventListener("canplay", tryPlay);
      io.disconnect();
    };
  }, [src, reduceMotion]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      aria-label={alt}
      muted
      loop
      playsInline
      autoPlay={!reduceMotion}
      preload="auto"
      controls={controls}
      className={className}
    />
  );
}
