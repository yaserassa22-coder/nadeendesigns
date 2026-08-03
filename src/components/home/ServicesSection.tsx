"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Gem,
  Heart,
  Sparkles,
  WandSparkles,
  Flower2,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";

const cardClassName =
  "group flex h-full min-h-[200px] w-full flex-col rounded-2xl border border-beige-dark bg-white p-6 transition-all hover:border-gold hover:shadow-lg hover:shadow-gold/10";

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid framer-motion SSR/client style mismatch (hydration errors).
  if (!mounted) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ServicesSection() {
  return (
    <section id="categories" className="bg-beige/30 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeading
          subtitle="خدماتنا"
          title="تجربة فاخرة من الألف إلى الياء"
          description="نقدم لكِ تجربة متكاملة تجعل رحلة اختيار فستان أحلامك لا تُنسى"
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Reveal delay={0} className="h-full">
            <Link href="/wedding-dresses" className={cardClassName}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold transition-colors group-hover:bg-gold group-hover:text-white">
                <Crown className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-charcoal group-hover:text-gold">
                فساتين الزفاف
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                تصاميم فاخرة من أفخر الأقمشة العالمية لإطلالة لا تُنسى
              </p>
            </Link>
          </Reveal>

          <Reveal delay={0.08} className="h-full">
            <Link href="/nouf-dresses" className={cardClassName}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold transition-colors group-hover:bg-gold group-hover:text-white">
                <Gem className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-charcoal group-hover:text-gold">
                فساتين نوف
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                اكتشفي مجموعة فساتين نوف الحصرية، بتصاميم تجمع بين الأناقة،
                الفخامة، والتفاصيل الراقية
              </p>
            </Link>
          </Reveal>

          <Reveal delay={0.16} className="h-full">
            <Link href="/rental-dresses" className={cardClassName}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold transition-colors group-hover:bg-gold group-hover:text-white">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-charcoal group-hover:text-gold">
                فساتين للإيجار
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                إطلالة أحلامك بأسعار مناسبة مع خدمة تنظيف وصيانة
              </p>
            </Link>
          </Reveal>

          <Reveal delay={0.24} className="h-full">
            <Link href="/custom-design" className={cardClassName}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold transition-colors group-hover:bg-gold group-hover:text-white">
                <WandSparkles className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-charcoal group-hover:text-gold">
                تصميم فستان خاص
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                صممي فستانكِ معنا من الصفر — قطعة فريدة على مقاسكِ وذوقكِ
              </p>
            </Link>
          </Reveal>
        </div>

        <div className="mt-14">
          <div className="mb-6 text-center">
            <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.25em] text-gold uppercase">
              Accessories
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-charcoal">
              اكسسوارات العروس
            </h3>
          </div>
          <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
            <Reveal delay={0.32} className="h-full w-full max-w-sm">
              <Link href="/veils" className={cardClassName}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold transition-colors group-hover:bg-gold group-hover:text-white">
                  <Flower2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-charcoal group-hover:text-gold">
                  طرحة العروس
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                  طرحات أنيقة تكمل إطلالتكِ بلمسة من السحر والرقي
                </p>
              </Link>
            </Reveal>

            <Reveal delay={0.4} className="h-full w-full max-w-sm">
              <Link href="/robes" className={cardClassName}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold transition-colors group-hover:bg-gold group-hover:text-white">
                  <Heart className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-charcoal group-hover:text-gold">
                  برنص العروس
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                  برنص فاخر لجلسات التحضير والتصوير بأناقة مميزة
                </p>
              </Link>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
