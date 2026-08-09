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
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
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

export function WornByYouSection({ items }: WornByYouSectionProps) {
  const { t, dir } = useLocale();
  const reduceMotion = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const list = items.filter((item) => Boolean(item.image_url?.trim()));
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
                item.media_type === "video" && Boolean(item.video_url);
              const isPlaying = playingId === item.id;

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
                      {isPlaying && item.video_url ? (
                        <video
                          className="absolute inset-0 h-full w-full object-cover"
                          src={item.video_url}
                          poster={item.image_url}
                          controls
                          playsInline
                          autoPlay={!reduceMotion}
                          muted
                          onEnded={() => setPlayingId(null)}
                        />
                      ) : (
                        <>
                          <Image
                            src={item.image_url}
                            alt={alt}
                            fill
                            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                            sizes="(max-width: 640px) 85vw, (max-width: 1024px) 50vw, 33vw"
                            loading={index < 3 ? "eager" : "lazy"}
                          />
                          {isVideo ? (
                            <button
                              type="button"
                              onClick={() => setPlayingId(item.id)}
                              className="absolute inset-0 flex items-center justify-center bg-charcoal/10 transition-colors hover:bg-charcoal/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/50"
                              aria-label={t.home.wornByYouPlay}
                            >
                              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ivory/70 bg-charcoal/45 text-ivory backdrop-blur-[1px]">
                                <Play
                                  className="ms-0.5 h-4 w-4"
                                  fill="currentColor"
                                  strokeWidth={0}
                                />
                              </span>
                            </button>
                          ) : social ? (
                            <a
                              href={social}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/50"
                              aria-label={t.home.wornByYouSocial}
                            />
                          ) : null}
                        </>
                      )}

                      {isPlaying ? (
                        <button
                          type="button"
                          onClick={() => setPlayingId(null)}
                          className="absolute end-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-charcoal/55 text-ivory hover:bg-charcoal/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
                          aria-label={t.common.close}
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
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
