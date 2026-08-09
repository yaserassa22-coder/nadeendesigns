"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Dress } from "@/types";
import { ProductCardImageCarousel } from "@/components/shop/ProductCardImageCarousel";
import { WishlistButton } from "@/components/auth/WishlistButton";
import { ProductPrice } from "@/components/product/ProductPrice";
import { HomeEditorialTile } from "@/components/home/HomeEditorialTile";
import { getDressStyleLabel } from "@/lib/styles";
import { featuredImage } from "@/lib/products/featured-image";
import { resolveProductPricing } from "@/lib/products/pricing";
import {
  getProductPrimaryAction,
  resolveProductCommerceType,
} from "@/lib/products/primary-action";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { localizedName } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface DressCardProps {
  dress: Dress;
  index?: number;
  /** Editorial homepage presentation — image-first, quieter chrome. */
  variant?: "catalog" | "editorial";
}

export function DressCard({
  dress,
  index = 0,
  variant = "catalog",
}: DressCardProps) {
  const { t, locale } = useLocale();
  const displayName = localizedName(dress, locale, dress.name_ar);
  // Rental presentation from product_type ONLY — never category name
  const commerceType = resolveProductCommerceType(dress.product_type);
  const primaryAction = getProductPrimaryAction(
    commerceType,
    "ready_to_buy",
    locale
  );
  const isRental = primaryAction.isRentalPresentation;
  const pricing = resolveProductPricing({
    price: dress.price,
    salePrice: dress.sale_price,
    rentalPrice: dress.rental_price,
    forceRental: isRental && dress.price == null,
  });
  const href = `/dresses/${dress.id}`;
  const cover = featuredImage(dress.images);
  const editorial = variant === "editorial";

  const wishlist = (
    <WishlistButton
      variant="icon"
      productKind="dress"
      productId={dress.id}
      productSlug={dress.id}
      productTitle={displayName}
      productImageUrl={cover}
    />
  );

  const meta = (
    <>
      <h3
        className={cn(
          "text-charcoal transition-colors group-hover:text-gold",
          editorial
            ? "text-sm font-normal tracking-wide md:text-base"
            : "text-lg font-semibold"
        )}
      >
        {displayName}
      </h3>
      {dress.style &&
        (() => {
          const styleLabel = getDressStyleLabel(dress.style, locale);
          if (!styleLabel) return null;
          return (
            <p
              className={cn(
                "text-muted",
                editorial ? "mt-0.5 text-xs" : "mt-1 text-sm"
              )}
            >
              {styleLabel}
            </p>
          );
        })()}
      {pricing.currentPrice != null && (
        <ProductPrice
          className={editorial ? "mt-2" : "mt-3"}
          price={dress.price}
          salePrice={dress.sale_price}
          rentalPrice={dress.rental_price}
          forceRental={isRental && dress.price == null}
          priceSuffix={
            isRental && !pricing.onSale ? t.product.rentalSuffix : undefined
          }
          showSaleBadge={false}
        />
      )}
    </>
  );

  if (editorial) {
    const styleLabel = dress.style
      ? getDressStyleLabel(dress.style, locale)
      : null;
    return (
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.55, delay: index * 0.05 }}
        className="relative"
      >
        <HomeEditorialTile
          href={href}
          imageUrl={cover}
          title={displayName}
          eyebrow={styleLabel || undefined}
          priority={index < 4}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        <div className="absolute end-3 top-3 z-20">{wishlist}</div>
        {!dress.is_available && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-charcoal/45">
            <span className="bg-ivory/95 px-3 py-1.5 text-xs tracking-wide text-charcoal">
              {t.product.outOfStock}
            </span>
          </div>
        )}
      </motion.article>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="relative">
        <ProductCardImageCarousel
          images={dress.images}
          alt={displayName}
          href={href}
          roundedClassName="rounded-none"
          priority={index < 3}
          overlay={{
            price: dress.price,
            salePrice: dress.sale_price,
            isFeatured: dress.is_featured,
            tags: dress.tags,
            wishlist,
          }}
        />
        {!dress.is_available && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-charcoal/50">
            <span className="rounded-full bg-white px-4 py-2 text-sm font-medium">
              {t.product.outOfStock}
            </span>
          </div>
        )}
      </div>
      <Link href={href} className="block p-5">
        {meta}
      </Link>
    </motion.article>
  );
}
