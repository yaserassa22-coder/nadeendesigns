import type { ReactNode } from "react";
import { formatPrice } from "@/lib/utils";
import { ProductDescription } from "@/components/product/ProductDescription";
import { ProductGallery } from "@/components/product/ProductGallery";

interface ProductDetailLayoutProps {
  images: string[];
  name: string;
  categoryLabel?: string;
  price: number | null | undefined;
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
            {price != null && (
              <p
                className="mt-4 font-[family-name:var(--font-cormorant)] text-3xl text-gold"
                dir="ltr"
              >
                {formatPrice(price)}
                {priceSuffix && (
                  <span className="ms-2 text-base text-muted" dir="rtl">
                    {priceSuffix}
                  </span>
                )}
              </p>
            )}

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
