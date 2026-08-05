"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Dress } from "@/types";
import { ProductCardImageCarousel } from "@/components/shop/ProductCardImageCarousel";
import { WishlistButton } from "@/components/auth/WishlistButton";
import {
  ProductPrice,
  ProductSaleBadge,
} from "@/components/product/ProductPrice";
import { getDressStyleLabel } from "@/lib/styles";
import { featuredImage } from "@/lib/products/featured-image";
import { resolveProductPricing } from "@/lib/products/pricing";

interface DressCardProps {
  dress: Dress;
  index?: number;
}

export function DressCard({ dress, index = 0 }: DressCardProps) {
  const isRentalCategory =
    dress.category === "rental" || (!dress.price && !!dress.rental_price);
  const pricing = resolveProductPricing({
    price: dress.price,
    salePrice: dress.sale_price,
    rentalPrice: dress.rental_price,
    forceRental: isRentalCategory && dress.price == null,
  });
  const href = `/dresses/${dress.id}`;

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
          alt={dress.name_ar}
          href={href}
          roundedClassName="rounded-none"
          priority={index < 3}
        />
        <WishlistButton
          variant="icon"
          productKind="dress"
          productId={dress.id}
          productSlug={dress.id}
          productTitle={dress.name_ar}
          productImageUrl={featuredImage(dress.images)}
        />
        <ProductSaleBadge price={dress.price} salePrice={dress.sale_price} />
        {dress.is_featured && (
          <span className="pointer-events-none absolute top-4 end-4 z-20 rounded-full bg-gold px-3 py-1 text-xs font-medium text-white">
            مميز
          </span>
        )}
        {!dress.is_available && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-charcoal/50">
            <span className="rounded-full bg-white px-4 py-2 text-sm font-medium">
              غير متوفر
            </span>
          </div>
        )}
      </div>
      <Link href={href} className="block p-5">
        <h3 className="text-lg font-semibold text-charcoal transition-colors group-hover:text-gold">
          {dress.name_ar}
        </h3>
        {dress.style && (
          <p className="mt-1 text-sm text-muted">
            {getDressStyleLabel(dress.style)}
          </p>
        )}
        {pricing.currentPrice != null && (
          <ProductPrice
            className="mt-3"
            price={dress.price}
            salePrice={dress.sale_price}
            rentalPrice={dress.rental_price}
            forceRental={isRentalCategory && dress.price == null}
            priceSuffix={
              isRentalCategory && !pricing.onSale ? "/ إيجار" : undefined
            }
            showSaleBadge={false}
          />
        )}
      </Link>
    </motion.article>
  );
}
