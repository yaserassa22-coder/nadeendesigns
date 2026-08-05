import { cn, formatPrice } from "@/lib/utils";
import {
  resolveProductPricing,
  type ResolveProductPricingInput,
} from "@/lib/products/pricing";

export type ProductPriceSize = "sm" | "md" | "lg";

export type ProductPriceProps = ResolveProductPricingInput & {
  size?: ProductPriceSize;
  /**
   * SALE belongs on the image overlay (ProductCardOverlay), never beside price.
   * Kept for API compatibility; always ignored.
   * @deprecated
   */
  showSaleBadge?: boolean;
  /** Append rental suffix when pricing is rental-only. */
  priceSuffix?: string;
  className?: string;
};

const sizeClasses: Record<
  ProductPriceSize,
  { current: string; regular: string; gap: string }
> = {
  sm: {
    current: "text-base",
    regular: "text-xs",
    gap: "gap-1.5",
  },
  md: {
    current:
      "font-[family-name:var(--font-cormorant)] text-xl",
    regular: "text-sm",
    gap: "gap-2",
  },
  lg: {
    current:
      "font-[family-name:var(--font-cormorant)] text-3xl",
    regular: "text-lg",
    gap: "gap-3",
  },
};

/**
 * Single storefront pricing UI: Original · Sale · Discount % only.
 * SALE badge lives on ProductCardOverlay (top-left), never beside price.
 */
export function ProductPrice({
  price,
  salePrice,
  rentalPrice,
  forceRental,
  size = "md",
  priceSuffix,
  className,
}: ProductPriceProps) {
  const pricing = resolveProductPricing({
    price,
    salePrice,
    rentalPrice,
    forceRental,
  });

  if (pricing.currentPrice == null) return null;

  const sizes = sizeClasses[size];
  const suffix =
    priceSuffix ?? (pricing.isRental ? "/ إيجار" : undefined);

  if (pricing.onSale && pricing.regularPrice != null && pricing.salePrice != null) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-baseline",
          sizes.gap,
          className
        )}
        dir="ltr"
      >
        <span className={cn("text-muted line-through", sizes.regular)}>
          {formatPrice(pricing.regularPrice)}
        </span>
        <span className={cn("text-gold", sizes.current)}>
          {formatPrice(pricing.salePrice)}
        </span>
        {pricing.discountPercent != null && (
          <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium text-gold">
            {pricing.discountPercent}% OFF
          </span>
        )}
      </div>
    );
  }

  return (
    <p className={cn("text-gold", sizes.current, className)} dir="ltr">
      {formatPrice(pricing.currentPrice)}
      {suffix && (
        <span className="ms-1 text-sm text-muted" dir="rtl">
          {suffix}
        </span>
      )}
    </p>
  );
}

/**
 * Compact SALE pill for product image overlays.
 * Positioning belongs to `ProductCardOverlay` — do not add absolute coords here.
 */
export function ProductSaleBadge({
  price,
  salePrice,
  className,
}: {
  price?: number | null;
  salePrice?: number | null;
  className?: string;
}) {
  const pricing = resolveProductPricing({ price, salePrice });
  if (!pricing.onSale) return null;

  return (
    <span
      className={cn(
        "pointer-events-none inline-flex rounded-full bg-charcoal/90 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white uppercase backdrop-blur-[2px]",
        className
      )}
    >
      SALE
    </span>
  );
}
