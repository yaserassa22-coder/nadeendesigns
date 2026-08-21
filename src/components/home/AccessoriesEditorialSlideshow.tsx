"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { AccessoriesEditorialSlide } from "@/lib/home/accessories-editorial";
import {
  accessoriesEditorialFrameLayout,
  DEFAULT_ACCESSORIES_EDITORIAL_FRAME,
} from "@/lib/home/accessories-editorial-frame";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type {
  AccessoriesEditorialFrameSettings,
  AccessoriesEditorialGridColumns,
  AccessoriesEditorialGridStyle,
} from "@/types/store";
import { useCart } from "@/components/shop/CartProvider";

const SLIDE_MS = 2200;
const FADE_MS = 900;
const SWIPE_PX = 48;

function scrollGridWithWheel(event: ReactWheelEvent<HTMLDivElement>) {
  const element = event.currentTarget;
  if (element.scrollWidth <= element.clientWidth) return;
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
  event.preventDefault();
  element.scrollLeft += event.deltaY;
}

type AccessoriesEditorialSlideshowProps = {
  slides: AccessoriesEditorialSlide[];
  /** Localized Accessories category / collection label. */
  categoryLabel: string;
  frame?: AccessoriesEditorialFrameSettings;
  gridEnabled?: boolean;
  gridColumns?: AccessoriesEditorialGridColumns;
  gridScrollable?: boolean;
  gridStyle?: AccessoriesEditorialGridStyle;
};

/**
 * Mid-page cinematic Accessories editorial — automatic crossfade of real products.
 * Not the homepage hero. Image-first, minimal type, synced name + link.
 */
