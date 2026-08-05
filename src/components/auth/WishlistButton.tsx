"use client";

import { useState, type MouseEvent } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/components/shop/WishlistProvider";

const ACCENT = "#C9A14A";

type Props = {
  productKind: string;
  productId: string;
  productSlug?: string | null;
  productTitle?: string | null;
  productImageUrl?: string | null;
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
  className,
  variant = "button",
}: Props) {
  const { isSaved, toggle } = useWishlist();
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
      });
      if (variant === "button") {
        setHint(
          nowSaved
            ? "❤️ تمت الإضافة إلى قائمة الأمنيات"
            : "تمت الإزالة من قائمة الأمنيات"
        );
      }
    } catch {
      if (variant === "button") setHint("تعذّر تحديث قائمة الأمنيات");
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
        aria-label={saved ? "إزالة من قائمة الأمنيات" : "أضيفي إلى قائمة الأمنيات"}
        aria-pressed={saved}
        className={cn(
          /* Position via ProductCardOverlay top-right slot — never ad-hoc absolute. */
          "relative z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-charcoal shadow-sm transition hover:bg-gold hover:text-white disabled:opacity-60",
          saved && "text-gold",
          className
        )}
      >
        <Heart
          className="h-4 w-4"
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
        aria-label={saved ? "إزالة من قائمة الأمنيات" : "أضيفي إلى قائمة الأمنيات"}
        aria-pressed={saved}
        className={cn(
          "inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition",
          saved
            ? "border-[color:#C9A14A] bg-[color:#C9A14A]/10 text-charcoal"
            : "border-beige-dark bg-white text-charcoal hover:border-[color:#C9A14A]"
        )}
      >
        <Heart
          className="h-4 w-4"
          style={{ color: ACCENT }}
          fill={saved ? ACCENT : "none"}
        />
        {saved ? "في الأمنيات" : "أضيفي للأمنيات"}
      </button>
      {hint && (
        <p className="text-xs text-muted" role="status">
          {hint}
        </p>
      )}
    </div>
  );
}
