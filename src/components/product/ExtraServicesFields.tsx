"use client";

import { Sparkles } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ExtraServiceConfig } from "@/lib/products/order-experience";

type Props = {
  services: ExtraServiceConfig[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

/**
 * Dynamic paid extra services from store / product config.
 */
export function ExtraServicesFields({
  services,
  selectedIds,
  onChange,
}: Props) {
  if (!services.length) return null;

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-4 rounded-3xl border border-beige-dark bg-ivory/70 p-5 md:p-6">
      <div>
        <div className="mb-1 inline-flex items-center gap-2 text-gold">
          <Sparkles className="h-4 w-4" />
          <h3 className="text-lg font-semibold text-charcoal">خدمات إضافية</h3>
        </div>
        <p className="text-sm text-muted">
          اختاري الخدمات المدفوعة التي ترغبين بإضافتها.
        </p>
      </div>
      <div className="space-y-3">
        {services.map((svc) => {
          const checked = selectedIds.includes(svc.id);
          return (
            <label
              key={svc.id}
              className={cn(
                "flex cursor-pointer items-start justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors",
                checked
                  ? "border-gold/40 bg-gold/5"
                  : "border-beige-dark bg-white hover:border-gold/30"
              )}
            >
              <span className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(svc.id)}
                  className="mt-1 h-4 w-4 accent-[var(--gold)]"
                />
                <span>
                  <span className="block text-sm font-medium text-charcoal">
                    {svc.name_ar || svc.name}
                  </span>
                  {svc.name_ar && svc.name && svc.name !== svc.name_ar ? (
                    <span className="mt-0.5 block text-xs text-muted" dir="ltr">
                      {svc.name}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="shrink-0 text-sm text-gold" dir="ltr">
                {svc.price > 0 ? formatPrice(svc.price) : "مجاني"}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
