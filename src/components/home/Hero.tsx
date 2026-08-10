"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SITE_NAME } from "@/lib/constants";
import { resolveHeroSlides } from "@/lib/cms/hero-slides";
import {
  resolveSlideDurationMs,
  resolveSlideTransitionMs,
} from "@/lib/cms/hero-slide-timing";
import { pickCmsOrUi, splitTitleEmphasis } from "@/lib/cms/locale-text";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getDictionary } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AutoLoopVideo } from "@/components/media/AutoLoopVideo";
import type { SiteSettings } from "@/types";

interface HeroProps {
  settings: Pick<
    SiteSettings,
    | "hero_title_ar"
    | "hero_title_he"
    | "hero_title_en"
    | "hero_title_emphasis_ar"
    | "hero_title_emphasis_he"
    | "hero_title_emphasis_en"
    | "hero_subtitle_ar"
    | "hero_subtitle_he"
    | "hero_subtitle_en"
    | "hero_image_url"
    | "hero_image_urls"
    | "hero_slides"
    | "hero_image_alt_ar"
    | "hero_image_alt_he"
    | "hero_image_alt_en"
    | "hero_cta_primary_label_ar"
    | "hero_cta_primary_label_he"
    | "hero_cta_primary_label_en"
    | "hero_cta_primary_href"
    | "hero_cta_secondary_label_ar"
    | "hero_cta_secondary_label_he"
    | "hero_cta_secondary_label_en"
    | "hero_cta_secondary_href"
  >;
}

