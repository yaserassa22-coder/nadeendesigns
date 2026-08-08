"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { SITE_NAME } from "@/lib/constants";
import { pickCmsOrUi, splitTitleEmphasis } from "@/lib/cms/locale-text";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getDictionary } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
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
  const imageUrl = settings.hero_image_url?.trim() || "/hero.webp";
  const displayFont =
    locale === "en"
      ? "font-[family-name:var(--font-cormorant)]"
      : "font-display-ar";

  return (
    <section className="relative flex min-h-[100svh] items-end overflow-hidden md:items-center">
      <motion.div
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0"
      >
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          priority
          quality={85}
          sizes="100vw"
          className="object-cover object-[center_20%] md:object-[center_25%]"
        />
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-t from-[#2c2419]/55 via-[#f0ebe3]/35 to-[#faf8f5]/45" />
      <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#faf8f5]/15 to-[#faf8f5]/55" />
      <div className="absolute inset-0 bg-[#f0ebe3]/20 mix-blend-soft-light" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-16 pt-28 md:px-8 md:pb-24 md:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold tracking-[0.22em] text-gold md:text-4xl lg:text-[2.75rem]"
          >
            {SITE_NAME}
          </motion.p>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            className={`mt-5 h-px w-24 bg-gold md:w-28 ${
              dir === "rtl" ? "origin-right" : "origin-left"
            }`}
          />

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.5 }}
            className={`${displayFont} mt-7 max-w-xl text-[2.125rem] font-normal leading-[1.55] tracking-[0.02em] text-charcoal sm:text-[2.5rem] sm:leading-[1.5] md:text-[3.15rem] md:leading-[1.45] lg:text-[3.75rem] lg:leading-[1.4]`}
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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.65 }}
            className="mt-7 max-w-lg whitespace-pre-line text-base leading-relaxed text-charcoal/75 md:text-lg"
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
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
    </section>
  );
}
