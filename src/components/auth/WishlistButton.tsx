"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useCustomerAuth } from "@/components/auth/CustomerAuthProvider";
import { cn } from "@/lib/utils";

const ACCENT = "#C9A14A";

type Props = {
  productKind: string;
  productId: string;
  productSlug?: string | null;
  productTitle?: string | null;
  productImageUrl?: string | null;
  className?: string;
};

export function WishlistButton({
  productKind,
  productId,
  productSlug,
  productTitle,
  productImageUrl,
  className,
}: Props) {
  const { user, customer, openLogin } = useCustomerAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  async function handleClick() {
    setHint(null);
    if (!user && !customer) {
      setHint("يلزم حساب لحفظ الأمنيات.");
      openLogin({
        message:
          "لحفظ القطع في قائمة الأمنيات تحتاجين إلى حساب. سجّلي الدخول أو أنشئي حساباً للمتابعة.",
        redirect: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/account/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_kind: productKind,
          product_id: productId,
          product_slug: productSlug ?? null,
          product_title: productTitle ?? null,
          product_image_url: productImageUrl ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "تعذّر الحفظ");
      }
      setSaved(true);
      setHint("أُضيفت إلى قائمة الأمنيات");
    } catch (e) {
      setHint(e instanceof Error ? e.message : "تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn("inline-flex flex-col items-start gap-1", className)}>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={saving}
        aria-label="أضيفي إلى قائمة الأمنيات"
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition",
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
