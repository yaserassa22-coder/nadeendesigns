import type { ReactNode } from "react";
import { ProductDescription } from "@/components/product/ProductDescription";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPrice } from "@/components/product/ProductPrice";

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
  meta?: ReactNode;
  actions?: ReactNode;
  below?: ReactNode;
  related?: ReactNode;
}

/**
 * Shared PDP shell for dresses, veils, and bridal robes.
 * Preserves luxury two-column layout; page-specific CTAs stay in slots.
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
  unavailableMessage = "هذا المنتج غير متوفر حاليًا",
  meta,
  actions,
  below,
  related,
}: ProductDetailLayoutProps) {
  return (
    <section className="pt-28 pb-16 md:pt-36 md:pb-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
          <ProductGallery images={images} alt={name} />

          <div className="min-w-0">
            {categoryLabel && (
              <p className="text-sm tracking-wide text-gold">{categoryLabel}</p>
            )}
            <h1 className="mt-2 text-3xl font-bold text-charcoal md:text-4xl">
              {name}
            </h1>
            <ProductPrice
              className="mt-4"
              size="lg"
              price={price}
              salePrice={salePrice}
              rentalPrice={rentalPrice}
              priceSuffix={priceSuffix}
            />

            <ProductDescription text={description} />

            {meta && <div className="mt-8 flex flex-wrap gap-3">{meta}</div>}

            {actions && <div className="mt-10 flex flex-wrap gap-4">{actions}</div>}

            {!available && (
              <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                {unavailableMessage}
              </p>
            )}
          </div>
        </div>

        {below}
        {related}
      </div>
    </section>
  );
}
