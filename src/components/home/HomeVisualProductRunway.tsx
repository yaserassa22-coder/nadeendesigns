"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HomeEditorialTile } from "@/components/home/HomeEditorialTile";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { HomepageEditorialTile } from "@/lib/home/homepage-editorial-gallery";
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
  /** Admin canvas: select a tile instead of following product links. */
  preview?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

export function HomeVisualProductRunway({
  tiles,
  unified,
  preview = false,
  selectedId = null,
  onSelect,
}: Props) {
  const { t, dir } = useLocale();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const unifiedOn = isUnifiedBackgroundEnabled(unified);
  const presentation = unifiedTilePresentation(unified);
  const scrollable = tiles.length > 1;

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) {
      setCanPrev(false);
      setCanNext(false);
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 4) {
      setCanPrev(false);
      setCanNext(false);
      return;
    }
    const start = Math.abs(el.scrollLeft);
    setCanPrev(start > 4);
    setCanNext(start < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(() => updateArrows());
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows, tiles.length]);

  const scrollByCard = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-runway-card]");
    const amount = card ? card.offsetWidth + 12 : el.clientWidth * 0.72;
    el.scrollBy({
      left: direction * amount * (dir === "rtl" ? -1 : 1),
      behavior: "smooth",
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollByCard(dir === "rtl" ? -1 : 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollByCard(dir === "rtl" ? 1 : -1);
    }
  };

  if (tiles.length === 0) return null;

  const showArrows = scrollable && (canPrev || canNext);
  const label = t.home.visualRunwayLabel;

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
              onClick={() => scrollByCard(-1)}
              disabled={!canPrev}
              aria-label={t.home.visualRunwayPrev}
              className={cn(
                "absolute start-1 top-[42%] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-beige-dark/80 bg-white/90 text-charcoal shadow-sm transition md:inline-flex",
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
              onClick={() => scrollByCard(1)}
              disabled={!canNext}
              aria-label={t.home.visualRunwayNext}
              className={cn(
                "absolute end-1 top-[42%] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-beige-dark/80 bg-white/90 text-charcoal shadow-sm transition md:inline-flex",
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
          ref={scrollerRef}
          role="region"
          aria-roledescription="carousel"
          aria-label={label}
          tabIndex={0}
          onKeyDown={onKeyDown}
            className={cn(
              "flex gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden",
              "snap-x snap-mandatory",
              unifiedOn &&
                cn(
                  "rounded-[32px] px-3 py-4 sm:px-4 sm:py-5",
                  unifiedCanvasClassName(true)
                )
            )}
            data-swipe-own
          style={unifiedOn && unified ? unifiedBackgroundStyle(unified) : undefined}
        >
          {tiles.map((tile) => {
            const isCustom = tile.variant === "custom";
            const selected = preview && selectedId === tile.id;
            return (
              <article
                key={tile.id}
                data-runway-card
                className={cn(
                  "relative shrink-0 snap-start",
                  "w-[78%] sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.7rem)] xl:w-[calc(25%-0.75rem)]"
                )}
              >
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
                    secondaryHref={preview ? undefined : tile.secondaryHref}
                    secondaryCtaLabel={preview ? undefined : tile.secondaryCtaLabel}
                    ctaVariant="quiet"
                    titleSize={isCustom ? "md" : "sm"}
                    className={cn(
                      "bg-transparent",
                      preview && "pointer-events-none"
                    )}
                    aspectClassName="aspect-[3/4]"
                    emphasize={Boolean(tile.emphasize) || isCustom}
                    sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 78vw"
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
            );
          })}
        </div>
      </div>
    </section>
  );
}
