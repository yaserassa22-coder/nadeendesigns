"use client";

import { Input, Textarea } from "@/components/ui/Input";
import type {
  OrderOptionConfig,
  OrderOptionKey,
} from "@/lib/products/order-experience";
import { useLocale } from "@/components/i18n/LocaleProvider";

export type OrderOptionValues = Partial<Record<OrderOptionKey, string>>;

type Props = {
  options: OrderOptionConfig[];
  values: OrderOptionValues;
  onChange: (next: OrderOptionValues) => void;
  errors?: Record<string, string>;
};

/**
 * Dynamic order-option fields from store / product config.
 * Client→client onChange is fine; never pass functions across Server→Client.
 */
export function OrderOptionsFields({
  options,
  values,
  onChange,
  errors = {},
}: Props) {
  const { t } = useLocale();
  if (!options.length) return null;

  const update = (key: OrderOptionKey, value: string) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="space-y-4 rounded-3xl border border-beige-dark bg-ivory/70 p-5 md:p-6">
      <div>
        <h3 className="text-lg font-semibold text-charcoal">
          {t.productExtras.orderOptions}
        </h3>
        <p className="mt-1 text-sm text-muted">
          {t.productExtras.orderOptionsHint}
        </p>
      </div>
      <div className="space-y-4">
        {options.map((opt) => {
          const label = `${opt.label_ar || opt.label}${opt.required ? " *" : ""}`;
          const value = values[opt.key] ?? "";
          const isLong =
            opt.key === "gift_message" ||
            opt.key === "order_notes" ||
            opt.key === "delivery_address";

          if (isLong) {
            return (
              <Textarea
                key={opt.key}
                label={label}
                rows={opt.key === "delivery_address" ? 3 : 4}
                value={value}
                onChange={(e) => update(opt.key, e.target.value)}
                error={errors[opt.key]}
              />
            );
          }

          return (
            <Input
              key={opt.key}
              label={label}
              type={
                opt.key === "delivery_date"
                  ? "date"
                  : opt.key === "delivery_time"
                    ? "time"
                    : "text"
              }
              value={value}
              onChange={(e) => update(opt.key, e.target.value)}
              error={errors[opt.key]}
              dir={opt.key === "delivery_date" || opt.key === "delivery_time" ? "ltr" : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
