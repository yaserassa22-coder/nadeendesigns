"use client";

import { cn, formatPrice } from "@/lib/utils";
import {
  chargedUnitPrice,
  effectiveServiceUnitPrice,
  type ExtraServiceConfig,
  type LineExtraService,
} from "@/lib/products/order-experience";
import { useLocale } from "@/components/i18n/LocaleProvider";

type Props = {
  baseUnitPrice: number;
  quantity: number;
  personalizationFee?: number;
  /** Gift wrap fee (when wrapping enabled). */
  giftWrapFee?: number;
  /** Gift card fee (when card enabled). */
  giftCardFee?: number;
  selectedServices: ExtraServiceConfig[];
  className?: string;
};

/**
 * Live price breakdown — line items mirror Admin service cards (FREE / +₪).
 */
export function ProductExperiencePriceSummary({
  baseUnitPrice,
  quantity,
  personalizationFee = 0,
  giftWrapFee = 0,
  giftCardFee = 0,
  selectedServices,
  className,
}: Props) {
  const { t } = useLocale();
  const giftFee = Math.max(0, giftWrapFee) + Math.max(0, giftCardFee);
  const extras: LineExtraService[] = selectedServices.map((s) => ({
    id: s.id,
    name: s.name,
    name_ar: s.name_ar,
    price: effectiveServiceUnitPrice(s),
    pricing_mode: s.pricing_mode,
  }));
  const unit = chargedUnitPrice({
    baseUnitPrice,
    personalizationFee,
    giftFee,
    extraServices: extras,
  });
  const qty = Math.max(1, quantity);
  const lineTotal = unit * qty;

  return (
    <div
      className={cn(
        "rounded-[var(--xp-card-radius)] border border-gold/25 bg-gradient-to-b from-gold/[0.06] to-white p-5 shadow-[var(--xp-shadow)]",
        className
      )}
      aria-live="polite"
    >
      <ul className="space-y-3 text-sm text-charcoal">
        <li className="flex justify-between gap-3">
          <span className="text-muted">{t.productExtras.product}</span>
          <span
            key={`base-${baseUnitPrice}`}
            className="tabular-nums xp-fade-in"
            dir="ltr"
          >
            {formatPrice(baseUnitPrice)}
          </span>
        </li>
        {personalizationFee > 0 ? (
          <li className="flex justify-between gap-3">
            <span className="text-muted">{t.productExtras.personalization}</span>
            <span
              key={`pers-${personalizationFee}`}
              className="tabular-nums xp-fade-in text-gold"
              dir="ltr"
            >
              +{formatPrice(personalizationFee)}
            </span>
          </li>
        ) : null}
        {giftWrapFee > 0 ? (
          <li className="flex justify-between gap-3">
            <span className="text-muted">{t.productExtras.giftWrap}</span>
            <span
              key={`wrap-${giftWrapFee}`}
              className="tabular-nums xp-fade-in text-gold"
              dir="ltr"
            >
              +{formatPrice(giftWrapFee)}
            </span>
          </li>
        ) : null}
        {giftCardFee > 0 ? (
          <li className="flex justify-between gap-3">
            <span className="text-muted">{t.productExtras.giftCard}</span>
            <span
              key={`card-${giftCardFee}`}
              className="tabular-nums xp-fade-in text-gold"
              dir="ltr"
            >
              +{formatPrice(giftCardFee)}
            </span>
          </li>
        ) : null}
        {extras.map((s) => (
          <li key={s.id} className="flex justify-between gap-3">
            <span className="text-muted">{s.name_ar || s.name}</span>
            <span
              key={`${s.id}-${s.price}`}
              className={cn(
                "tabular-nums xp-fade-in",
                s.price > 0 ? "text-gold" : "text-emerald-700"
              )}
              dir="ltr"
            >
              {s.price > 0 ? `+${formatPrice(s.price)}` : t.productExtras.free}
            </span>
          </li>
        ))}
        {qty > 1 ? (
          <li className="flex justify-between gap-3">
            <span className="text-muted">{t.productExtras.quantity}</span>
            <span
              key={`qty-${qty}`}
              className="tabular-nums xp-fade-in"
              dir="ltr"
            >
              × {qty}
            </span>
          </li>
        ) : null}
        <li className="flex items-baseline justify-between gap-3 border-t border-gold/20 pt-3">
          <span className="text-base font-semibold">{t.productExtras.total}</span>
          <span
            key={lineTotal}
            className="xp-price-pulse font-[family-name:var(--font-cormorant)] text-2xl text-gold tabular-nums"
            dir="ltr"
          >
            {formatPrice(lineTotal)}
          </span>
        </li>
      </ul>
    </div>
  );
}