export function AccessoriesEditorialSlideshow({
  slides,
  categoryLabel,
  frame = DEFAULT_ACCESSORIES_EDITORIAL_FRAME,
  gridEnabled = false,
  gridColumns = 3,
  gridScrollable = false,
  gridStyle = "editorial",
}: AccessoriesEditorialSlideshowProps) {
  const { t, dir } = useLocale();
  const baseId = useId();
  const multi = slides.length > 1;
  const [active, setActive] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [paused, setPaused] = useState(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!multi || reduceMotion || paused) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [multi, reduceMotion, paused, slides.length]);

  const go = useCallback(
    (direction: 1 | -1) => {
      if (!multi) return;
      setActive((i) => (i + direction + slides.length) % slides.length);
    },
    [multi, slides.length]
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (!multi || e.pointerType === "mouse") return;
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    if (!pointerStart.current || !multi) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    pointerStart.current = null;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return;
    const forward = dir === "rtl" ? dx > 0 : dx < 0;
    go(forward ? 1 : -1);
  };

  if (slides.length === 0) return null;

  if (gridEnabled) {
    return (
      <AccessoryProductGrid
        slides={slides}
        categoryLabel={categoryLabel}
        columns={gridColumns}
        scrollable={gridScrollable}
        style={gridStyle}
      />
    );
  }

  const current = slides[Math.min(active, slides.length - 1)]!;
  const fadeMs = reduceMotion ? 0 : FADE_MS;
  const layout = accessoriesEditorialFrameLayout(frame);
  const hideSideArrows =
    frame.shape === "oval" || frame.shape === "chapel" || frame.shape === "portrait";

  return (
    <section
      className={layout.sectionClassName}
      aria-roledescription={multi ? "carousel" : undefined}
      aria-label={categoryLabel}
      data-swipe-own={multi ? true : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className={layout.shellClassName} style={layout.shellStyle}>
        <div
          className={layout.stageClassName}
          style={layout.stageStyle}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            pointerStart.current = null;
          }}
        >
          <div className="absolute inset-0" aria-hidden={multi || undefined}>
            {slides.map((slide, i) => {
              const isActive = reduceMotion ? i === 0 : i === active;
              return (
                <div
                  key={slide.id}
                  className="absolute inset-0"
                  style={{
                    opacity: isActive ? 1 : 0,
                    transition: fadeMs
                      ? `opacity ${fadeMs}ms ease-in-out`
                      : undefined,
                    zIndex: isActive ? 1 : 0,
                  }}
                >
                  <Image
                    src={slide.imageUrl}
                    alt={isActive ? slide.name : ""}
                    fill
                    priority={i === 0}
                    loading={i === 0 ? "eager" : "lazy"}
                    quality={85}
                    sizes="100vw"
                    className="object-cover object-center"
                  />
                </div>
              );
            })}
          </div>

          <div className="absolute inset-0 z-[2] bg-gradient-to-t from-charcoal/55 via-charcoal/10 to-transparent" />

          {/* Text stays locked to active slide — never out of sync with image */}
          <div className={layout.textClassName}>
            <p className="text-[9px] font-medium tracking-[0.32em] text-ivory/80 uppercase md:text-[10px]">
              {categoryLabel}
            </p>
            <h2
              id={`${baseId}-title`}
              className="font-[family-name:var(--font-cormorant)] text-2xl leading-tight tracking-[0.06em] text-ivory uppercase md:text-3xl lg:text-[2.15rem]"
            >
              {current.name}
            </h2>
            <Link
              href={current.href}
              className="mt-0.5 text-[10px] tracking-[0.18em] text-ivory/80 uppercase transition-colors hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ivory/50 md:text-[11px]"
            >
              {t.home.wornByYouViewPiece}
            </Link>

            {multi ? (
              <div
                className="mt-3 flex items-center gap-2"
                role="tablist"
                aria-label={categoryLabel}
              >
                {slides.map((slide, i) => {
                  const selected = i === active;
                  return (
                    <button
                      key={slide.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-label={`${slide.name} (${i + 1}/${slides.length})`}
                      onClick={() => setActive(i)}
                      className={cn(
                        "h-0.5 rounded-full transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ivory/50",
                        selected
                          ? "w-8 bg-ivory"
                          : "w-1.5 bg-ivory/45 hover:bg-ivory/70"
                      )}
                    />
                  );
                })}
              </div>
            ) : null}
          </div>

          {multi && !hideSideArrows ? (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={t.home.wornByYouPrev}
                className="absolute start-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-ivory/35 bg-charcoal/25 text-ivory backdrop-blur-[1px] transition-colors hover:bg-charcoal/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ivory/50 md:inline-flex"
              >
                {dir === "rtl" ? (
                  <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                ) : (
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                )}
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={t.home.wornByYouNext}
                className="absolute end-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-ivory/35 bg-charcoal/25 text-ivory backdrop-blur-[1px] transition-colors hover:bg-charcoal/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ivory/50 md:inline-flex"
              >
                {dir === "rtl" ? (
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                ) : (
                  <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                )}
              </button>
            </>
          ) : null}

          {/* Invisible full-bleed link for image click — keyboard users use the CTA */}
          <Link
            href={current.href}
            className="absolute inset-0 z-[3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ivory/40"
            aria-label={`${current.name} — ${t.home.wornByYouViewPiece}`}
            tabIndex={-1}
          />
        </div>
      </div>
    </section>
  );
}

