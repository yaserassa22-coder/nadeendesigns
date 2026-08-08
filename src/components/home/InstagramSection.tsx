"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n";

import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  OFFICIAL_INSTAGRAM_HANDLE,
  OFFICIAL_INSTAGRAM_URL,
  SITE_NAME,
} from "@/lib/constants";

export function InstagramSection() {
  const { t } = useLocale();
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <div className="absolute inset-0 luxury-gradient" />
      <div className="absolute top-16 left-1/4 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
      <div className="absolute bottom-10 right-1/4 h-72 w-72 rounded-full bg-gold/5 blur-3xl" />

      <div className="relative mx-auto max-w-3xl px-4 text-center md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7 }}
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-white/80 text-gold shadow-sm backdrop-blur">
            <Camera className="h-7 w-7" />
          </div>

          <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.3em] text-gold uppercase">
            Instagram
          </p>

          <h2 className="mt-4 text-3xl font-bold text-charcoal md:text-4xl lg:text-5xl">
            {formatMessage(t.home.igTitle, { name: SITE_NAME })}
          </h2>
          <div className="decorative-line mx-auto mt-5 w-24" />

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            {formatMessage(t.home.igBody, { name: SITE_NAME })}
          </p>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-white/70 px-5 py-2.5 backdrop-blur">
            <Sparkles className="h-4 w-4 text-gold" />
            <span
              className="font-[family-name:var(--font-cormorant)] text-xl tracking-wide text-charcoal"
              dir="ltr"
            >
              {OFFICIAL_INSTAGRAM_HANDLE}
            </span>
          </div>

          <div className="mt-10">
            <Link
              href={OFFICIAL_INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="shadow-lg shadow-gold/20">
                {t.home.igVisit}
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
