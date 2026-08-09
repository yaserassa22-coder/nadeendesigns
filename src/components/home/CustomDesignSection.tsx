"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { SITE_NAME } from "@/lib/constants";
import { useLocale } from "@/components/i18n/LocaleProvider";

type CustomDesignSectionProps = {
  /** Real CMS / product imagery only — never invented. */
  imageUrl?: string | null;
  imageAlt?: string;
};

/**
 * Full-bleed cinematic atelier band — image dominant, minimal type.
 * Nestled in the continuous post-hero visual world (no large ivory padding).
 */
export function CustomDesignSection({
  imageUrl,
  imageAlt,
}: CustomDesignSectionProps) {
  const { t } = useLocale();
  const cover = imageUrl?.trim() || "";

  return (
    <section className="bg-ivory pt-1 sm:pt-1.5">
      <div className="w-full px-1 sm:px-1.5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55 }}
          className="relative min-h-[88vw] overflow-hidden bg-beige sm:min-h-[58vw] lg:min-h-[42rem]"
        >
          {cover ? (
            <Image
              src={cover}
              alt={imageAlt || SITE_NAME}
              fill
              quality={85}
              sizes="100vw"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-beige via-beige-dark/60 to-charcoal/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/55 via-charcoal/10 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-2 p-5 md:gap-3 md:p-8 lg:max-w-lg lg:p-10">
            <p className="text-[9px] font-medium tracking-[0.32em] text-ivory/80 uppercase md:text-[10px]">
              {t.home.customEyebrow}
            </p>
            <h2 className="font-[family-name:var(--font-cormorant)] text-2xl leading-tight tracking-[0.06em] text-ivory uppercase md:text-3xl lg:text-4xl">
              {t.nav.customDesign}
            </h2>
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2">
              <Link
                href="/custom-design"
                className="text-[10px] tracking-[0.18em] text-ivory/80 uppercase transition-colors hover:text-ivory md:text-[11px]"
              >
                {t.home.customStartCta}
              </Link>
              <Link
                href="/booking?service=custom_design"
                className="text-[10px] tracking-[0.18em] text-ivory/65 uppercase transition-colors hover:text-ivory md:text-[11px]"
              >
                {t.home.customBookCta}
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
