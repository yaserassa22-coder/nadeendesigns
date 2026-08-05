import type { ReactNode } from "react";
import { ProductDescription } from "@/components/product/ProductDescription";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPrice } from "@/components/product/ProductPrice";
import { ProductCardBadges } from "@/components/product/ProductCardBadges";

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
  meta?: ReactNode;
  /** Purchase CTAs only — immediately below price. */
  actions?: ReactNode;
  below?: ReactNode;
  related?: ReactNode;
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
  unavailableMessage = "نفد المخزون",
  availabilityLabel,
  isFeatured,
  tags,
  galleryWishlist,
  meta,
  actions,
  below,
  related,
}: ProductDetailLayoutProps) {
  const showAvailability =
    availabilityLabel ??
    (available ? "✓ متوفر" : unavailableMessage);

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
            {categoryLabel && (
              <p className="text-xs tracking-[0.22em] text-gold uppercase md:text-sm">
                {categoryLabel}
              </p>
            )}
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

            {actions && (
              <div className="mt-7 w-full">{actions}</div>
            )}

            {meta && (
              <div className="mt-8 flex flex-wrap gap-2">{meta}</div>
            )}

            {description ? (
              <div className="mt-10 border-t border-beige-dark/60 pt-8">
                <ProductDescription text={description} className="mt-0" />
              </div>
            ) : null}
          </div>
        </div>

        {below}
        {related}
      </div>
    </section>
  );
}
