"use client";

import Image from "next/image";
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
import { resolveCategoryHref } from "@/lib/categories/href";
import type { Category } from "@/types/category";
import {
  buildCategoryTree,
  isAccessoriesGroupCategory,
  isHomepageCategory,
} from "@/types/category";
import type { AccessoryShopItem } from "@/lib/data/shop-queries";
import { formatPrice } from "@/lib/utils";
import { featuredImage } from "@/lib/products/featured-image";

function serviceCardClassName(featured: boolean) {
  return [
    "group flex h-full min-h-[200px] w-full flex-col overflow-hidden rounded-2xl border bg-white transition-all hover:border-gold hover:shadow-lg hover:shadow-gold/10",
    featured
      ? "border-gold/70 ring-1 ring-gold/30"
      : "border-beige-dark",
  ].join(" ");
}

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
  veils: "طرحة عروس أنيقة تكمل إطلالتكِ بلمسة من السحر والرقي",
  bridal_robes: "برنص العروس الفاخر لجلسات التحضير والتصوير بأناقة مميزة",
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
  coverImageUrl,
  featured = false,
}: {
  href: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  coverImageUrl: string | null;
  featured?: boolean;
}) {
  return (
    <Link href={href} className={serviceCardClassName(featured)}>
      <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-beige via-beige-dark/40 to-gold/20">
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            aria-hidden
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/70 text-gold shadow-sm">
              <Icon className="h-7 w-7" />
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        {featured ? (
          <p className="mb-2 text-[11px] font-medium tracking-[0.2em] text-gold uppercase">
            مجموعة مميزة
          </p>
        ) : null}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold transition-colors group-hover:bg-gold group-hover:text-white">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-charcoal group-hover:text-gold">
          {title}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
          {description}
        </p>
      </div>
    </Link>
  );
}

interface ServicesSectionProps {
  categories: Category[];
  /** Published veils ∪ bridal_robes for the Bridal Accessories collection */
  accessoryProducts?: AccessoryShopItem[];
}

export function ServicesSection({
  categories,
  accessoryProducts = [],
}: ServicesSectionProps) {
  // Caller (getHomepageCategories) applies is_visible + show_on_homepage.
  const visible = categories.filter(isHomepageCategory);
  const tree = buildCategoryTree(visible);

  const dressRoots = tree.filter((n) => !isAccessoriesGroupCategory(n));
  const accessoriesRoot = tree.find((n) => isAccessoriesGroupCategory(n));
  const accessoryChildren = accessoriesRoot?.children ?? [];
  const showAccessories =
    Boolean(accessoriesRoot) &&
    (accessoryProducts.length > 0 || accessoryChildren.length > 0);

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
                  href={resolveCategoryHref(cat)}
                  title={cat.name_ar}
                  description={description}
                  Icon={Icon}
                  coverImageUrl={cat.cover_image_url}
                  featured={cat.featured_collection === true}
                />
              </Reveal>
            );
          })}
        </div>

        {showAccessories && accessoriesRoot && (
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
              {accessoryChildren.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {accessoryChildren.map((cat) => (
                    <Link
                      key={cat.id}
                      href={resolveCategoryHref(cat)}
                      className="rounded-full border border-beige-dark bg-white px-4 py-1.5 text-sm text-charcoal transition-colors hover:border-gold hover:text-gold"
                    >
                      {cat.name_ar}
                    </Link>
                  ))}
                  <Link
                    href={resolveCategoryHref(accessoriesRoot)}
                    className="rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-sm text-gold transition-colors hover:bg-gold hover:text-white"
                  >
                    عرض الكل
                  </Link>
                </div>
              )}
            </div>

            {accessoryProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {accessoryProducts.map((product, i) => {
                  const cover = featuredImage(product.images);
                  const Icon =
                    product.kind === "bridal_robe" ? Heart : Flower2;
                  return (
                    <Reveal
                      key={`${product.kind}-${product.id}`}
                      delay={0.2 + i * 0.05}
                      className="h-full"
                    >
                      <Link
                        href={product.href}
                        className={serviceCardClassName(false)}
                      >
                        <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-beige via-beige-dark/40 to-gold/20">
                          {cover ? (
                            <Image
                              src={cover}
                              alt=""
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            />
                          ) : (
                            <div
                              className="absolute inset-0 flex items-center justify-center"
                              aria-hidden
                            >
                              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/70 text-gold shadow-sm">
                                <Icon className="h-7 w-7" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-5">
                          <p className="text-xs tracking-wide text-gold">
                            {product.category}
                          </p>
                          <h3 className="mt-1 text-lg font-semibold text-charcoal group-hover:text-gold">
                            {product.name_ar}
                          </h3>
                          <p
                            className="mt-3 font-[family-name:var(--font-cormorant)] text-xl text-gold"
                            dir="ltr"
                          >
                            {formatPrice(product.price)}
                          </p>
                        </div>
                      </Link>
                    </Reveal>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
                {accessoryChildren.map((cat, i) => {
                  const Icon =
                    (cat.legacy_key && ICON_BY_LEGACY[cat.legacy_key]) ||
                    Flower2;
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
                        href={resolveCategoryHref(cat)}
                        title={cat.name_ar}
                        description={description}
                        Icon={Icon}
                        coverImageUrl={cat.cover_image_url}
                        featured={cat.featured_collection === true}
                      />
                    </Reveal>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
