"use client";

import type { ReactNode } from "react";
import { ShoppingBag, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type PurchaseCtaSize = "sm" | "md" | "lg";

type Props = {
  /** Compact wishlist control (icon button). Same height as purchase CTAs. */
  wishlist?: ReactNode;
  onAddToCart: () => void;
  onBuyNow: () => void;
  addLabel?: string;
  buyLabel?: string;
  disabled?: boolean;
  size?: PurchaseCtaSize;
  className?: string;
  /** Optional status line under the row (e.g. added to cart). */
  message?: string;
  /** Show cancel / tertiary ghost action (modal). */
  secondaryAction?: ReactNode;
  /** Feature / purchase-flow gates — default true (backward compatible). */
  showAddToCart?: boolean;
  showBuyNow?: boolean;
};

const heightClass: Record<PurchaseCtaSize, string> = {
  sm: "h-[var(--xp-cta-height-sm)] px-5 text-sm",
  md: "h-[var(--xp-cta-height)] px-6 text-sm",
  lg: "h-[var(--xp-cta-height)] px-6 text-base",
};

const iconClass = "h-[var(--xp-cta-icon)] w-[var(--xp-cta-icon)] shrink-0";

/**
 * Unified luxury purchase chrome: Wishlist · Add to Cart · Buy Now.
 * Composes shared Button for consistent hover/focus/disabled behavior.
 */
export function PurchaseCtaGroup({
  wishlist,
  onAddToCart,
  onBuyNow,
  addLabel = "أضيفي للسلة",
  buyLabel = "شراء الآن",
  disabled = false,
  size = "lg",
  className,
  message,
  secondaryAction,
  showAddToCart = true,
  showBuyNow = true,
}: Props) {
  const h = heightClass[size];

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className="flex flex-col gap-[var(--xp-cta-gap)] sm:flex-row sm:items-center"
        data-purchase-cta-group=""
      >
        {wishlist ? (
          <div
            className={cn(
              "flex shrink-0 items-center justify-center sm:self-stretch",
              "[&_button]:h-[var(--xp-cta-height)] [&_button]:w-[var(--xp-cta-height)]",
              size === "sm" &&
                "[&_button]:h-[var(--xp-cta-height-sm)] [&_button]:w-[var(--xp-cta-height-sm)]",
              "[&_svg]:h-[var(--xp-cta-icon)] [&_svg]:w-[var(--xp-cta-icon)]"
            )}
          >
            {wishlist}
          </div>
        ) : null}

        {showAddToCart ? (
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={onAddToCart}
            className={cn(
              "flex-1 rounded-[var(--xp-cta-radius)] py-0 shadow-none",
              h
            )}
          >
            <ShoppingBag className={iconClass} strokeWidth={1.75} />
            {addLabel}
          </Button>
        ) : null}

        {showBuyNow ? (
          <Button
            type="button"
            variant="primary"
            disabled={disabled}
            onClick={onBuyNow}
            className={cn(
              "flex-1 rounded-[var(--xp-cta-radius)] py-0",
              h
            )}
          >
            <Zap className={iconClass} strokeWidth={1.75} />
            {buyLabel}
          </Button>
        ) : null}

        {secondaryAction ? (
          <div className="flex shrink-0 sm:order-last">{secondaryAction}</div>
        ) : null}
      </div>

      {message ? (
        <p className="text-sm text-gold" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
