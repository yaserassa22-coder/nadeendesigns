"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  OFFICIAL_INSTAGRAM_URL,
  SITE_NAME,
} from "@/lib/constants";
import {
  resolveGalleryCategoryLabel,
  withFallbackGalleryIds,
  type GalleryCategory,
} from "@/lib/gallery/categories";
import { GalleryLoopVideo } from "@/components/media/GalleryLoopVideo";
import {
  StorefrontSocialLinks,
  type StorefrontSocialUrls,
} from "@/components/layout/StorefrontSocialLinks";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

export type HomeGalleryTile = {
  src: string;
  alt: string;
  title?: string;
  href?: string;
  category: string;
  videoUrl?: string;
  mediaType?: "image" | "video";
};

type InstagramSectionProps = {
  /** Admin gallery images with category — never invent / never pad with products. */
  images?: HomeGalleryTile[];
  /** Active gallery filter categories from admin. */
  categories?: GalleryCategory[];
  /** Store social URLs — TikTok / Facebook logos appear when filled in Admin. */
  social?: StorefrontSocialUrls;
};

const MAX_VISIBLE = 8;

type JournalSlot = {
  col: string;
  aspect: string;
  shift: string;
  parallax: number;
};

const SLOTS: JournalSlot[] = [
  {
    col: "col-span-12 md:col-span-5 md:col-start-1",
    aspect: "aspect-[4/5] md:aspect-[3/4]",
    shift: "",
    parallax: 16,
  },
  {
    col: "col-span-12 md:col-span-6 md:col-start-7",
    aspect: "aspect-[3/4] md:aspect-[4/5]",
    shift: "md:mt-12",
    parallax: 28,
  },
  {
    col: "col-span-12 md:col-span-7 md:col-start-2",
    aspect: "aspect-[5/4] md:aspect-[4/3]",
    shift: "md:mt-2",
    parallax: 12,
  },
  {
    col: "col-span-12 md:col-span-4 md:col-start-9",
    aspect: "aspect-[4/5] md:aspect-[3/4]",
    shift: "md:mt-8",
    parallax: 32,
  },
  {
    col: "col-span-12 md:col-span-5 md:col-start-1",
    aspect: "aspect-[3/4] md:aspect-[4/5]",
    shift: "md:mt-4",
    parallax: 18,
  },
  {
    col: "col-span-12 md:col-span-5 md:col-start-8",
    aspect: "aspect-[4/5] md:aspect-[3/4]",
    shift: "md:mt-10",
    parallax: 24,
  },
  {
    col: "col-span-12 md:col-span-4 md:col-start-3",
    aspect: "aspect-[3/4]",
    shift: "",
    parallax: 10,
  },
  {
    col: "col-span-12 md:col-span-6 md:col-start-7",
    aspect: "aspect-[5/4]",
    shift: "md:mt-2",
    parallax: 20,
  },
];

const SPREAD_3: JournalSlot[] = [
  {
    col: "col-span-12 md:col-span-5 md:col-start-1",
    aspect: "aspect-[4/5] md:aspect-[3/4]",
    shift: "",
    parallax: 16,
  },
  {
    col: "col-span-12 md:col-span-5 md:col-start-8",
    aspect: "aspect-[3/4] md:aspect-[4/5]",
    shift: "md:mt-16",
    parallax: 28,
  },
  {
    col: "col-span-12 md:col-span-7 md:col-start-3",
    aspect: "aspect-[5/4]",
    shift: "md:mt-2",
    parallax: 12,
  },
];

function slotFor(index: number, total: number): JournalSlot {
  if (total === 1) {
    return {
      col: "col-span-12 md:col-span-6 md:col-start-4",
      aspect: "aspect-[4/5] md:aspect-[3/4]",
      shift: "",
      parallax: 16,
    };
  }
  if (total === 2) {
    return (
      [
        {
          col: "col-span-12 md:col-span-5 md:col-start-1",
          aspect: "aspect-[4/5] md:aspect-[3/4]",
          shift: "",
          parallax: 18,
        },
        {
          col: "col-span-12 md:col-span-6 md:col-start-7",
          aspect: "aspect-[3/4] md:aspect-[4/5]",
          shift: "md:mt-16",
          parallax: 26,
        },
      ] satisfies JournalSlot[]
    )[index]!;
  }
  if (total === 3) return SPREAD_3[index]!;
  return SLOTS[index % SLOTS.length]!;
}

/**
 * Homepage closing visual — Nadeen Journal.
 * Images come only from admin Gallery CMS.
 */
