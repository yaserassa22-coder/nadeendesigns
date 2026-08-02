"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import type { SiteSettings } from "@/types";
import { Button } from "@/components/ui/Button";

interface HeroProps {
  settings: SiteSettings;
}

export function Hero({ settings }: HeroProps) {
  return (
    <section className="relative min-h-screen overflow-hidden pt-20">
      <div className="absolute inset-0 luxury-gradient" />
      <div className="absolute top-20 left-10 h-64 w-64 rounded-full bg-gold/5 blur-3xl" />
      <div className="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:px-8 lg:min-h-[calc(100vh-5rem)] lg:grid-cols-2 lg:gap-16 lg:py-0">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-2">
            <Sparkles className="h-4 w-4 text-gold" />
            <span className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.2em] text-gold uppercase">
              Luxury Bridal Boutique
            </span>
          </div>

          <h1 className="text-4xl font-bold leading-tight text-charcoal md:text-5xl lg:text-6xl xl:text-7xl">
            {settings.hero_title_ar}
          </h1>

          <p className="mt-8 max-w-lg text-lg leading-relaxed text-muted md:text-xl">
            {settings.hero_subtitle_ar}
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/booking">
              <Button size="lg">احجزي موعدًا</Button>
            </Link>
            <Link href="/wedding-dresses">
              <Button variant="outline" size="lg">
                تصفحي الفساتين
              </Button>
            </Link>
          </div>

          <div className="mt-12 flex gap-8 border-t border-beige-dark pt-8">
            {[
              { value: "+500", label: "عروس سعيدة" },
              { value: "+150", label: "تصميم حصري" },
              { value: "10+", label: "سنوات خبرة" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-gold md:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          className="relative"
        >
          <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem] shadow-2xl shadow-gold/10 md:rounded-[3rem]">
            <Image
              src="https://images.unsplash.com/photo-1519741497674-611481863552?w=900&q=85"
              alt="فستان زفاف فاخر — Nadeen Designs"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/20 to-transparent" />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="absolute -bottom-6 -right-4 rounded-2xl border border-beige-dark bg-white p-5 shadow-xl md:-right-8"
          >
            <p className="font-[family-name:var(--font-cormorant)] text-lg text-gold">
              تصاميم حصرية
            </p>
            <p className="text-sm text-muted">لكل عروس حلم فريد</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
