"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCardMediaOverlay } from "@/components/product/ProductCardMediaOverlay";
import { featuredImage } from "@/lib/products/featured-image";
import { cn } from "@/lib/utils";

/**
 * Serializable card chrome + wishlist element.
 * Do NOT pass a render function — Server Components cannot send functions to Client Components.
 * Slide counter (`current`/`total`) is applied inside this client component.
 */
export type ProductCardOverlayProps = {
  wishlist: ReactNode;
  price?: number | null;
  salePrice?: number | null;
  isFeatured?: boolean | null;
  tags?: string[] | null;
};

interface ProductCardImageCarouselProps {
  images: string[] | null | undefined;
  alt: string;
  href: string;
  className?: string;
  sizes?: string;
  roundedClassName?: string;
  /** Prefer for above-the-fold cards only (first visible row). */
  priority?: boolean;
  /**
   * Shared product-card chrome (badges / wishlist / counter).
   * Pass serializable badge data + a wishlist ReactNode — never a function.
   */
  overlay?: ProductCardOverlayProps;
}

/**
 * Shared product-card media: images[0] is featured (initial slide).
 * Mobile: swipe. Desktop: arrows. Dots when 2+. Chrome hidden for a single image.
 */
export function ProductCardImageCarousel({
  images,
  alt,
  href,
  className,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  roundedClassName = "rounded-2xl",
  priority = false,
  overlay,
}: ProductCardImageCarouselProps) {
  const slides = (images ?? []).filter(Boolean);
  const imageKey = slides.join("|");
  const [index, setIndex] = useState(0);
  const [trackedKey, setTrackedKey] = useState(imageKey);
  const touchStartX = useRef<number | null>(null);
  const dragging = useRef(false);

  if (trackedKey !== imageKey) {
    setTrackedKey(imageKey);
    setIndex(0);
  }

  const count = slides.length;
  const multi = count > 1;
  const safeIndex = count === 0 ? 0 : Math.min(index, count - 1);
  const current = slides[safeIndex] ?? featuredImage(slides);

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
    dragging.current = false;
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (touchStartX.current == null) return;
    if (Math.abs(e.clientX - touchStartX.current) > 12) {
      dragging.current = true;
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    if (!multi || touchStartX.current == null) {
      touchStartX.current = null;
      return;
    }
    const delta = e.clientX - touchStartX.current;
    touchStartX.current = null;
    // RTL: swipe toward start (right visually) → previous in LTR terms;
    // use document direction so both layouts feel natural.
    const rtl =
      typeof document !== "undefined" &&
      document.documentElement.dir === "rtl";
    if (Math.abs(delta) < 40) return;
    if (rtl) {
      go(safeIndex + (delta > 0 ? 1 : -1));
    } else {
      go(safeIndex + (delta < 0 ? 1 : -1));
    }
  };

  const overlayNode = overlay ? (
    <ProductCardMediaOverlay
      current={count === 0 ? 0 : safeIndex + 1}
      total={count}
      price={overlay.price}
      salePrice={overlay.salePrice}
      isFeatured={overlay.isFeatured}
      tags={overlay.tags}
      wishlist={overlay.wishlist}
    />
  ) : null;

  if (!current) {
    return (
      <div
        className={cn(
          "relative aspect-[3/4] overflow-hidden bg-beige",
          roundedClassName,
          className
        )}
      >
        {overlayNode}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group/carousel relative aspect-[3/4] overflow-hidden bg-beige",
        roundedClassName,
        className
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        touchStartX.current = null;
      }}
    >
      <Link
        href={href}
        className="absolute inset-0 block"
        onClick={(e) => {
          if (dragging.current) {
            e.preventDefault();
            dragging.current = false;
          }
        }}
        draggable={false}
      >
        <Image
          key={current}
          src={current}
          alt={alt}
          fill
          quality={85}
          priority={priority && safeIndex === 0}
          loading={priority && safeIndex === 0 ? "eager" : "lazy"}
          className="object-cover transition-opacity duration-300"
          sizes={sizes}
          draggable={false}
        />
      </Link>

      {multi && (
        <>
          <button
            type="button"
            aria-label="الصورة السابقة"
            className="absolute start-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-charcoal shadow-sm transition hover:bg-gold hover:text-white md:flex md:opacity-0 md:group-hover/carousel:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(safeIndex - 1);
            }}
          >
            {/* start side: ChevronRight in RTL (dir=rtl), ChevronLeft in LTR */}
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="الصورة التالية"
            className="absolute end-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-charcoal shadow-sm transition hover:bg-gold hover:text-white md:flex md:opacity-0 md:group-hover/carousel:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(safeIndex + 1);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Dots stay centered; numeric counter lives in ProductCardOverlay bottom-right. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5 px-14">
            {slides.map((_, i) => (
              <button
                key={`${slides[i]}-${i}`}
                type="button"
                aria-label={`صورة ${i + 1}`}
                aria-current={i === safeIndex}
                className={cn(
                  "pointer-events-auto h-1.5 rounded-full transition-all",
                  i === safeIndex
                    ? "w-4 bg-gold"
                    : "w-1.5 bg-white/80 hover:bg-white"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIndex(i);
                }}
              />
            ))}
          </div>
        </>
      )}

      {overlayNode}
    </div>
  );
}
