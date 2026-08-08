import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";
import type { ServiceType } from "@/types";

/** Locale-aware service type label (booking / appointments). */
export function getServiceTypeLabelLocalized(
  type: string,
  locale: Locale
): string {
  const labels = getDictionary(locale).booking.serviceLabels;
  const key = type as keyof typeof labels;
  if (key in labels) return labels[key];
  return type;
}

export function bookingServiceOptions(locale: Locale): {
  value: Exclude<
    ServiceType,
    "fitting" | "consultation" | "rental" | "purchase" | "nouf_dress"
  >;
  label: string;
}[] {
  const labels = getDictionary(locale).booking.serviceLabels;
  return [
    { value: "wedding_dress", label: labels.wedding_dress },
    { value: "rental_dress", label: labels.rental_dress },
    { value: "custom_design", label: labels.custom_design },
    { value: "nouf_dresses", label: labels.nouf_dresses },
    { value: "veil", label: labels.veil },
    { value: "bridal_cape", label: labels.bridal_cape },
  ];
}