function AccessoryProductGrid({
  slides,
  categoryLabel,
  columns,
  scrollable,
  style,
}: {
  slides: AccessoriesEditorialSlide[];
  categoryLabel: string;
  columns: AccessoriesEditorialGridColumns;
  scrollable: boolean;
  style: AccessoriesEditorialGridStyle;
}) {
  const { t } = useLocale();
  const { addItem } = useCart();
  const dragRef = useRef<{ x: number; scrollLeft: number } | null>(null);
  const draggedRef = useRef(false);
  const columnsClass =
    columns === 2
      ? "md:grid-cols-2"
      : columns === 6
        ? "md:grid-cols-3 xl:grid-cols-6"
      : columns === 4
        ? "md:grid-cols-2 xl:grid-cols-4"
        : "md:grid-cols-3";

  const gridClassName = scrollable
    ? "nd-hide-scrollbar flex cursor-grab snap-x snap-mandatory gap-3 overflow-x-auto pb-3 active:cursor-grabbing sm:gap-5"
    : cn("grid grid-cols-2 gap-3 sm:gap-5 lg:gap-6", columnsClass);
  const cardClassName = scrollable
    ? "w-[68vw] shrink-0 snap-start sm:w-[calc((100%-2.5rem)/3)] lg:w-[calc((100%-7.5rem)/4)]"
    : "";

  const onGridPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!scrollable || event.pointerType !== "mouse" || event.button !== 0) return;
    event.preventDefault();
    dragRef.current = {
      x: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
    };
    draggedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onGridPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const delta = event.clientX - dragRef.current.x;
    if (Math.abs(delta) > 4) draggedRef.current = true;
    if (!draggedRef.current) return;
    event.preventDefault();
    event.currentTarget.scrollLeft = dragRef.current.scrollLeft - delta;
  };
  const stopGridDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  };

  return (
    <section className="bg-white px-4 py-10 sm:px-6 sm:py-12 md:px-10 md:py-16" aria-label={categoryLabel}>
      <div className="mx-auto max-w-[96rem]">
        <div className="mb-6 flex items-end justify-between gap-4 border-b border-beige-dark/60 pb-4 md:mb-8">
          <div>
            <h2 className="font-[family-name:var(--font-cormorant)] text-3xl tracking-[0.06em] text-gold uppercase md:text-4xl">
              {categoryLabel}
            </h2>
          </div>
        </div>
        <div
          className={cn(gridClassName, scrollable && "select-none")}
          style={scrollable ? { touchAction: "pan-x" } : undefined}
          onWheel={scrollable ? scrollGridWithWheel : undefined}
          onPointerDown={scrollable ? onGridPointerDown : undefined}
          onPointerMove={scrollable ? onGridPointerMove : undefined}
          onPointerUp={scrollable ? stopGridDrag : undefined}
          onPointerCancel={scrollable ? stopGridDrag : undefined}
          onClickCapture={(event) => {
            if (!draggedRef.current) return;
            event.preventDefault();
            event.stopPropagation();
            draggedRef.current = false;
          }}
        >
          {slides.map((slide) => (
            <div
              key={slide.id}
              className={cn(
                "group relative min-w-0",
                cardClassName,
                style === "cards" && "rounded-sm border border-beige-dark/70 bg-ivory/30 p-2.5 md:p-3",
                style === "editorial" && "rounded-sm bg-ivory/35 p-2 md:p-2.5"
              )}
            >
              <Link
                href={slide.href}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-4"
              >
              <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-beige">
                <Image
                  src={slide.imageUrl}
                  alt={slide.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.035]"
                />
                {style === "editorial" ? (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/70 to-transparent px-3 pb-3 pt-12">
                    <p className="text-sm text-ivory">{slide.name}</p>
                  </div>
                ) : null}
              </div>
              {style !== "editorial" ? (
                <div className="flex items-center justify-between gap-2 px-1 pt-3">
                  <p className="truncate text-sm font-medium text-charcoal transition-colors group-hover:text-gold">
                    {slide.name}
                  </p>
                  <span className="shrink-0 text-[10px] tracking-wide text-gold uppercase">
                    {t.home.wornByYouViewPiece}
                  </span>
                </div>
              ) : null}
              </Link>
              <button
                type="button"
                aria-label={`${t.nav.cart}: ${slide.name}`}
                title={t.nav.cart}
                onClick={() =>
                  addItem({
                    product_type: slide.productType,
                    product_id: slide.id,
                    name_ar: slide.nameAr,
                    name_en: slide.nameEn,
                    name_he: slide.nameHe,
                    unit_price: slide.salePrice ?? slide.price,
                    compare_at_price: slide.salePrice ? slide.price : null,
                    quantity: 1,
                    image: slide.imageUrl,
                    requires_shipping: true,
                  })
                }
                className="absolute bottom-2 left-2 z-10 inline-flex size-8 items-center justify-center rounded-full bg-gold text-white shadow-sm transition hover:bg-gold-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
              >
                <Plus className="size-4" strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
