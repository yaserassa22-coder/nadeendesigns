"use client";

import { useEffect, useState } from "react";
import { stripCloudinaryProductIsolation } from "@/lib/media/cloudinary-image";
import { cn } from "@/lib/utils";

type UnifiedProductPhotoProps = {
  /** Isolated transparent PNG (Cloudinary f_png,e_background_removal). */
  src: string;
  /** Original stored URL — used only if isolation transform fails. */
  fallbackSrc: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  /** CSS drop-shadow filter — synthetic shadow, not from the original photo. */
  dropShadow?: string;
};

/**
 * Renders an isolated product (transparent PNG) on the unified editorial canvas.
 * No blend modes, no background fill on the image layer — the canvas is the background.
 */
export function UnifiedProductPhoto({
  src,
  fallbackSrc,
  alt,
  className,
  style,
  priority = false,
  dropShadow,
}: UnifiedProductPhotoProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    setImgSrc(src);
    setUsedFallback(false);
  }, [src]);

  return (
    <div className={cn("relative h-full w-full bg-transparent", className)} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt={alt}
        className="absolute inset-0 h-full w-full object-contain object-bottom"
        style={dropShadow ? { filter: dropShadow } : undefined}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={() => {
          if (usedFallback) return;
          const original = stripCloudinaryProductIsolation(fallbackSrc || imgSrc);
          if (original && original !== imgSrc) {
            setUsedFallback(true);
            setImgSrc(original);
          }
        }}
      />
    </div>
  );
}
