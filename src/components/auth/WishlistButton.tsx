"use client";

import { useState, type MouseEvent } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/components/shop/WishlistProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";

type Props = {
  productKind: string;
  productId: string;
  productSlug?: string | null;
  productTitle?: string | null;
  productImageUrl?: string | null;
  price?: number | null;
  salePrice?: number | null;
  nameAr?: string | null;
  nameEn?: string | null;
  nameHe?: string | null;
  className?: string;
  /** Full PDP control vs compact card heart */
  variant?: "button" | "icon";
};

export function WishlistButton({
  productKind,
  productId,
  productSlug,
  productTitle,
  productImageUrl,
  price,
  salePrice,
  nameAr,
  nameEn,
  nameHe,
  className,
  variant = "button",
}: Props) {
  const { isSaved, toggle } = useWishlist();
  const { t } = useLocale();
  const saved = isSaved(productKind, productId);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  async function handleClick(e?: MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    if (busy) return;
    setHint(null);
    setBusy(true);
    try {
      const nowSaved = await toggle({
        productKind,
        productId,
        productSlug,
        productTitle,
        productImageUrl,
        price,
        salePrice,
        nameAr,
        nameEn,
        nameHe,
      });
      if (variant === "button") {
        setHint(
          nowSaved ? t.wishlist.addedToast : t.wishlist.removedToast
        );
      }
    } catch {
      if (variant === "button") setHint(t.wishlist.updateFailed);
    } finally {
      setBusy(false);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={(e) => void handleClick(e)}
        disabled={busy}
        aria-label={saved ? t.wishlist.removeAria : t.wishlist.addAria}
        aria-pressed={saved}
        className={cn(
          "relative z-30 flex h-10 w-10 items-center justify-center rounded-full border bg-white/95 shadow-sm transition disabled:opacity-60",
          saved
            ? "border-red-200 text-red-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            : "border-beige-dark/80 text-charcoal hover:border-gold hover:bg-gold hover:text-white",
          className
        )}
      >
        <Heart
          className="h-[var(--xp-cta-icon)] w-[var(--xp-cta-icon)]"
          strokeWidth={1.75}
          fill={saved ? "currentColor" : "none"}
        />
      </button>
    );
  }

  return (
    <div className={cn("inline-flex flex-col items-start gap-1", className)}>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={busy}
        aria-label={saved ? t.wishlist.removeAria : t.wishlist.addAria}
        aria-pressed={saved}
        className={cn(
          "inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition",
          saved
            ? "border-red-200 bg-red-50 text-red-600"
            : "border-beige-dark bg-white text-charcoal hover:border-gold"
        )}
      >
        <Heart
          className={cn("h-4 w-4", saved ? "text-red-500" : "text-gold")}
          fill={saved ? "currentColor" : "none"}
        />
        {saved ? t.wishlist.inWishlist : t.wishlist.addButton}
      </button>
      {hint && (
        <p className="text-xs text-muted" role="status">
          {hint}
        </p>
      )}
    </div>
  );
}
