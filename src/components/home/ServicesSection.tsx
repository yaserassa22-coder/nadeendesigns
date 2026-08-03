"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Gem,
  Heart,
  Sparkles,
  WandSparkles,
  Flower2,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Category } from "@/types/category";
import { buildCategoryTree } from "@/types/category";

const cardClassName =
  "group flex h-full min-h-[200px] w-full flex-col rounded-2xl border border-beige-dark bg-white p-6 transition-all hover:border-gold hover:shadow-lg hover:shadow-gold/10";

const ICON_BY_LEGACY: Record<string, LucideIcon> = {
  wedding: Crown,
  nouf_dresses: Gem,
  rental: Sparkles,
  custom_design: WandSparkles,
  veils: Flower2,
  bridal_robes: Heart,
};

const FALLBACK_DESC: Record<string, string> = {
  wedding: "تصاميم فاخرة من أفخر الأقمشة العالمية لإطلالة لا تُنسى",
  nouf_dresses:
    "اكتشفي مجموعة فساتين نوف الحصرية، بتصاميم تجمع بين الأناقة، الفخامة، والتفاصيل الراقية",
  rental: "إطلالة أحلامك بأسعار مناسبة مع خدمة تنظيف وصيانة",
  custom_design: "صممي فستانكِ معنا من الصفر — قطعة فريدة على مقاسكِ وذوقكِ",
  veils: "طرحات أنيقة تكمل إطلالتكِ بلمسة من السحر والرقي",
  bridal_robes: "برنص فاخر لجلسات التحضير والتصوير بأناقة مميزة",
};

const emptySubscribe = () => () => {};

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  // Client-only framer-motion to avoid SSR/client style hydration mismatch.
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

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

function ServiceCard({
  href,
  title,
  description,
  Icon,
}: {
  href: string;
  title: string;
  description: string;
  Icon: LucideIcon;
}) {
  return (
    <Link href={href} className={cardClassName}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold transition-colors group-hover:bg-gold group-hover:text-white">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-charcoal group-hover:text-gold">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
        {description}
      </p>
    </Link>
  );
}

interface ServicesSectionProps {
  categories: Category[];
}

export function ServicesSection({ categories }: ServicesSectionProps) {
  const visible = categories.filter((c) => c.is_visible);
  const tree = buildCategoryTree(visible);

  const dressRoots = tree.filter(
    (n) => n.legacy_key !== "bridal_accessories" && n.href
  );
  const accessoriesRoot = tree.find(
    (n) => n.legacy_key === "bridal_accessories"
  );
  const accessoryChildren = (accessoriesRoot?.children ?? []).filter(
    (c) => c.href
  );

  return (
    <section id="categories" className="bg-beige/30 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeading
          subtitle="خدماتنا"
          title="تجربة فاخرة من الألف إلى الياء"
          description="نقدم لكِ تجربة متكاملة تجعل رحلة اختيار فستان أحلامك لا تُنسى"
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {dressRoots.map((cat, i) => {
            const Icon =
              (cat.legacy_key && ICON_BY_LEGACY[cat.legacy_key]) || Crown;
            const description =
              cat.description_ar?.trim() ||
              (cat.legacy_key && FALLBACK_DESC[cat.legacy_key]) ||
              "";
            return (
              <Reveal key={cat.id} delay={i * 0.08} className="h-full">
                <ServiceCard
                  href={cat.href!}
                  title={cat.name_ar}
                  description={description}
                  Icon={Icon}
                />
              </Reveal>
            );
          })}
        </div>

        {accessoriesRoot && accessoryChildren.length > 0 && (
          <div className="mt-14">
            <div className="mb-6 text-center">
              <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.25em] text-gold uppercase">
                Accessories
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-charcoal">
                {accessoriesRoot.name_ar}
              </h3>
              {accessoriesRoot.description_ar?.trim() ? (
                <p className="mt-2 text-sm text-muted">
                  {accessoriesRoot.description_ar}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
              {accessoryChildren.map((cat, i) => {
                const Icon =
                  (cat.legacy_key && ICON_BY_LEGACY[cat.legacy_key]) || Flower2;
                const description =
                  cat.description_ar?.trim() ||
                  (cat.legacy_key && FALLBACK_DESC[cat.legacy_key]) ||
                  "";
                return (
                  <Reveal
                    key={cat.id}
                    delay={0.32 + i * 0.08}
                    className="h-full w-full max-w-sm"
                  >
                    <ServiceCard
                      href={cat.href!}
                      title={cat.name_ar}
                      description={description}
                      Icon={Icon}
                    />
                  </Reveal>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
