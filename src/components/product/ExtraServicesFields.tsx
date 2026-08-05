"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  enforceRequiredServiceIds,
  formatExtraServicePriceLabel,
  type ExtraServiceConfig,
} from "@/lib/products/order-experience";

type Props = {
  services: ExtraServiceConfig[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  title?: string;
  description?: string;
};

/**
 * Dynamic paid extra services from store / product config.
 * Required services cannot be unchecked; FREE vs +₪N labels update live.
 */
export function ExtraServicesFields({
  services,
  selectedIds,
  onChange,
  title = "خدمات إضافية",
  description = "اختاري الخدمات التي ترغبين بإضافتها إلى طلبكِ.",
}: Props) {
  if (!services.length) return null;

  const toggle = (id: string, required: boolean) => {
    if (required) return;
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onChange(enforceRequiredServiceIds(services, next));
  };

  return (
    <div className="space-y-4 rounded-3xl border border-beige-dark bg-ivory/70 p-5 md:p-6">
      <div>
        <div className="mb-1 inline-flex items-center gap-2 text-gold">
          <Sparkles className="h-4 w-4" />
          <h3 className="text-lg font-semibold text-charcoal">{title}</h3>
        </div>
        {description ? (
          <p className="text-sm text-muted">{description}</p>
        ) : null}
      </div>
      <div className="space-y-3">
        {services.map((svc) => {
          const checked = selectedIds.includes(svc.id) || Boolean(svc.required);
          const desc = svc.description_ar || svc.description;
          return (
            <label
              key={svc.id}
              className={cn(
                "flex cursor-pointer items-start justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors",
                checked
                  ? "border-gold/40 bg-gold/5"
                  : "border-beige-dark bg-white hover:border-gold/30",
                svc.required ? "cursor-default" : ""
              )}
            >
              <span className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={Boolean(svc.required)}
                  onChange={() => toggle(svc.id, Boolean(svc.required))}
                  className="mt-1 h-4 w-4 accent-[var(--gold)]"
                />
                <span>
                  <span className="block text-sm font-medium text-charcoal">
                    {svc.name_ar || svc.name}
                    {svc.required ? (
                      <span className="ms-2 text-xs text-gold">إلزامي</span>
                    ) : null}
                  </span>
                  {desc ? (
                    <span className="mt-0.5 block text-xs text-muted">
                      {desc}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="shrink-0 text-sm font-medium text-gold" dir="ltr">
                {formatExtraServicePriceLabel(svc)}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
