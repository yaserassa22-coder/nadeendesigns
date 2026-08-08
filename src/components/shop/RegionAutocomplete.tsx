"use client";

/**
 * Smart region selector (M10)
 *
 * Scale approach: load active `shipping_regions` once (checkout already fetches
 * `/api/shipping-regions`), then filter in memory with memoization. This is
 * efficient for hundreds of regions and needs no redesign later — when the
 * catalog exceeds ~1k rows, switch the fetch to `/api/shipping-regions?q=`
 * (debounced ILIKE on indexed name_ar/name_en) without changing this UX.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { formatPrice, cn } from "@/lib/utils";
import {
  filterRegionsByQuery,
  formatEstimatedDelivery,
} from "@/lib/shop/shipping";
import type { ShippingRegion } from "@/types/shop";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { localizedName } from "@/lib/i18n/localize";

export type RegionSelection = {
  regionId: string | null;
  regionText: string;
  matched: ShippingRegion | null;
};

type RegionAutocompleteProps = {
  regions: ShippingRegion[];
  value: RegionSelection;
  onChange: (next: RegionSelection) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
};

export function RegionAutocomplete({
  regions,
  value,
  onChange,
  label,
  error,
  disabled,
}: RegionAutocompleteProps) {
  const { t, locale } = useLocale();
  const regionLabel = label ?? t.shippingUi.regionLabel;
  const inputId = useId();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const regionDisplayName = (r: ShippingRegion) =>
    localizedName(r, locale, r.name_ar);

  const suggestions = useMemo(
    () => filterRegionsByQuery(regions, value.regionText, 12),
    [regions, value.regionText]
  );

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selectRegion = (r: ShippingRegion) => {
    onChange({
      regionId: r.id,
      regionText: regionDisplayName(r),
      matched: r,
    });
    setOpen(false);
  };

  const onInput = (text: string) => {
    const exact = regions.find((r) => {
      const ar = r.name_ar.trim();
      const en = (r.name_en?.trim() ?? "");
      const display = regionDisplayName(r).trim();
      return (
        ar === text.trim() ||
        en === text.trim() ||
        display === text.trim()
      );
    });
    onChange({
      regionId: exact?.id ?? null,
      regionText: text,
      matched: exact ?? null,
    });
    setOpen(true);
    setHighlight(0);
  };

  const feeLabel = (r: ShippingRegion) =>
    Number(r.shipping_fee) > 0
      ? formatPrice(Number(r.shipping_fee))
      : t.shippingUi.free;

  const unknown =
    value.regionText.trim().length >= 2 && !value.matched && !value.regionId;

  return (
    <div className="space-y-2" ref={wrapRef}>
      {regionLabel && (
        <label htmlFor={inputId} className="block text-sm font-medium text-charcoal">
          {regionLabel} *
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          autoComplete="off"
          placeholder={t.shippingUi.regionPlaceholder}
          value={value.regionText}
          onChange={(e) => onInput(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
              setOpen(true);
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) =>
                suggestions.length ? (h + 1) % suggestions.length : 0
              );
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) =>
                suggestions.length
                  ? (h - 1 + suggestions.length) % suggestions.length
                  : 0
              );
            } else if (e.key === "Enter" && open && suggestions[highlight]) {
              e.preventDefault();
              selectRegion(suggestions[highlight]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className={cn(
            "w-full rounded-xl border border-beige-dark bg-white px-4 py-3 text-charcoal transition-colors placeholder:text-muted/60 focus:border-gold focus:ring-2 focus:ring-gold/20",
            error && "border-red-400 focus:border-red-400 focus:ring-red-400/20"
          )}
        />
        {open && suggestions.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-beige-dark bg-white py-1 shadow-lg"
          >
            {suggestions.map((r, idx) => {
              const est = formatEstimatedDelivery(r);
              return (
                <li key={r.id} role="option" aria-selected={idx === highlight}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-start justify-between gap-3 px-4 py-2.5 text-right text-sm hover:bg-beige/50",
                      idx === highlight && "bg-gold/10"
                    )}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => selectRegion(r)}
                  >
                    <span>
                      <span className="font-medium text-charcoal">
                        {regionDisplayName(r)}
                      </span>
                      {r.name_en && locale !== "en" ? (
                        <span className="mt-0.5 block text-xs text-muted" dir="ltr">
                          {r.name_en}
                        </span>
                      ) : null}
                      {est ? (
                        <span className="mt-0.5 block text-xs text-muted">
                          {est}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-gold" dir="ltr">
                      {feeLabel(r)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {unknown && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t.shippingUi.boutiqueReviewHint}
        </p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
