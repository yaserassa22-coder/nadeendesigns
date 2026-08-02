"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Gem,
  HeartHandshake,
  PenLine,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SITE_NAME } from "@/lib/constants";

const steps = [
  {
    icon: HeartHandshake,
    title: "استشارة شخصية",
    description: "نتعرف على رؤيتكِ وأسلوبكِ.",
  },
  {
    icon: PenLine,
    title: "تصميم حصري",
    description: "نحول أفكاركِ إلى تصميم فريد.",
  },
  {
    icon: Gem,
    title: "تنفيذ بإتقان",
    description: "نختار أجود الخامات وننفذ كل التفاصيل بعناية.",
  },
  {
    icon: Sparkles,
    title: "تسليم وإطلالة لا تُنسى",
    description: "تستلمين فستانًا صُمم خصيصًا ليومكِ المميز.",
  },
] as const;

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" as const },
};

export function CustomDesignSection() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32 lg:py-36">
      <div className="absolute inset-0 luxury-gradient" />
      <div className="absolute top-16 left-1/4 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
      <div className="absolute bottom-20 right-1/5 h-80 w-80 rounded-full bg-gold/5 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-gold/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-gold/40 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.35em] text-gold uppercase">
              Bespoke Atelier
            </p>

            <h2 className="mt-5 text-3xl font-bold leading-tight text-charcoal md:text-4xl lg:text-5xl">
              ✨ تصميم فستان خاص
            </h2>

            <div className="decorative-line mx-auto mt-7 w-28" />
          </motion.div>

          <motion.blockquote
            {...fadeUp}
            transition={{ duration: 0.75, delay: 0.1, ease: "easeOut" }}
            className="relative mt-12 md:mt-14"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-6 right-1/2 translate-x-1/2 font-[family-name:var(--font-cormorant)] text-7xl leading-none text-gold/20 md:text-8xl"
            >
              “
            </span>
            <p className="relative text-2xl font-medium leading-[1.9] text-charcoal md:text-3xl md:leading-[2]">
              ليس كل فستان يُصنع ليُرتدى... بعض الفساتين تُصنع لتُخلّد ذكرى.
            </p>
          </motion.blockquote>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.7, delay: 0.18, ease: "easeOut" }}
            className="mx-auto mt-10 flex items-center justify-center gap-4"
          >
            <span className="h-px w-10 bg-gradient-to-l from-gold to-transparent md:w-16" />
            <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
            <span className="h-px w-10 bg-gradient-to-r from-gold to-transparent md:w-16" />
          </motion.div>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.7, delay: 0.22, ease: "easeOut" }}
            className="mx-auto mt-10 max-w-2xl text-lg leading-[2] text-muted md:text-xl md:leading-[2.1]"
          >
            في {SITE_NAME} نصمم لكِ فستانًا حصريًا يعكس شخصيتكِ، ويُنفذ بعناية
            فائقة ليكون قطعةً لا تشبه سواها.
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.7, delay: 0.28, ease: "easeOut" }}
            className="mt-12 flex flex-wrap items-center justify-center gap-4"
          >
            <Link href="/custom-design">
              <Button size="lg" className="shadow-lg shadow-gold/20">
                ابدئي رحلة تصميم فستانكِ
              </Button>
            </Link>
            <Link href="/booking?service=custom_design">
              <Button variant="outline" size="lg">
                احجزي استشارة
              </Button>
            </Link>
          </motion.div>
        </div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mx-auto mt-20 max-w-xs md:mt-24"
        >
          <div className="decorative-line w-full" />
          <p className="mt-6 text-center font-[family-name:var(--font-cormorant)] text-sm tracking-[0.3em] text-gold uppercase">
            رحلة التصميم
          </p>
        </motion.div>

        <div className="relative mt-14 md:mt-16">
          <div
            aria-hidden
            className="pointer-events-none absolute top-10 right-0 left-0 hidden h-px bg-gradient-to-l from-transparent via-gold/50 to-transparent lg:block"
          />

          <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {steps.map((step, index) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.65,
                  delay: 0.12 + index * 0.1,
                  ease: "easeOut",
                }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-gold/35 bg-ivory text-gold shadow-[0_0_0_8px_rgba(250,248,245,0.9)]">
                  <step.icon className="h-6 w-6" strokeWidth={1.5} />
                  <span
                    className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-gold font-[family-name:var(--font-cormorant)] text-xs text-white"
                    dir="ltr"
                  >
                    {index + 1}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-charcoal md:text-xl">
                  {step.title}
                </h3>
                <div className="mx-auto mt-3 h-px w-10 bg-gold/50" />
                <p className="mt-4 max-w-[16rem] text-sm leading-relaxed text-muted md:text-base">
                  {step.description}
                </p>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
