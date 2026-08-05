"use client";

import { Sparkles } from "lucide-react";
import { ExperienceServiceCard } from "@/components/ui/experience";
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
 * Luxury selectable cards; FREE vs +₪N labels update live.
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

  const showHeader = Boolean(title);

  return (
    <div className="space-y-4">
      {showHeader ? (
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-gold">
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
            <h3 className="text-lg font-semibold text-charcoal">{title}</h3>
          </div>
          {description ? (
            <p className="text-sm text-muted">{description}</p>
          ) : null}
        </div>
      ) : null}
      <div className="space-y-3">
        {services.map((svc) => {
          const checked = selectedIds.includes(svc.id) || Boolean(svc.required);
          const desc = svc.description_ar || svc.description;
          return (
            <ExperienceServiceCard
              key={svc.id}
              name={svc.name_ar || svc.name}
              description={desc}
              priceLabel={formatExtraServicePriceLabel(svc)}
              selected={checked}
              required={Boolean(svc.required)}
              onToggle={() => toggle(svc.id, Boolean(svc.required))}
            />
          );
        })}
      </div>
    </div>
  );
}
