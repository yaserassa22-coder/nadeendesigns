"use client";

import { Sparkles } from "lucide-react";
import { ExperienceServiceCard } from "@/components/ui/experience";
import {
  enforceRequiredServiceIds,
  formatExtraServicePriceLabel,
  type ExtraServiceConfig,
} from "@/lib/products/order-experience";
import { useLocale } from "@/components/i18n/LocaleProvider";

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
  title,
  description,
}: Props) {
  const { t } = useLocale();
  const heading = title === undefined ? t.productExtras.extraServices : title;
  const hint =
    description === undefined
      ? t.productExtras.extraServicesHint
      : description;
  if (!services.length) return null;

  const toggle = (id: string, required: boolean) => {
    if (required) return;
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onChange(enforceRequiredServiceIds(services, next));
  };

  const showHeader = Boolean(heading);

  return (
    <div className="space-y-4">
      {showHeader ? (
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-gold">
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
            <h3 className="text-lg font-semibold text-charcoal">{heading}</h3>
          </div>
          {hint ? (
            <p className="text-sm text-muted">{hint}</p>
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
              priceLabel={formatExtraServicePriceLabel(
                svc,
                t.productExtras.free
              )}
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
