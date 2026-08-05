"use client";

import { formatPrice } from "@/lib/utils";
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
 * Totals update instantly when services / qty change.
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
      className={
        className ??
        "rounded-2xl border border-gold/30 bg-gold/5 p-4 text-sm md:p-5"
      }
    >
      <h3 className="mb-3 font-semibold text-charcoal">ملخص السعر</h3>
      <ul className="space-y-2 text-charcoal">
        <li className="flex justify-between gap-3">
          <span className="text-muted">سعر المنتج</span>
          <span dir="ltr">{formatPrice(baseUnitPrice)}</span>
        </li>
        {personalizationFee > 0 ? (
          <li className="flex justify-between gap-3">
            <span className="text-muted">التخصيص</span>
            <span dir="ltr">{formatPrice(personalizationFee)}</span>
          </li>
        ) : null}
        {extras.length > 0 ? (
          <li className="flex justify-between gap-3">
            <span className="text-muted">خدمات إضافية</span>
            <span dir="ltr">
              {extrasTotal > 0 ? formatPrice(extrasTotal) : "مجاني"}
            </span>
          </li>
        ) : null}
        {qty > 1 ? (
          <li className="flex justify-between gap-3">
            <span className="text-muted">الكمية</span>
            <span dir="ltr">× {qty}</span>
          </li>
        ) : null}
        <li className="flex justify-between gap-3 border-t border-gold/20 pt-2 text-base font-semibold">
          <span>الإجمالي</span>
          <span
            key={lineTotal}
            className="text-gold animate-in fade-in zoom-in-95 duration-300"
            dir="ltr"
          >
            {formatPrice(lineTotal)}
          </span>
        </li>
      </ul>
    </div>
  );
}
