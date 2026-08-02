"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { SITE_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/Button";

const HERO_IMAGE = "/hero.webp";

export function Hero() {
  return (
    <section className="relative flex min-h-[100svh] items-end overflow-hidden md:items-center">
      {/* Full-bleed hero image */}
      <motion.div
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0"
      >
        <Image
          src={HERO_IMAGE}
          alt="فستان زفاف ملكي بالدانتيل الفاخر — Nadeen Designs"
          fill
          priority
          quality={85}
          sizes="100vw"
          className="object-cover object-[center_20%] md:object-[center_25%]"
        />
      </motion.div>

      {/* Soft beige / ivory overlays */}
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
            className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold tracking-[0.18em] text-gold md:text-3xl"
          >
            {SITE_NAME}
          </motion.p>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            className="mt-4 h-px w-20 origin-right bg-gold"
          />

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.5 }}
            className="mt-6 text-4xl font-bold leading-[1.2] text-charcoal md:text-5xl lg:text-6xl xl:text-7xl"
          >
            تفاصيل تصنع الفرق
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.65 }}
            className="mt-6 max-w-xl text-base leading-relaxed text-charcoal/80 md:text-lg lg:text-xl"
          >
            فساتين زفاف فاخرة، تصاميم حصرية، وخدمة راقية لتكوني الأجمل في يومك
            المميز.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.8 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            <Link href="/wedding-dresses">
              <Button size="lg" className="min-w-[10rem] shadow-lg shadow-gold/25">
                اكتشفي المجموعة
              </Button>
            </Link>
            <Link href="/booking">
              <Button
                variant="outline"
                size="lg"
                className="min-w-[10rem] border-gold bg-ivory/70 text-gold backdrop-blur-sm hover:bg-gold hover:text-white"
              >
                احجزي موعدًا
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
