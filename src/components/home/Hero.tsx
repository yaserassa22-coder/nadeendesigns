"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SITE_NAME } from "@/lib/constants";
import { resolveHeroSlideUrls } from "@/lib/cms/hero-slides";
import { pickCmsOrUi, splitTitleEmphasis } from "@/lib/cms/locale-text";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getDictionary } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { SiteSettings } from "@/types";

const SLIDE_MS = 6000;
const FADE_MS = 1200;

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
  const slides = resolveHeroSlideUrls(settings);
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
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [multi, reduceMotion, slides.length]);

  const fadeMs = reduceMotion ? 0 : FADE_MS;

  return (
    <section className="relative flex min-h-[100svh] items-end overflow-hidden md:items-center">
      <div className="absolute inset-0" aria-hidden={multi ? true : undefined}>
        {slides.map((src, i) => {
          const isActive = reduceMotion ? i === 0 : i === active;
          return (
            <div
              key={src}
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
                src={src}
                alt={isActive ? imageAlt : ""}
                fill
                priority={i === 0}
                quality={85}
                sizes="100vw"
                className="object-cover object-[center_20%] md:object-[center_25%]"
              />
            </div>
          );
        })}
      </div>

      {/* Subtle readability veil — photography stays visible */}
          <div className="absolute inset-0 z-[2] bg-gradient-to-t from-[#2c2419]/45 via-[#2c2419]/10 to-transparent" />
      <div
        className={`absolute inset-0 z-[2] ${
          dir === "rtl"
            ? "bg-gradient-to-l from-transparent via-transparent to-[#2c2419]/18"
            : "bg-gradient-to-r from-[#2c2419]/18 via-transparent to-transparent"
        }`}
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-16 pt-28 md:px-8 md:pb-24 md:pt-32">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold tracking-[0.22em] text-gold md:text-4xl lg:text-[2.75rem]"
          >
            {SITE_NAME}
          </motion.p>

          <motion.div
            initial={reduceMotion ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            className={`mt-5 h-px w-24 bg-gold md:w-28 ${
              dir === "rtl" ? "origin-right" : "origin-left"
            }`}
          />

          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.5 }}
            className={`${displayFont} mt-7 max-w-xl text-[2.125rem] font-normal leading-[1.55] tracking-[0.02em] text-ivory sm:text-[2.5rem] sm:leading-[1.5] md:text-[3.15rem] md:leading-[1.45] lg:text-[3.75rem] lg:leading-[1.4]`}
          >
            {split ? (
              <>
                {split.before.trim() ? (
                  <span className="block">{split.before.trimEnd()}</span>
                ) : null}
                <span className="relative inline-block font-bold">
                  {split.emphasis}
                  <span
                    aria-hidden
                    className="absolute -bottom-1 start-0 h-[2px] w-full bg-gold/70"
                  />
                </span>
                {split.after}
              </>
            ) : (
              <span className="font-normal">{title}</span>
            )}
          </motion.h1>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.65 }}
            className="mt-7 max-w-lg whitespace-pre-line text-base leading-relaxed text-ivory/85 md:text-lg"
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.8 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            <Link href={settings.hero_cta_primary_href || "/wedding-dresses"}>
              <Button size="lg" className="min-w-[10rem] shadow-lg shadow-gold/25">
                {ctaPrimary}
              </Button>
            </Link>
            <Link href={settings.hero_cta_secondary_href || "/booking"}>
              <Button
                variant="outline"
                size="lg"
                className="min-w-[10rem] border-gold bg-ivory/70 text-gold backdrop-blur-sm hover:bg-gold hover:text-white"
              >
                {ctaSecondary}
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {multi && !reduceMotion ? (
        <div
          className="absolute inset-x-0 bottom-6 z-20 flex justify-center gap-2 md:bottom-8"
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
                "h-1.5 rounded-full transition-all duration-500",
                i === active
                  ? "w-6 bg-gold"
                  : "w-1.5 bg-ivory/50 hover:bg-ivory/80"
              )}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
