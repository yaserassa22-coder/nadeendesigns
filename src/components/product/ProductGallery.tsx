"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { featuredImage } from "@/lib/products/featured-image";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  images: string[] | null | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
}

/**
 * PDP gallery: featured = images[0].
 * Mobile swipe, desktop arrows, thumbnail strip. Chrome hidden for a single image.
 */
export function ProductGallery({
  images,
  alt,
  className,
  priority = true,
}: ProductGalleryProps) {
  const slides = (images ?? []).filter(Boolean);
  const slidesKey = slides.join("|");
  const [index, setIndex] = useState(0);
  const [seenKey, setSeenKey] = useState(slidesKey);
  const touchStartX = useRef<number | null>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);

  if (seenKey !== slidesKey) {
    setSeenKey(slidesKey);
    setIndex(0);
  }

  const count = slides.length;
  const multi = count > 1;
  const safeIndex = count === 0 ? 0 : Math.min(index, count - 1);
  const current = slides[safeIndex] ?? featuredImage(slides);

  useEffect(() => {
    const el = thumbsRef.current?.children[safeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [safeIndex]);

  const go = useCallback(
    (next: number) => {
      if (count < 2) return;
      setIndex(((next % count) + count) % count);
    },
    [count]
  );

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!multi) return;
    touchStartX.current = e.clientX;
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    if (!multi || touchStartX.current == null) {
      touchStartX.current = null;
      return;
    }
    const delta = e.clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    const rtl =
      typeof document !== "undefined" &&
      document.documentElement.dir === "rtl";
    if (rtl) go(safeIndex + (delta > 0 ? 1 : -1));
    else go(safeIndex + (delta < 0 ? 1 : -1));
  };

  if (!current) {
    return (
      <div
        className={cn(
          "relative aspect-[3/4] overflow-hidden rounded-3xl bg-beige",
          className
        )}
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className="group/gallery relative aspect-[3/4] overflow-hidden rounded-3xl bg-beige focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
        tabIndex={multi ? 0 : undefined}
        role={multi ? "region" : undefined}
        aria-label={multi ? `معرض صور ${alt}` : undefined}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          touchStartX.current = null;
        }}
        onKeyDown={(e) => {
          if (!multi) return;
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            const rtl =
              typeof document !== "undefined" &&
              document.documentElement.dir === "rtl";
            go(safeIndex + (rtl ? -1 : 1));
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            const rtl =
              typeof document !== "undefined" &&
              document.documentElement.dir === "rtl";
            go(safeIndex + (rtl ? 1 : -1));
          }
        }}
      >
        <Image
          key={current}
          src={current}
          alt={alt}
          fill
          quality={85}
          priority={priority && safeIndex === 0}
          loading={safeIndex === 0 && priority ? "eager" : "lazy"}
          className="object-cover transition-opacity duration-300 ease-out"
          sizes="(max-width: 1024px) 100vw, 50vw"
          draggable={false}
        />

        {multi && (
          <>
            <button
              type="button"
              aria-label="الصورة السابقة"
              className="absolute start-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-charcoal shadow-sm transition hover:bg-gold hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 md:flex"
              onClick={() => go(safeIndex - 1)}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="الصورة التالية"
              className="absolute end-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-charcoal shadow-sm transition hover:bg-gold hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 md:flex"
              onClick={() => go(safeIndex + 1)}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5 md:hidden">
              {slides.map((_, i) => (
                <span
                  key={`dot-${i}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === safeIndex ? "w-4 bg-gold" : "w-1.5 bg-white/80"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {multi && (
        <div
          ref={thumbsRef}
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin"
        >
          {slides.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              aria-label={`صورة ${i + 1}`}
              aria-current={i === safeIndex}
              onClick={() => setIndex(i)}
              className={cn(
                "relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition",
                i === safeIndex
                  ? "border-gold ring-1 ring-gold/40"
                  : "border-transparent opacity-80 hover:opacity-100"
              )}
            >
              <Image
                src={src}
                alt=""
                fill
                loading="lazy"
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
