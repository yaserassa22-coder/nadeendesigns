"use client";

import type { Dress } from "@/types";
import { HomeQuietLink } from "@/components/home/HomeQuietLink";
import { HomeProductTile } from "@/components/home/HomeProductTile";
import { featuredImage } from "@/lib/products/featured-image";
import { resolveProductPricing } from "@/lib/products/pricing";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { localizedName } from "@/lib/i18n";
import { cn, formatPrice } from "@/lib/utils";

interface FeaturedDressesProps {
  dresses: Dress[];
}

export function FeaturedDresses({ dresses }: FeaturedDressesProps) {
  const { t, locale } = useLocale();

  if (dresses.length === 0) {
    return (
      <section className="bg-white pt-8 pb-2 md:pt-10">
        <div className="mx-auto max-w-[100rem] px-3 text-center md:px-5">
          <p className="font-[family-name:var(--font-cormorant)] text-[10px] tracking-[0.32em] text-gold uppercase md:text-xs">
            {t.home.featuredSubtitle}
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-cormorant)] text-xl tracking-[0.1em] text-charcoal uppercase md:text-2xl">
            {t.home.featuredTitle}
          </h2>
          <p className="mt-3 text-sm text-muted">{t.home.featuredEmpty}</p>
          <div className="mt-6">
            <HomeQuietLink href="/wedding-dresses">
              {t.home.browseWedding}
            </HomeQuietLink>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white pt-8 md:pt-10">
      <div className="w-full px-1 sm:px-1.5">
        <div className="mb-4 px-2 text-center md:mb-5">
          <p className="font-[family-name:var(--font-cormorant)] text-[10px] tracking-[0.32em] text-gold uppercase md:text-xs">
            {t.home.featuredSubtitle}
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-cormorant)] text-lg tracking-[0.12em] text-charcoal uppercase md:text-xl">
            {t.home.featuredTitle}
          </h2>
        </div>
        <div
          className={cn(
            "grid grid-cols-2 gap-1 sm:gap-1.5 lg:gap-1.5",
            dresses.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
          )}
        >
          {dresses.map((dress, i) => {
            const title = localizedName(dress, locale, dress.name_ar);
            const cover = featuredImage(dress.images);
            const pricing = resolveProductPricing({
              price: dress.price,
              salePrice: dress.sale_price,
              rentalPrice: dress.rental_price,
            });
            const priceLabel =
              pricing.currentPrice != null
                ? formatPrice(pricing.currentPrice)
                : null;
            return (
              <HomeProductTile
                key={dress.id}
                href={`/dresses/${dress.id}`}
                imageUrl={cover}
                title={title}
                priceLabel={priceLabel}
                priority={i < 4}
                wishlist={{
                  productKind: "dress",
                  productId: dress.id,
                  productSlug: dress.id,
                }}
              />
            );
          })}
        </div>
        <div className="mt-5 flex justify-center pb-1 md:mt-6">
          <HomeQuietLink href="/wedding-dresses">
            {t.nav.viewCollection}
          </HomeQuietLink>
        </div>
      </div>
    </section>
  );
}
