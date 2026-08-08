"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/components/i18n/LocaleProvider";

export function CTASection() {
  const { t } = useLocale();
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <div className="absolute inset-0 bg-charcoal" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-gold blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-gold-light blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 text-center md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.3em] text-gold uppercase">
            {t.home.ctaEyebrow}
          </p>
          <h2 className="mt-4 text-3xl font-bold text-ivory md:text-4xl lg:text-5xl">
            {t.home.ctaTitle}
          </h2>
          <p className="mt-6 text-lg text-ivory/70">{t.home.ctaBody}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/booking">
              <Button size="lg">{t.home.ctaBook}</Button>
            </Link>
            <Link href="/contact">
              <Button
                variant="outline"
                size="lg"
                className="border-ivory/30 text-ivory hover:bg-ivory hover:text-charcoal"
              >
                {t.home.ctaContact}
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
