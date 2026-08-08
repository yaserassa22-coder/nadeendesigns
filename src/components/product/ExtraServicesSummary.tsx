"use client";

import { formatPrice } from "@/lib/utils";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  effectiveServiceUnitPrice,
  type LineExtraService,
} from "@/lib/products/order-experience";

type Props = {
  services: LineExtraService[] | null | undefined;
  title?: string;
  compact?: boolean;
  /** Hide individual prices (gift hide_price). */
  hidePrice?: boolean;
};

export function ExtraServicesSummary({
  services,
  title,
  compact = false,
  hidePrice = false,
}: Props) {
  const { t } = useLocale();
  const heading = title ?? t.product.extraServices;
  if (!services?.length) return null;

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-beige-dark/70 bg-beige/20 p-3 text-sm"
          : "rounded-2xl border border-beige-dark bg-beige/30 p-5 text-sm md:p-6"
      }
    >
      <h3
        className={
          compact
            ? "mb-2 text-xs font-semibold text-gold"
            : "mb-3 font-semibold text-charcoal"
        }
      >
        {heading}
      </h3>
      <ul className="space-y-2">
        {services.map((svc) => {
          const amount = effectiveServiceUnitPrice(svc);
          return (
            <li
              key={svc.id}
              className="flex items-start justify-between gap-3 font-medium text-charcoal"
            >
              <span>{svc.name_ar || svc.name}</span>
              {!hidePrice && (
                <span className="shrink-0 text-gold" dir="ltr">
                  {amount > 0 ? formatPrice(amount) : t.common.free}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
