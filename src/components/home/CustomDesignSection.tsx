"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Gem,
  HeartHandshake,
  PenLine,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SITE_NAME } from "@/lib/constants";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n";

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" as const },
};

export function CustomDesignSection() {
  const { t } = useLocale();
  const steps = useMemo(
    () => [
      {
        icon: HeartHandshake,
        title: t.home.customSteps.consultTitle,
        description: t.home.customSteps.consultBody,
      },
      {
        icon: PenLine,
        title: t.home.customSteps.designTitle,
        description: t.home.customSteps.designBody,
      },
      {
        icon: Gem,
        title: t.home.customSteps.craftTitle,
        description: t.home.customSteps.craftBody,
      },
      {
        icon: Sparkles,
        title: t.home.customSteps.deliverTitle,
        description: t.home.customSteps.deliverBody,
      },
    ],
    [t]
  );

  return (
    <section className="relative overflow-hidden py-24 md:py-32 lg:py-36">
      <div className="absolute inset-0 luxury-gradient" />
      <div className="absolute top-16 left-1/4 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
      <div className="absolute bottom-20 right-1/5 h-80 w-80 rounded-full bg-gold/5 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-gold/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-gold/40 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div {...fadeUp} transition={{ duration: 0.7, ease: "easeOut" }}>
            <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.35em] text-gold uppercase">
              Bespoke Atelier
            </p>
            <h2 className="mt-5 text-3xl font-bold leading-tight text-charcoal md:text-4xl lg:text-5xl">
              {t.home.customEyebrow}
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
              {t.home.customLead}
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
            {formatMessage(t.home.customBody, { name: SITE_NAME })}
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.7, delay: 0.28, ease: "easeOut" }}
            className="mt-12 flex flex-wrap items-center justify-center gap-4"
          >
            <Link href="/custom-design">
              <Button size="lg" className="shadow-lg shadow-gold/20">
                {t.home.customStartCta}
              </Button>
            </Link>
            <Link href="/booking?service=custom_design">
              <Button variant="outline" size="lg">
                {t.home.customBookCta}
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
            {t.home.customJourney}
          </p>
        </motion.div>

        <div className="relative mt-14 md:mt-16">
          <div
            aria-hidden
            className="pointer-events-none absolute top-10 right-0 left-0 hidden h-px bg-gradient-to-l from-transparent via-gold/50 to-transparent lg:block"
          />
          <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {steps.map((step, index) => (
              <li key={step.title} className="relative text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-white text-gold shadow-sm">
                  <step.icon className="h-6 w-6" />
                </div>
                <p className="mt-2 text-xs tracking-[0.2em] text-gold">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-charcoal">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
