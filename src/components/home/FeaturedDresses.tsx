"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Dress } from "@/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DressCard } from "@/components/dresses/DressCard";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/components/i18n/LocaleProvider";

interface FeaturedDressesProps {
  dresses: Dress[];
}

export function FeaturedDresses({ dresses }: FeaturedDressesProps) {
  const { t } = useLocale();
  if (dresses.length === 0) {
    return (
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 text-center md:px-8">
          <SectionHeading
            subtitle={t.home.featuredSubtitle}
            title={t.home.featuredTitle}
            description={t.home.featuredEmpty}
          />
          <Link href="/wedding-dresses">
            <Button variant="outline" size="lg">
              <ArrowLeft className="h-4 w-4" />
              {t.home.browseWedding}
            </Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeading
          subtitle={t.home.featuredSubtitle}
          title={t.home.featuredTitle}
          description={t.home.featuredDescription}
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {dresses.map((dress, i) => (
            <DressCard key={dress.id} dress={dress} index={i} />
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/wedding-dresses">
            <Button variant="outline" size="lg">
              <ArrowLeft className="h-4 w-4" />
              {t.home.viewAllDresses}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
