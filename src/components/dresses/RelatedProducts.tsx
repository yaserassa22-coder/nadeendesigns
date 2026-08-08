"use client";

import { DressCard } from "@/components/dresses/DressCard";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dress } from "@/types";

interface RelatedProductsProps {
  dresses: Dress[];
  title?: string;
}

export function RelatedProducts({ dresses, title }: RelatedProductsProps) {
  const { t } = useLocale();
  if (!dresses.length) return null;
  const heading = title ?? t.product.related;

  return (
    <section className="mt-16 border-t border-beige-dark pt-16 md:mt-24 md:pt-20">
      <h2 className="mb-8 text-center text-2xl font-semibold text-charcoal md:text-3xl">
        {heading}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {dresses.map((dress, i) => (
          <DressCard key={dress.id} dress={dress} index={i} />
        ))}
      </div>
    </section>
  );
}
