"use client";

import type { LineOrderOptionValue } from "@/lib/products/order-experience";

type Props = {
  options: LineOrderOptionValue[] | null | undefined;
  title?: string;
  compact?: boolean;
};

export function OrderOptionsSummary({
  options,
  title = "خيارات الطلب",
  compact = false,
}: Props) {
  if (!options?.length) return null;

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
        {title}
      </h3>
      <dl className="space-y-2">
        {options.map((opt) => (
          <div key={opt.key}>
            <dt className="text-muted">{opt.label_ar || opt.label}</dt>
            <dd className="mt-0.5 whitespace-pre-line font-medium text-charcoal">
              {opt.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
