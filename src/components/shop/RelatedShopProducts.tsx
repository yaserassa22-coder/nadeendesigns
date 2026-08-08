"use client";

import Link from "next/link";
import { ProductCardImageCarousel } from "@/components/shop/ProductCardImageCarousel";
import { WishlistButton } from "@/components/auth/WishlistButton";
import { ProductPrice } from "@/components/product/ProductPrice";
import { featuredImage } from "@/lib/products/featured-image";
import { inferWishlistKind } from "@/lib/shop/wishlist";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  localizedName,
  resolveCatalogLabel,
  resolveDressColorLabel,
  resolveDressMaterialLabel,
} from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/types";

export type RelatedShopItem = {
  id: string;
  name_ar: string;
  name_en?: string | null;
  name_he?: string | null;
  price: number;
  sale_price?: number | null;
  images: string[];
  href: string;
  /** Raw color / material / category / size — localized on the client. */
  subtitle?: string;
  kind?: string;
  is_featured?: boolean;
  tags?: string[] | null;
};

interface RelatedShopProductsProps {
  items: RelatedShopItem[];
  title?: string;
}

function localizeSubtitle(raw: string, locale: Locale): string {
  const value = raw.trim();
  if (!value) return "";
  const asColor = resolveDressColorLabel(value, locale);
  if (asColor && asColor !== value) return asColor;
  const asMaterial = resolveDressMaterialLabel(value, locale);
  if (asMaterial && asMaterial !== value) return asMaterial;
  const asCatalog = resolveCatalogLabel(value, locale);
  if (asCatalog && asCatalog !== value) return asCatalog;
  return asColor || asMaterial || value;
}

export function RelatedShopProducts({
  items,
  title,
}: RelatedShopProductsProps) {
  const { t, locale } = useLocale();
  if (!items.length) return null;
  const heading = title ?? t.product.related;

  return (
    <section className="mt-16 border-t border-beige-dark pt-16 md:mt-24 md:pt-20">
      <h2 className="mb-8 text-center text-2xl font-semibold text-charcoal md:text-3xl">
        {heading}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => {
          const displayName = localizedName(item, locale, item.name_ar);
          const subtitle = item.subtitle
            ? localizeSubtitle(item.subtitle, locale)
            : "";
          return (
            <article
              key={item.id}
              className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-xl"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="relative">
                <ProductCardImageCarousel
                  images={item.images}
                  alt={displayName}
                  href={item.href}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  overlay={{
                    price: item.price,
                    salePrice: item.sale_price,
                    isFeatured: item.is_featured,
                    tags: item.tags,
                    wishlist: (
                      <WishlistButton
                        variant="icon"
                        productKind={inferWishlistKind({
                          kind: item.kind,
                          href: item.href,
                        })}
                        productId={item.id}
                        productSlug={item.id}
                        productTitle={displayName}
                        productImageUrl={featuredImage(item.images)}
                      />
                    ),
                  }}
                />
              </div>
              <Link href={item.href} className="block p-5">
                <h3 className="text-lg font-semibold text-charcoal transition-colors group-hover:text-gold">
                  {displayName}
                </h3>
                {subtitle ? (
                  <p className="mt-1 text-sm text-muted">{subtitle}</p>
                ) : null}
                <ProductPrice
                  className="mt-2"
                  price={item.price}
                  salePrice={item.sale_price}
                  showSaleBadge={false}
                />
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
