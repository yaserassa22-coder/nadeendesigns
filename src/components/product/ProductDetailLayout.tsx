"use client";

import type { ReactNode } from "react";
import { Palette, Ruler } from "lucide-react";
import { ProductDescription } from "@/components/product/ProductDescription";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPrice } from "@/components/product/ProductPrice";
import { ProductCardBadges } from "@/components/product/ProductCardBadges";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  localizeArabicProductText,
  resolveDressColorLabel,
  resolveDressMaterialLabel,
  resolveDressStyleLabel,
} from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/types";

export type ProductDetailMetaItem = {
  key: string;
  /** Raw DB value (preferred) or pre-resolved label — localized with live locale. */
  label: string;
  icon?: "palette" | "ruler";
};

interface ProductDetailLayoutProps {
  images: string[];
  name: string;
  categoryLabel?: string;
  /** Regular / list price (`price` column). */
  price: number | null | undefined;
  /** Optional sale price — when lower than price, shows strikethrough + % OFF. */
  salePrice?: number | null;
  rentalPrice?: number | null;
  priceSuffix?: string;
  description?: string | null;
  available?: boolean;
  unavailableMessage?: string;
  /** Availability status only (never exact inventory counts). */
  availabilityLabel?: string | null;
  /** Optional featured / tags for gallery SALE + badge overlay (TL). */
  isFeatured?: boolean | null;
  tags?: string[] | null;
  /** Wishlist control for gallery overlay (TR). */
  galleryWishlist?: ReactNode;
  /** Attribute chips — serializable data so list keys stay in this component. */
  metaItems?: ProductDetailMetaItem[];
  /** Purchase CTAs only — immediately below price. */
  actions?: ReactNode;
  below?: ReactNode;
  related?: ReactNode;
}

function MetaIcon({
  name,
}: {
  name: NonNullable<ProductDetailMetaItem["icon"]>;
}) {
  if (name === "palette") {
    return <Palette className="h-4 w-4 text-gold" aria-hidden />;
  }
  return <Ruler className="h-4 w-4 text-gold" aria-hidden />;
}

function resolveMetaLabel(key: string, raw: string, locale: Locale): string {
  const value = raw.trim();
  if (!value) return "";
  if (key === "color") return resolveDressColorLabel(value, locale);
  if (key === "material") return resolveDressMaterialLabel(value, locale);
  if (key === "style") return resolveDressStyleLabel(value, locale);
  if (/[\u0600-\u06FF]/.test(value) && locale !== "ar") {
    return localizeArabicProductText(value, locale);
  }
  return value;
}

/**
 * Shared PDP shell for dresses, veils, and bridal robes.
 * Luxury hierarchy: title → price → availability → CTAs → details further down.
 * Purchase area stays clean — no instructional / personalization chrome.
 */
export function ProductDetailLayout({
  images,
  name,
  categoryLabel,
  price,
  salePrice,
  rentalPrice,
  priceSuffix,
  description,
  available = true,
  unavailableMessage,
  availabilityLabel,
  isFeatured,
  tags,
  galleryWishlist,
  metaItems,
  actions,
  below,
  related,
}: ProductDetailLayoutProps) {
  const { t, locale } = useLocale();
  const unavailable = unavailableMessage ?? t.productExtras.outOfStock;
  const showAvailability =
    availabilityLabel ??
    (available ? t.productExtras.inStock : unavailable);
  const chips = (metaItems ?? [])
    .map((item) => ({
      ...item,
      label: resolveMetaLabel(item.key, item.label, locale),
    }))
    .filter((item) => item.label.trim());

  const resolvedDescription =
    description && /[\u0600-\u06FF]/.test(description) && locale !== "ar"
      ? localizeArabicProductText(description, locale)
      : description;

  return (
    <section className="pt-28 pb-16 md:pt-36 md:pb-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 lg:items-start">
          <ProductGallery
            images={images}
            alt={name}
            badges={
              <ProductCardBadges
                price={price}
                salePrice={salePrice}
                isFeatured={isFeatured}
                tags={tags}
              />
            }
            wishlist={galleryWishlist}
          />

          <div className="min-w-0 lg:sticky lg:top-32">
            {categoryLabel ? (
              <p className="text-xs tracking-[0.22em] text-gold uppercase md:text-sm">
                {categoryLabel}
              </p>
            ) : null}
            <h1 className="mt-3 font-[family-name:var(--font-cormorant)] text-4xl font-semibold leading-tight tracking-wide text-charcoal md:text-5xl">
              {name}
            </h1>

            <div className="mt-5">
              <ProductPrice
                size="lg"
                price={price}
                salePrice={salePrice}
                rentalPrice={rentalPrice}
                priceSuffix={priceSuffix}
              />

              <p
                className={
                  available
                    ? "mt-2 text-sm text-charcoal/70"
                    : "mt-2 text-sm font-medium text-red-600"
                }
              >
                {showAvailability}
              </p>
            </div>

            {actions ? <div className="mt-7 w-full">{actions}</div> : null}

            {chips.length > 0 ? (
              <div className="mt-8 flex flex-wrap gap-2">
                {chips.map((item) => (
                  <span
                    key={item.key}
                    className="inline-flex items-center gap-2 rounded-full bg-beige px-4 py-2 text-sm"
                  >
                    {item.icon ? <MetaIcon name={item.icon} /> : null}
                    {item.label}
                  </span>
                ))}
              </div>
            ) : null}

            {resolvedDescription ? (
              <div className="mt-10 border-t border-beige-dark/60 pt-8">
                <ProductDescription text={resolvedDescription} className="mt-0" />
              </div>
            ) : null}
          </div>
        </div>

        {[
          below != null ? <div key="pdp-below">{below}</div> : null,
          related != null ? <div key="pdp-related">{related}</div> : null,
        ]}
      </div>
    </section>
  );
}
