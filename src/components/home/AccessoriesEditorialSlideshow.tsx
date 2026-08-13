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
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AccessoriesEditorialSlide } from "@/lib/home/accessories-editorial";
import {
  accessoriesEditorialFrameLayout,
  DEFAULT_ACCESSORIES_EDITORIAL_FRAME,
} from "@/lib/home/accessories-editorial-frame";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { AccessoriesEditorialFrameSettings } from "@/types/store";

const SLIDE_MS = 2200;
const FADE_MS = 900;
const SWIPE_PX = 48;

type AccessoriesEditorialSlideshowProps = {
  slides: AccessoriesEditorialSlide[];
  /** Localized Accessories category / collection label. */
  categoryLabel: string;
  frame?: AccessoriesEditorialFrameSettings;
};

/**
 * Mid-page cinematic Accessories editorial — automatic crossfade of real products.
 * Not the homepage hero. Image-first, minimal type, synced name + link.
 */
export function AccessoriesEditorialSlideshow({
  slides,
  categoryLabel,
  frame = DEFAULT_ACCESSORIES_EDITORIAL_FRAME,
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
    setActive(0);
  }, [slides.length]);

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
