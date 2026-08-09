"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { WornByYouItem } from "@/types";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  wornByYouAlt,
  wornByYouProductHref,
} from "@/lib/home/worn-by-you";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

type WornByYouSectionProps = {
  items: WornByYouItem[];
};

function AutoLoopVideo({
  src,
  poster,
  alt,
  reduceMotion,
}: {
  src: string;
  poster?: string;
  alt: string;
  reduceMotion: boolean | null;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reduceMotion) {
      el.pause();
      return;
    }

    const tryPlay = () => {
      void el.play().catch(() => {
        /* Browser may block until muted + playsInline — already set. */
      });
    };

    tryPlay();

    const onIntersect: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) tryPlay();
        else el.pause();
      }
    };

    const io = new IntersectionObserver(onIntersect, {
      threshold: 0.35,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [src, reduceMotion]);

  return (
    <video
      ref={ref}
      className="absolute inset-0 h-full w-full object-cover"
      src={src}
      poster={poster || undefined}
      aria-label={alt}
      muted
      loop
      playsInline
      autoPlay={!reduceMotion}
      preload="metadata"
    />
  );
}

export function WornByYouSection({ items }: WornByYouSectionProps) {
  const { t, dir } = useLocale();
  const reduceMotion = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const list = items.filter((item) => {
    if (item.media_type === "video") return Boolean(item.video_url?.trim());
    return Boolean(item.image_url?.trim());
  });
  const scrollable = list.length > 1;

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
  }, [updateArrows, list.length]);

  const scrollByCard = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-worn-card]");
    const amount = card ? card.offsetWidth + 8 : el.clientWidth * 0.85;
    const delta = direction * amount * (dir === "rtl" ? -1 : 1);
    el.scrollBy({
      left: delta,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      scrollByCard(dir === "rtl" ? -1 : 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      scrollByCard(dir === "rtl" ? 1 : -1);
    }
  };

  if (list.length === 0) return null;

  const showArrows = scrollable && (canPrev || canNext);

  return (
    <section
      className="bg-ivory pt-8 md:pt-10"
      aria-labelledby={`${baseId}-title`}
    >
      <div className="w-full px-1 sm:px-1.5">
        <div className="mb-4 px-2 text-center md:mb-5">
          <p className="font-[family-name:var(--font-cormorant)] text-[10px] tracking-[0.32em] text-gold uppercase md:text-xs">
            {t.home.wornByYouEyebrow}
          </p>
          <h2
            id={`${baseId}-title`}
            className="mt-2 font-[family-name:var(--font-cormorant)] text-lg tracking-[0.12em] text-charcoal uppercase md:text-xl"
          >
            {t.home.wornByYouTitle}
          </h2>
        </div>

        <div className="relative">
          {showArrows ? (
            <>
              <button
                type="button"
                onClick={() => scrollByCard(-1)}
                disabled={!canPrev}
                aria-label={t.home.wornByYouPrev}
                className={cn(
                  "absolute start-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-beige-dark/80 bg-ivory/90 text-charcoal shadow-sm transition-opacity md:inline-flex",
                  "hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
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
                aria-label={t.home.wornByYouNext}
                className={cn(
                  "absolute end-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-beige-dark/80 bg-ivory/90 text-charcoal shadow-sm transition-opacity md:inline-flex",
                  "hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
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
            aria-label={t.home.wornByYouTitle}
            tabIndex={0}
            onKeyDown={onKeyDown}
            className={cn(
              "flex gap-1.5 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-2 [&::-webkit-scrollbar]:hidden",
              scrollable ? "snap-x snap-mandatory" : "justify-center"
            )}
          >
            {list.map((item, index) => {
              const alt = wornByYouAlt(item, SITE_NAME);
              const productHref = wornByYouProductHref(
                item.product_kind,
                item.product_id
              );
              const productLabel =
                item.product_label?.trim() || t.home.wornByYouViewPiece;
              const social = item.social_url?.trim() || null;
              const isVideo =
                item.media_type === "video" && Boolean(item.video_url?.trim());
              const poster = item.image_url?.trim() || undefined;

              return (
                <article
                  key={item.id}
                  data-worn-card
                  className={cn(
                    "relative shrink-0",
                    scrollable
                      ? "w-[82%] snap-start sm:w-[calc(50%-0.25rem)] lg:w-[calc(33.333%-0.375rem)]"
                      : "w-full max-w-md sm:w-[min(100%,24rem)]"
                  )}
                >
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{
                      delay: reduceMotion ? 0 : Math.min(index, 4) * 0.04,
                      duration: 0.45,
                    }}
                    className="group relative"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-beige">
                      {isVideo && item.video_url ? (
                        <AutoLoopVideo
                          src={item.video_url}
                          poster={poster}
                          alt={alt}
                          reduceMotion={reduceMotion}
                        />
                      ) : poster ? (
                        <>
                          <Image
                            src={poster}
                            alt={alt}
                            fill
                            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                            sizes="(max-width: 640px) 85vw, (max-width: 1024px) 50vw, 33vw"
                            loading={index < 3 ? "eager" : "lazy"}
                          />
                          {social ? (
                            <a
                              href={social}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/50"
                              aria-label={t.home.wornByYouSocial}
                            />
                          ) : null}
                        </>
                      ) : null}
                    </div>

                    <div className="mt-2.5 space-y-0.5 px-0.5 text-center">
                      {item.product_label?.trim() || productHref ? (
                        <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.06em] text-charcoal">
                          {item.product_label?.trim() || productLabel}
                        </p>
                      ) : null}
                      {item.customer_name?.trim() ? (
                        <p className="text-[11px] tracking-[0.14em] text-muted uppercase">
                          {item.customer_name.trim()}
                        </p>
                      ) : item.caption?.trim() ? (
                        <p className="text-[11px] tracking-[0.08em] text-muted">
                          {item.caption.trim()}
                        </p>
                      ) : null}
                      {productHref ? (
                        <Link
                          href={productHref}
                          className="inline-block pt-1 text-[10px] tracking-[0.2em] text-gold uppercase transition-colors hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
                        >
                          {t.home.wornByYouViewPiece}
                        </Link>
                      ) : null}
                    </div>
                  </motion.div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