export function InstagramSection({
  images = [],
  categories = [],
  social,
}: InstagramSectionProps) {
  const { t, locale, dir } = useLocale();
  const displayFont =
    locale === "ar"
      ? "font-[family-name:var(--font-amiri)]"
      : "font-[family-name:var(--font-cormorant)]";

  const sectionRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const compositionRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef(0);

  const tiles = useMemo(
    () =>
      images.filter(
        (img) => Boolean(img.src.trim()) || Boolean(img.videoUrl?.trim())
      ),
    [images]
  );

  const categoryBySlug = useMemo(() => {
    const map = new Map<string, GalleryCategory>();
    for (const c of withFallbackGalleryIds(categories)) {
      map.set(c.slug, c);
    }
    return map;
  }, [categories]);

  const [lightbox, setLightbox] = useState<number | null>(null);

  const visible = useMemo(() => tiles.slice(0, MAX_VISIBLE), [tiles]);

  const tileLabel = useCallback(
    (tile: HomeGalleryTile) => {
      const cat = categoryBySlug.get(tile.category);
      if (cat) return resolveGalleryCategoryLabel(cat, locale);
      return tile.category;
    },
    [categoryBySlug, locale]
  );

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const ctx = gsap.context(() => {
        const figures = compositionRef.current?.querySelectorAll<HTMLElement>(
          "[data-journal-figure]"
        );
        if (!figures?.length) return;

        gsap.fromTo(
          figures,
          {
            opacity: 0,
            scale: reduce ? 1 : 0.97,
          },
          {
            opacity: 1,
            scale: 1,
            duration: reduce ? 0.2 : 0.55,
            stagger: reduce ? 0 : 0.07,
            ease: "power2.out",
            overwrite: true,
          }
        );

        if (reduce) return;

        figures.forEach((el) => {
          const dist = Number(el.dataset.parallax || 16) * (mobile ? 0.35 : 1);
          gsap.fromTo(
            el,
            { y: -dist / 2 },
            {
              y: dist / 2,
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.7,
              },
            }
          );
        });

      if (titleRef.current) {
        gsap.to(titleRef.current, {
          y: 10,
          ease: "none",
          scrollTrigger: {
            trigger: titleRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.4,
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [visible.length]);

  const openLightbox = (index: number) => setLightbox(index);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  const goLightbox = useCallback(
    (delta: number) => {
      setLightbox((current) => {
        if (current === null || visible.length === 0) return current;
        return (current + delta + visible.length) % visible.length;
      });
    },
    [visible.length]
  );

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goLightbox(dir === "rtl" ? -1 : 1);
      if (e.key === "ArrowLeft") goLightbox(dir === "rtl" ? 1 : -1);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, closeLightbox, goLightbox, dir]);

  const onFigureMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    const media = e.currentTarget.querySelector<HTMLElement>("[data-journal-media]");
    if (!media) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    media.style.transform = `scale(1.05) translate(${x * 10}px, ${y * 10}px)`;
  };

  const onFigureLeave = (e: MouseEvent<HTMLButtonElement>) => {
    const media = e.currentTarget.querySelector<HTMLElement>("[data-journal-media]");
    if (media) media.style.transform = "";
  };

  if (tiles.length === 0) return null;

  const active = lightbox !== null ? visible[lightbox] : null;

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-white pb-28 pt-12 md:pb-28 md:pt-24"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-10">
        <div ref={titleRef} className="mb-10 text-center md:mb-14">
          <h2
            className={cn(
              "text-[1.85rem] font-normal text-charcoal md:text-[2.35rem]",
              locale === "en"
                ? "tracking-[0.18em] uppercase md:tracking-[0.22em]"
                : "tracking-[0.04em]",
              displayFont
            )}
          >
            {t.home.journal.title}
          </h2>
          <p className="mt-3 text-[11px] tracking-[0.22em] text-charcoal/50 uppercase md:text-xs">
            {t.home.journal.subtitle}
          </p>
        </div>

        {visible.length === 0 ? (
          <p className="py-16 text-center text-sm tracking-wide text-muted">
            {t.home.journal.empty}
          </p>
        ) : (
          <div
            ref={compositionRef}
            className="grid grid-cols-12 items-start gap-x-0 gap-y-5 md:gap-x-8 md:gap-y-5"
          >
            {visible.map((tile, i) => {
              const slot = slotFor(i, visible.length);
              return (
                <figure
                  key={`${tile.videoUrl || tile.src}-${i}`}
                  data-journal-figure
                  data-parallax={slot.parallax}
                  className={cn("relative min-w-0", slot.col, slot.shift)}
                >
                  <button
                    type="button"
                    onClick={() => openLightbox(i)}
                    onMouseMove={onFigureMove}
                    onMouseLeave={onFigureLeave}
                    className="group relative block w-full cursor-pointer text-start"
                    aria-label={tile.alt || SITE_NAME}
                  >
                    <div
                      className={cn(
                        "relative overflow-hidden bg-beige/40",
                        slot.aspect
                      )}
                    >
                      <div
                        data-journal-media
                        className="absolute inset-0 will-change-transform transition-transform duration-700 ease-out [@media(hover:hover)]:group-hover:scale-[1.04]"
                      >
                        {tile.videoUrl ? (
                          <GalleryLoopVideo
                            src={tile.videoUrl}
                            poster={tile.src || undefined}
                            alt={tile.alt || SITE_NAME}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : tile.src ? (
                          <Image
                            src={tile.src}
                            alt={tile.alt || SITE_NAME}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 42vw"
                          />
                        ) : null}
                      </div>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal/25 via-transparent to-transparent opacity-0 transition-opacity duration-500 [@media(hover:hover)]:group-hover:opacity-100" />
                    </div>
                    <figcaption className="pointer-events-none absolute inset-x-0 bottom-3 hidden px-3 text-[10px] tracking-[0.2em] text-ivory/0 uppercase transition-colors duration-500 [@media(hover:hover)]:group-hover:text-ivory/90 md:block">
                      {tileLabel(tile)}
                    </figcaption>
                  </button>
                </figure>
              );
            })}
          </div>
        )}

        <div className="mt-12 text-center md:mt-20">
          <nav className="flex flex-col items-center gap-5 md:flex-row md:justify-center md:gap-x-8 md:gap-y-3">
            <StorefrontSocialLinks
              appearance="plain"
              variant="light"
              instagram={social?.instagram || OFFICIAL_INSTAGRAM_URL}
              facebook={social?.facebook}
              tiktok={social?.tiktok}
              pinterest={social?.pinterest}
              youtube={social?.youtube}
            />
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <Link
                href="/custom-design"
                className="py-1 text-[11px] tracking-[0.18em] text-charcoal/50 uppercase transition-colors hover:text-gold md:text-[11px] md:tracking-[0.2em]"
              >
                {t.nav.customDesign}
              </Link>
              <Link
                href="/booking"
                className="py-1 text-[11px] tracking-[0.18em] text-charcoal/50 uppercase transition-colors hover:text-gold md:text-[11px] md:tracking-[0.2em]"
              >
                {t.nav.bookAppointment}
              </Link>
            </div>
          </nav>
        </div>
      </div>

      {active && lightbox !== null ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#1c1814]/92 px-4 py-10"
          role="dialog"
          aria-modal="true"
          aria-label={active.alt || SITE_NAME}
          onClick={closeLightbox}
          onTouchStart={(e) => {
            touchStartX.current = e.changedTouches[0]?.clientX ?? 0;
          }}
          onTouchEnd={(e) => {
            const x = e.changedTouches[0]?.clientX ?? 0;
            const dx = x - touchStartX.current;
            if (Math.abs(dx) < 48) return;
            const forward = dir === "rtl" ? dx > 0 : dx < 0;
            goLightbox(forward ? 1 : -1);
          }}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 end-4 rounded-full p-2 text-ivory/80 transition-colors hover:text-ivory"
            aria-label={t.common.close}
          >
            <X className="h-5 w-5" />
          </button>

          {visible.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goLightbox(-1);
                }}
                className="absolute start-2 top-1/2 z-10 -translate-y-1/2 p-3 text-ivory/70 transition-colors hover:text-ivory md:start-6"
                aria-label={t.common.previous}
              >
                <ChevronLeft className="h-6 w-6 rtl:rotate-180" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goLightbox(1);
                }}
                className="absolute end-2 top-1/2 z-10 -translate-y-1/2 p-3 text-ivory/70 transition-colors hover:text-ivory md:end-6"
                aria-label={t.common.next}
              >
                <ChevronRight className="h-6 w-6 rtl:rotate-180" />
              </button>
            </>
          ) : null}

          <div
            className="relative flex max-h-[88vh] w-full max-w-5xl flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative max-h-[78vh] w-full">
              {active.videoUrl ? (
                <GalleryLoopVideo
                  key={active.videoUrl}
                  src={active.videoUrl}
                  poster={active.src || undefined}
                  alt={active.alt || SITE_NAME}
                  controls
                  className="mx-auto max-h-[78vh] w-auto max-w-full"
                />
              ) : (
                <Image
                  src={active.src}
                  alt={active.alt || SITE_NAME}
                  width={1600}
                  height={2000}
                  className="mx-auto max-h-[78vh] w-auto object-contain"
                  sizes="90vw"
                  priority
                />
              )}
            </div>
            <div className="mt-5 text-center">
              {active.title ? (
                <p className={cn("text-sm tracking-wide text-ivory/90", displayFont)}>
                  {active.title}
                </p>
              ) : null}
              <p className="mt-1 text-[10px] tracking-[0.22em] text-ivory/50 uppercase">
                {tileLabel(active)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
