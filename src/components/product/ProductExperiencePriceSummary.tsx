"use client";

import { cn, formatPrice } from "@/lib/utils";
import {
  chargedUnitPrice,
  effectiveServiceUnitPrice,
  type ExtraServiceConfig,
  type LineExtraService,
} from "@/lib/products/order-experience";

type Props = {
  baseUnitPrice: number;
  quantity: number;
  personalizationFee?: number;
  selectedServices: ExtraServiceConfig[];
  className?: string;
};

/**
 * Live price breakdown inside the Product Experience Modal.
 * Premium card; totals animate when services / qty change.
 */
export function ProductExperiencePriceSummary({
  baseUnitPrice,
  quantity,
  personalizationFee = 0,
  selectedServices,
  className,
}: Props) {
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
    extraServices: extras,
  });
  const qty = Math.max(1, quantity);
  const lineTotal = unit * qty;
  const extrasTotal = extras.reduce((sum, s) => sum + s.price, 0);

  return (
    <div
      className={cn(
        "rounded-[var(--xp-card-radius)] border border-gold/30 bg-gradient-to-b from-gold/[0.07] to-white/90 p-4 shadow-[var(--xp-shadow)] md:p-5",
        className
      )}
    >
      <h3 className="mb-3 font-[family-name:var(--font-cormorant)] text-lg tracking-wide text-charcoal">
        ملخص السعر
      </h3>
      <ul className="space-y-2.5 text-sm text-charcoal">
        <li className="flex justify-between gap-3">
          <span className="text-muted">سعر المنتج</span>
          <span className="tabular-nums" dir="ltr">
            {formatPrice(baseUnitPrice)}
          </span>
        </li>
        {personalizationFee > 0 ? (
          <li className="flex justify-between gap-3">
            <span className="text-muted">التخصيص</span>
            <span className="tabular-nums" dir="ltr">
              {formatPrice(personalizationFee)}
            </span>
          </li>
        ) : null}
        {extras.length > 0 ? (
          <li className="flex justify-between gap-3">
            <span className="text-muted">خدمات إضافية</span>
            <span className="tabular-nums" dir="ltr">
              {extrasTotal > 0 ? formatPrice(extrasTotal) : "مجاني"}
            </span>
          </li>
        ) : null}
        {qty > 1 ? (
          <li className="flex justify-between gap-3">
            <span className="text-muted">الكمية</span>
            <span className="tabular-nums" dir="ltr">
              × {qty}
            </span>
          </li>
        ) : null}
        <li className="flex items-baseline justify-between gap-3 border-t border-gold/25 pt-3">
          <span className="text-base font-semibold">الإجمالي</span>
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
