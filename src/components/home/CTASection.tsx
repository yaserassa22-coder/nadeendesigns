"use client";

import { motion } from "framer-motion";
import { HomeQuietLink } from "@/components/home/HomeQuietLink";
import { useLocale } from "@/components/i18n/LocaleProvider";

export function CTASection() {
  const { t } = useLocale();
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div className="absolute inset-0 bg-charcoal" />

      <div className="relative mx-auto max-w-2xl px-4 text-center md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <p className="font-[family-name:var(--font-cormorant)] text-xs tracking-[0.3em] text-gold uppercase">
            {t.home.ctaEyebrow}
          </p>
          <h2 className="mt-3 text-2xl font-normal tracking-wide text-ivory md:text-3xl lg:text-[2.15rem]">
            {t.home.ctaTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ivory/65 md:text-base">
            {t.home.ctaBody}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <HomeQuietLink
              href="/booking"
              className="text-ivory/80 hover:text-gold"
            >
              {t.home.ctaBook}
            </HomeQuietLink>
            <HomeQuietLink
              href="/contact"
              className="text-ivory/80 hover:text-gold"
            >
              {t.home.ctaContact}
            </HomeQuietLink>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
