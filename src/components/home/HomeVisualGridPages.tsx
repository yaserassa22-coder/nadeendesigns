"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import gsap from "gsap";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { HomeEditorialTile } from "@/components/home/HomeEditorialTile";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { HomepageEditorialTile } from "@/lib/home/homepage-editorial-gallery";
import {
  chunkVisualTiles,
  GRID_SCROLL_PAGE_SIZE,
} from "@/lib/home/visual-layout-grid";
import {
  isProductIsolationEnabled,
  isUnifiedBackgroundEnabled,
  unifiedBackgroundStyle,
  unifiedCanvasClassName,
  unifiedTileImageUrl,
  unifiedTilePresentation,
} from "@/lib/home/visual-unified-background";
import { cn } from "@/lib/utils";
import type { VisualUnifiedBackgroundSettings } from "@/types/store";

type Props = {
  tiles: HomepageEditorialTile[];
  unified?: VisualUnifiedBackgroundSettings;
  preview?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

export function HomeVisualGridPages({
  tiles,
  unified,
  preview = false,
  selectedId = null,
  onSelect,
}: Props) {
  const { t, dir } = useLocale();
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const [pageIndex, setPageIndex] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const skipClickRef = useRef(false);
  const unifiedOn = isUnifiedBackgroundEnabled(unified);
  const presentation = unifiedTilePresentation(unified);
  const pages = useMemo(
    () => chunkVisualTiles(tiles, GRID_SCROLL_PAGE_SIZE),
    [tiles]
  );
  const lastPage = Math.max(0, pages.length - 1);
  const scrollable = pages.length > 1;
  const canPrev = pageIndex > 0;
  const canNext = pageIndex < lastPage;

  useEffect(() => {
    setPageIndex((current) => Math.min(current, lastPage));
  }, [lastPage]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const sign = dir === "rtl" ? 1 : -1;
    const tween = gsap.to(track, {
      xPercent: sign * pageIndex * 100,
      duration: reduceMotion ? 0 : 0.78,
      ease: "power3.inOut",
      overwrite: true,
    });
    return () => {
      tween.kill();
    };
  }, [pageIndex, dir, reduceMotion]);

  const goToPage = useCallback(
    (index: number) => {
      setPageIndex(Math.max(0, Math.min(lastPage, index)));
    },
    [lastPage]
  );

  const goBy = useCallback(
    (direction: 1 | -1) => {
      goToPage(pageIndex + direction);
    },
    [goToPage, pageIndex]
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !scrollable) return;
    let x0 = 0;
    let y0 = 0;

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      x0 = touch.clientX;
      y0 = touch.clientY;
    };

    const onTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - x0;
      const dy = touch.clientY - y0;
      if (Math.abs(dx) < 36) return;
      if (Math.abs(dx) < Math.abs(dy)) return;
      skipClickRef.current = true;
      const towardNext = dir === "rtl" ? dx > 0 : dx < 0;
      goBy(towardNext ? 1 : -1);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [dir, goBy, scrollable]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goBy(dir === "rtl" ? -1 : 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goBy(dir === "rtl" ? 1 : -1);
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!scrollable) return;
    dragStartX.current = event.clientX;
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartX.current == null) return;
    const delta = event.clientX - dragStartX.current;
    dragStartX.current = null;
    if (Math.abs(delta) < 48) return;
    skipClickRef.current = true;
    const towardNext = dir === "rtl" ? delta > 0 : delta < 0;
    goBy(towardNext ? 1 : -1);
  };

  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!skipClickRef.current) return;
    skipClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  if (tiles.length === 0) return null;

  const showArrows = scrollable;
  const label = t.home.visualGridPagesLabel;

  return (
    <section
      className={cn(
        preview ? "py-0" : "px-2 pb-8 pt-8 md:px-4 md:pb-12 md:pt-12",
        !preview && (unifiedOn ? "" : "bg-white")
      )}
      aria-labelledby={preview ? undefined : `${baseId}-title`}
    >
      {preview ? null : (
        <h2 id={`${baseId}-title`} className="sr-only">
          {label}
        </h2>
      )}
      <div className="relative">
        {showArrows ? (
          <>
            <button
              type="button"
              onClick={() => goBy(-1)}
              disabled={!canPrev}
              aria-label={t.home.visualRunwayPrev}
              className={cn(
                "absolute start-2 top-[46%] z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-beige-dark/80 bg-white/90 text-charcoal shadow-sm transition md:start-1",
                "hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
                !canPrev && "pointer-events-none opacity-0"
              )}
            >
              {dir === "rtl" ? (
                <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
              )}
            </button>
            <button
              type="button"
              onClick={() => goBy(1)}
              disabled={!canNext}
              aria-label={t.home.visualRunwayNext}
              className={cn(
                "absolute end-2 top-[46%] z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-beige-dark/80 bg-white/90 text-charcoal shadow-sm transition md:end-1",
                "hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
                !canNext && "pointer-events-none opacity-0"
              )}
            >
              {dir === "rtl" ? (
                <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
              )}
            </button>
          </>
        ) : null}

        <div
          ref={viewportRef}
          role="region"
          aria-roledescription="carousel"
          aria-label={label}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            dragStartX.current = null;
          }}
          onClickCapture={onClickCapture}
          className={cn(
            "overflow-hidden touch-pan-y",
            unifiedOn && cn("rounded-[32px]", unifiedCanvasClassName(true))
          )}
          data-swipe-own
          style={unifiedOn && unified ? unifiedBackgroundStyle(unified) : undefined}
        >
          <div ref={trackRef} className="flex w-full will-change-transform">
            {pages.map((page, index) => {
              const tile = page[0];
              if (!tile) return null;
              const isCustom = tile.variant === "custom";
              const selected = preview && selectedId === tile.id;
              const active = index === pageIndex;
              return (
                <div
                  key={tile.id}
                  data-grid-page
                  aria-hidden={!active}
                  className={cn(
                    "w-full min-w-full shrink-0 basis-full px-3 py-3 sm:px-6 sm:py-5",
                    unifiedOn && "px-4 py-5 sm:px-8 sm:py-7"
                  )}
                >
                  <div className="mx-auto grid w-full grid-cols-1">
                    <article className="relative min-w-0">
                      {preview ? (
                        <button
                          type="button"
                          className="absolute inset-0 z-20 rounded-[24px]"
                          aria-label={tile.title}
                          aria-pressed={selected}
                          onClick={() => onSelect?.(tile.id)}
                        />
                      ) : null}
                      <div
                        className={cn(
                          "h-full bg-transparent transition",
                          preview && selected
                            ? "rounded-[24px] ring-2 ring-gold/55 ring-offset-2"
                            : ""
                        )}
                      >
                        <HomeEditorialTile
                          href={tile.href}
                          imageUrl={unifiedTileImageUrl(tile.imageUrl, unified)}
                          originalImageUrl={tile.imageUrl}
                          title={tile.title}
                          eyebrow={tile.eyebrow}
                          ctaLabel={tile.primaryCtaLabel}
                          secondaryHref={
                            preview ? undefined : tile.secondaryHref
                          }
                          secondaryCtaLabel={
                            preview ? undefined : tile.secondaryCtaLabel
                          }
                          ctaVariant="quiet"
                          titleSize={isCustom ? "md" : "lg"}
                          className={cn(
                            "bg-transparent",
                            preview && "pointer-events-none"
                          )}
                          aspectClassName="aspect-[3/4]"
                          emphasize={Boolean(tile.emphasize) || isCustom}
                          sizes="(min-width: 1024px) 36rem, 90vw"
                          presentation={presentation.presentation}
                          productIsolation={isProductIsolationEnabled(unified)}
                          canvasColor={presentation.canvasColor}
                          imageScale={presentation.imageScale}
                          imageOffsetX={presentation.imageOffsetX}
                          imageOffsetY={presentation.imageOffsetY}
                          dropShadow={presentation.dropShadow}
                          shadowIntensity={presentation.shadowIntensity}
                        />
                      </div>
                    </article>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {scrollable ? (
        <div className="mt-4 flex items-center justify-center gap-2">
          {pages.map((page, index) => (
            <button
              key={page[0]?.id ?? index}
              type="button"
              aria-label={t.home.visualGridPagesPage.replace(
                "{n}",
                String(index + 1)
              )}
              aria-current={index === pageIndex ? "true" : undefined}
              onClick={() => goToPage(index)}
              className={cn(
                "h-1.5 rounded-full transition",
                index === pageIndex
                  ? "w-6 bg-gold"
                  : "w-1.5 bg-beige-dark hover:bg-charcoal/40"
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
