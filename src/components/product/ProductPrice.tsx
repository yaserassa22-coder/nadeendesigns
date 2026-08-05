import { cn, formatPrice } from "@/lib/utils";
import {
  resolveProductPricing,
  type ResolveProductPricingInput,
} from "@/lib/products/pricing";

export type ProductPriceSize = "sm" | "md" | "lg";

export type ProductPriceProps = ResolveProductPricingInput & {
  size?: ProductPriceSize;
  /** Show “SALE” pill next to the price row (cards / PDP). */
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
 * Single storefront pricing UI: regular only, or strikethrough + sale + % OFF + SALE.
 */
export function ProductPrice({
  price,
  salePrice,
  rentalPrice,
  forceRental,
  size = "md",
  showSaleBadge = true,
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
        {showSaleBadge && (
          <span className="rounded-full bg-charcoal px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
            SALE
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

/** Compact SALE pill for product image overlays. */
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
        "pointer-events-none absolute top-4 start-4 z-20 rounded-full bg-charcoal px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase",
        className
      )}
    >
      SALE
    </span>
  );
}
