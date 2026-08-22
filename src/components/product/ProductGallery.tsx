"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  ProductCardImageCounter,
  ProductCardOverlay,
} from "@/components/product/ProductCardOverlay";
import { featuredImage } from "@/lib/products/featured-image";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n";

interface ProductGalleryProps {
  images: string[] | null | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
  /** Top-left overlay badges (SALE / featured). */
  badges?: ReactNode;
  /** Top-right wishlist control. */
  wishlist?: ReactNode;
}

/**
 * Luxury PDP gallery: hover zoom, smooth fade, mobile swipe,
 * image counter, premium nav. Overlay: badges TL · wishlist TR.
 * Chrome hidden for a single image (except overlays when provided).
 */
export function ProductGallery({
  images,
  alt,
  className,
  priority = true,
  badges,
  wishlist,
}: ProductGalleryProps) {
  const { t } = useLocale();
  const slides = (images ?? []).filter(Boolean);
  const slidesKey = slides.join("|");
  const [index, setIndex] = useState(0);
  const [seenKey, setSeenKey] = useState(slidesKey);
  const [fading, setFading] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (multi && event.key === "ArrowRight") go(safeIndex + (document.documentElement.dir === "rtl" ? 1 : -1));
      if (multi && event.key === "ArrowLeft") go(safeIndex + (document.documentElement.dir === "rtl" ? -1 : 1));
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxOpen, multi, safeIndex]);

  const go = useCallback(
    (next: number) => {
      if (count < 2) return;
      const target = ((next % count) + count) % count;
      if (target === safeIndex) return;
      setFading(true);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => {
        setIndex(target);
        setFading(false);
      }, 140);
    },
    [count, safeIndex]
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
          "relative aspect-[3/4] overflow-hidden rounded-[var(--xp-card-radius-lg)] bg-beige",
          className
        )}
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className="group relative aspect-[3/4] overflow-hidden rounded-[var(--xp-card-radius-lg)] bg-beige focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
        tabIndex={multi ? 0 : undefined}
        role={multi ? "region" : undefined}
        aria-label={
          multi
            ? formatMessage(t.productExtras.galleryAria, { alt })
            : undefined
        }
        aria-roledescription={multi ? "carousel" : undefined}
        data-swipe-own={multi ? true : undefined}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          touchStartX.current = null;
        }}
        onPointerMove={(event) => {
          if (event.pointerType === "mouse") setIsZoomed(true);
        }}
        onMouseMove={() => setIsZoomed(true)}
        onPointerLeave={() => setIsZoomed(false)}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          setLightboxOpen(true);
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
          className={cn(
            "object-cover transition-[opacity,transform] duration-500 ease-out will-change-transform",
            isZoomed ? "scale-105" : "",
            fading ? "opacity-0" : "opacity-100 xp-fade-in"
          )}
          sizes="(max-width: 1024px) 100vw, 50vw"
          draggable={false}
        />

        <ProductCardOverlay
          badges={badges}
          wishlist={wishlist}
          imageCounter={
            multi ? (
              <ProductCardImageCounter
                current={safeIndex + 1}
                total={count}
                className="bg-charcoal/70 px-3 py-1.5 text-xs backdrop-blur-sm"
              />
            ) : undefined
          }
        />

        {multi && (
          <>
            <button
              type="button"
              aria-label={t.productExtras.prevImage}
              className="absolute start-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/90 text-charcoal shadow-md backdrop-blur-sm transition hover:border-gold hover:bg-gold hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 md:flex"
              onClick={() => go(safeIndex - 1)}
            >
              <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              aria-label={t.productExtras.nextImage}
              className="absolute end-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/90 text-charcoal shadow-md backdrop-blur-sm transition hover:border-gold hover:bg-gold hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 md:flex"
              onClick={() => go(safeIndex + 1)}
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <div className="pointer-events-none absolute inset-x-0 bottom-14 flex justify-center gap-1.5 md:hidden">
              {slides.map((_, i) => (
                <span
                  key={`dot-${i}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === safeIndex ? "w-5 bg-gold" : "w-1.5 bg-white/80"
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
          className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin"
        >
          {slides.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              aria-label={formatMessage(t.productExtras.imageN, { n: i + 1 })}
              aria-current={i === safeIndex}
              onClick={() => {
                if (i === safeIndex) return;
                go(i);
              }}
              className={cn(
                "relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition",
                i === safeIndex
                  ? "border-gold ring-1 ring-gold/40"
                  : "border-transparent opacity-75 hover:opacity-100"
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

      {lightboxOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            aria-label={t.common.close}
            className="absolute end-4 top-4 z-10 rounded-full bg-ivory/90 p-2 text-charcoal shadow-md transition hover:bg-gold hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="relative max-h-[92vh] max-w-[92vw]"
            onClick={(event) => event.stopPropagation()}
            onWheel={(event) => {
              if (!multi) return;
              go(safeIndex + (event.deltaY > 0 ? 1 : -1));
            }}
          >
            <Image
              src={current}
              alt={alt}
              width={1400}
              height={1800}
              className="max-h-[92vh] w-auto max-w-[92vw] object-contain"
              sizes="92vw"
            />
          </div>
          {multi ? (
            <>
              <button
                type="button"
                aria-label={t.productExtras.prevImage}
                className="absolute start-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-ivory/90 p-3 text-charcoal shadow-md transition hover:bg-gold hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                onClick={(event) => {
                  event.stopPropagation();
                  go(safeIndex - 1);
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label={t.productExtras.nextImage}
                className="absolute end-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-ivory/90 p-3 text-charcoal shadow-md transition hover:bg-gold hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                onClick={(event) => {
                  event.stopPropagation();
                  go(safeIndex + 1);
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