export function Hero({ settings }: HeroProps) {
  const { locale, dir } = useLocale();
  const ar = getDictionary("ar").home;
  const he = getDictionary("he").home;
  const en = getDictionary("en").home;

  const title = pickCmsOrUi(
    {
      ar: settings.hero_title_ar,
      he: settings.hero_title_he,
      en: settings.hero_title_en,
    },
    locale,
    { ar: ar.heroTitle, he: he.heroTitle, en: en.heroTitle }
  );
  const emphasis = pickCmsOrUi(
    {
      ar: settings.hero_title_emphasis_ar,
      he: settings.hero_title_emphasis_he,
      en: settings.hero_title_emphasis_en,
    },
    locale,
    { ar: ar.heroEmphasis, he: he.heroEmphasis, en: en.heroEmphasis }
  );
  const subtitle = pickCmsOrUi(
    {
      ar: settings.hero_subtitle_ar,
      he: settings.hero_subtitle_he,
      en: settings.hero_subtitle_en,
    },
    locale,
    { ar: ar.heroSubtitle, he: he.heroSubtitle, en: en.heroSubtitle }
  );
  const imageAlt = pickCmsOrUi(
    {
      ar: settings.hero_image_alt_ar,
      he: settings.hero_image_alt_he,
      en: settings.hero_image_alt_en,
    },
    locale,
    { ar: SITE_NAME, he: SITE_NAME, en: SITE_NAME }
  );
  const ctaPrimary = pickCmsOrUi(
    {
      ar: settings.hero_cta_primary_label_ar,
      he: settings.hero_cta_primary_label_he,
      en: settings.hero_cta_primary_label_en,
    },
    locale,
    { ar: ar.heroCtaPrimary, he: he.heroCtaPrimary, en: en.heroCtaPrimary }
  );
  const ctaSecondary = pickCmsOrUi(
    {
      ar: settings.hero_cta_secondary_label_ar,
      he: settings.hero_cta_secondary_label_he,
      en: settings.hero_cta_secondary_label_en,
    },
    locale,
    {
      ar: ar.heroCtaSecondary,
      he: he.heroCtaSecondary,
      en: en.heroCtaSecondary,
    }
  );

  const split = splitTitleEmphasis(title, emphasis);
  const slides = resolveHeroSlides(settings);
  const multi = slides.length > 1;
  const displayFont =
    locale === "en"
      ? "font-[family-name:var(--font-cormorant)]"
      : "font-display-ar";

  const [active, setActive] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!multi || reduceMotion) return;
    const holdMs = resolveSlideDurationMs(slides[active]);
    const id = window.setTimeout(() => {
      setActive((i) => (i + 1) % slides.length);
    }, holdMs);
    return () => window.clearTimeout(id);
  }, [multi, reduceMotion, active, slides]);

  useEffect(() => {
    if (active >= slides.length) setActive(0);
  }, [active, slides.length]);

  const isRtl = dir === "rtl";

  return (
    <section className="relative min-h-[100svh] overflow-hidden">
      <div className="absolute inset-0" aria-hidden={multi ? true : undefined}>
        {slides.map((slide, i) => {
          const isActive = reduceMotion ? i === 0 : i === active;
          const transitionMs = reduceMotion
            ? 0
            : resolveSlideTransitionMs(slide);
          const key = `${slide.type}-${slide.url}-${i}`;
          return (
            <div
              key={key}
              className="absolute inset-0"
              style={{
                opacity: isActive ? 1 : 0,
                transition: transitionMs
                  ? `opacity ${transitionMs}ms ease-in-out`
                  : undefined,
                zIndex: isActive ? 1 : 0,
              }}
            >
              {slide.type === "video" ? (
                reduceMotion && slide.poster_url?.trim() ? (
                  <Image
                    src={slide.poster_url}
                    alt={isActive ? imageAlt : ""}
                    fill
                    priority={i === 0}
                    quality={85}
                    sizes="100vw"
                    className="object-cover object-[center_20%] md:object-[center_25%]"
                  />
                ) : (
                  <AutoLoopVideo
                    src={slide.url}
                    poster={slide.poster_url}
                    alt={isActive ? imageAlt : ""}
                    active={isActive}
                    reduceMotion={reduceMotion}
                    display={slide.video_display}
                  />
                )
              ) : (
                <Image
                  src={slide.url}
                  alt={isActive ? imageAlt : ""}
                  fill
                  priority={i === 0}
                  quality={85}
                  sizes="100vw"
                  className="object-cover object-[center_20%] md:object-[center_25%]"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Gradient strongest only behind the text corner (RTL → right, LTR → left) */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute z-[2] bottom-0 h-[min(44vh,24rem)] w-[min(92vw,22rem)]",
          "start-0",
          isRtl
            ? "bg-[radial-gradient(ellipse_at_95%_95%,rgba(44,36,25,0.55)_0%,rgba(44,36,25,0.24)_38%,transparent_68%)]"
            : "bg-[radial-gradient(ellipse_at_5%_95%,rgba(44,36,25,0.55)_0%,rgba(44,36,25,0.24)_38%,transparent_68%)]"
        )}
      />

      {/*
        Copy tucked into the corner: RTL → bottom-right, LTR → bottom-left.
      */}
      <div
        className={cn(
          "absolute z-10 w-[min(88vw,22.5rem)] max-w-[380px]",
          "bottom-[3.5%] start-[1.5%] sm:bottom-[4%] sm:start-[2%] md:bottom-[4.5%] md:start-[2.5%]"
        )}
      >
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.p
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="font-[family-name:var(--font-cormorant)] text-[9px] font-medium tracking-[0.34em] text-gold/80 uppercase md:text-[10px]"
          >
            {SITE_NAME}
          </motion.p>

          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.35 }}
            className={cn(
              displayFont,
              "mt-3 text-[1.65rem] font-normal leading-[1.35] tracking-[0.03em] text-ivory sm:text-[1.85rem] md:text-[2.15rem] md:leading-[1.3]"
            )}
          >
            {split ? (
              <>
                {split.before.trim() ? (
                  <span className="block font-normal opacity-95">
                    {split.before.trimEnd()}
                  </span>
                ) : null}
                <span className="relative inline-block font-medium">
                  {split.emphasis}
                  <span
                    aria-hidden
                    className="absolute -bottom-0.5 start-0 h-px w-full bg-gold/45"
                  />
                </span>
                {split.after}
              </>
            ) : (
              <span className="font-normal">{title}</span>
            )}
          </motion.h1>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.42 }}
            className="mt-2.5 line-clamp-3 whitespace-pre-line text-[11px] leading-relaxed text-ivory/68 md:text-xs md:leading-relaxed"
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.5 }}
            className="mt-4 flex flex-wrap gap-x-5 gap-y-2"
          >
            <Link
              href={settings.hero_cta_primary_href || "/wedding-dresses"}
              className="border-b border-ivory/45 pb-0.5 text-[10px] tracking-[0.2em] text-ivory/90 uppercase transition-colors hover:border-ivory hover:text-ivory md:text-[11px]"
            >
              {ctaPrimary}
            </Link>
            <Link
              href={settings.hero_cta_secondary_href || "/booking"}
              className="border-b border-ivory/25 pb-0.5 text-[10px] tracking-[0.2em] text-ivory/65 uppercase transition-colors hover:border-ivory/55 hover:text-ivory md:text-[11px]"
            >
              {ctaSecondary}
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {multi && !reduceMotion ? (
        <div
          className="absolute inset-x-0 bottom-4 z-20 flex justify-center gap-2 md:bottom-5"
          role="tablist"
          aria-label="Hero slides"
        >
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Slide ${i + 1}`}
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                i === active
                  ? "w-5 bg-ivory/80"
                  : "w-1 bg-ivory/35 hover:bg-ivory/55"
              )}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
