import type { ReactNode } from "react";
import { Truck } from "lucide-react";
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
  /** Short shipping / fulfilment note under price. */
  shippingNote?: string | null;
  /** Availability line under shipping (e.g. in stock). */
  availabilityLabel?: string | null;
  meta?: ReactNode;
  actions?: ReactNode;
  below?: ReactNode;
  related?: ReactNode;
}

/**
 * Shared PDP shell for dresses, veils, and bridal robes.
 * Luxury hierarchy: title → price → shipping/availability → description → CTAs.
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
  shippingNote,
  availabilityLabel,
  meta,
  actions,
  below,
  related,
}: ProductDetailLayoutProps) {
  const showAvailability =
    availabilityLabel ??
    (available ? "متوفر · جاهز للطلب" : unavailableMessage);

  return (
    <section className="pt-28 pb-16 md:pt-36 md:pb-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 lg:items-start">
          <ProductGallery images={images} alt={name} />

          <div className="min-w-0 lg:sticky lg:top-32">
            {categoryLabel && (
              <p className="text-xs tracking-[0.22em] text-gold uppercase md:text-sm">
                {categoryLabel}
              </p>
            )}
            <h1 className="mt-3 font-[family-name:var(--font-cormorant)] text-4xl font-semibold leading-tight tracking-wide text-charcoal md:text-5xl">
              {name}
            </h1>

            <div className="mt-6 border-b border-beige-dark/80 pb-6">
              <ProductPrice
                size="lg"
                price={price}
                salePrice={salePrice}
                rentalPrice={rentalPrice}
                priceSuffix={priceSuffix}
              />

              <div className="mt-4 space-y-2 text-sm text-muted">
                {shippingNote ? (
                  <p className="inline-flex items-start gap-2">
                    <Truck
                      className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                      strokeWidth={1.75}
                    />
                    <span>{shippingNote}</span>
                  </p>
                ) : null}
                <p
                  className={
                    available
                      ? "text-charcoal/80"
                      : "font-medium text-red-600"
                  }
                >
                  {showAvailability}
                </p>
              </div>
            </div>

            <ProductDescription text={description} />

            {meta && (
              <div className="mt-8 flex flex-wrap gap-2.5">{meta}</div>
            )}

            {actions && (
              <div className="mt-10 w-full space-y-4">{actions}</div>
            )}
          </div>
        </div>

        {below}
        {related}
      </div>
    </section>
  );
}
