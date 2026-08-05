import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Luxury product-card overlay slots — physical corners (LTR/RTL-invariant).
 *
 * Design choice: use physical `left`/`right` (not inline-start/end) so the
 * storefront keeps a consistent screen layout across directions as specified:
 * - Top Left — badges only
 * - Top Right — wishlist only
 * - Bottom Right — image counter (multi-image only)
 * - Bottom Left — reserved (empty)
 *
 * Safe edge inset: 12px. Badge stack gap: 8px.
 * No card may ad-hoc-position these chrome elements — use this layout only.
 */

export const PRODUCT_CARD_OVERLAY_INSET = "12px";

type ProductCardOverlayProps = {
  badges?: ReactNode;
  wishlist?: ReactNode;
  imageCounter?: ReactNode;
  /** Optional chrome for the reserved bottom-left slot (default empty). */
  bottomLeft?: ReactNode;
  className?: string;
};

export function ProductCardOverlay({
  badges,
  wishlist,
  imageCounter,
  bottomLeft,
  className,
}: ProductCardOverlayProps) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-20", className)}
      data-product-card-overlay=""
    >
      {/* Top Left — badges */}
      <div
        className="absolute top-3 left-3 flex max-w-[min(70%,11rem)] flex-col items-start gap-2"
        data-slot="badges"
      >
        {badges}
      </div>

      {/* Top Right — wishlist */}
      {wishlist ? (
        <div
          className="pointer-events-auto absolute top-3 right-3"
          data-slot="wishlist"
        >
          {wishlist}
        </div>
      ) : null}

      {/* Bottom Right — image counter */}
      {imageCounter ? (
        <div
          className="absolute bottom-3 right-3"
          data-slot="image-counter"
        >
          {imageCounter}
        </div>
      ) : null}

      {/* Bottom Left — reserved */}
      <div
        className="absolute bottom-3 left-3"
        data-slot="bottom-left"
        aria-hidden={bottomLeft == null}
      >
        {bottomLeft}
      </div>
    </div>
  );
}

/** Compact `1/4` counter for multi-image product cards. */
export function ProductCardImageCounter({
  current,
  total,
  className,
}: {
  current: number;
  total: number;
  className?: string;
}) {
  if (total < 2) return null;

  return (
    <span
      className={cn(
        "pointer-events-none inline-flex min-w-[2.5rem] items-center justify-center rounded-full bg-charcoal/75 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white tabular-nums backdrop-blur-[2px]",
        className
      )}
      dir="ltr"
      aria-hidden
    >
      {current}/{total}
    </span>
  );
}
