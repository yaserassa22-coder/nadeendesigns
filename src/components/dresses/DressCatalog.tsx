"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { Dress } from "@/types";
import { DRESS_COLORS, DRESS_SIZES, DRESS_STYLES } from "@/lib/constants";
import { filterDressesClient } from "@/lib/filters";
import { DressCard } from "./DressCard";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  resolveDressColorLabel,
  resolveDressStyleLabel,
} from "@/lib/i18n/attribute-labels";

interface DressCatalogProps {
  dresses: Dress[];
  /** Canonical or dynamic category key; omit when dresses are pre-filtered */
  category?: string;
  title: string;
  description: string;
}

export function DressCatalog({
  dresses,
  category,
}: DressCatalogProps) {
  const { t, locale, dir } = useLocale();
  const [search, setSearch] = useState("");
  const [style, setStyle] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(
    () =>
      filterDressesClient(dresses, {
        category,
        search: search || undefined,
        style: style || undefined,
        color: color || undefined,
        size: size || undefined,
      }),
    [dresses, category, search, style, color, size]
  );

  const hasActiveFilters = style || color || size;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 end-4 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder={t.shop.searchDress}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t.shop.searchDressAria}
            className="w-full rounded-full border border-beige-dark bg-white py-3 pe-12 ps-4 focus:border-gold focus:ring-2 focus:ring-gold/20"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-medium transition-colors",
            showFilters
              ? "border-gold bg-gold text-white"
              : "border-beige-dark bg-white text-charcoal hover:border-gold"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t.shop.filters}
        </button>
      </div>

      {showFilters && (
        <div className="mb-8 grid gap-4 rounded-2xl border border-beige-dark bg-beige/50 p-6 sm:grid-cols-3">
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            dir={dir}
            aria-label={t.shop.filterByStyle}
            className="rounded-xl border border-beige-dark bg-white px-4 py-3"
          >
            <option value="">{t.shop.allStyles}</option>
            {DRESS_STYLES.map((s) => (
              <option key={s} value={s}>
                {resolveDressStyleLabel(s, locale)}
              </option>
            ))}
          </select>
          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            dir={dir}
            aria-label={t.shop.filterByColor}
            className="rounded-xl border border-beige-dark bg-white px-4 py-3"
          >
            <option value="">{t.shop.allColors}</option>
            {DRESS_COLORS.map((c) => (
              <option key={c} value={c}>
                {resolveDressColorLabel(c, locale)}
              </option>
            ))}
          </select>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            aria-label={t.shop.filterBySize}
            className="rounded-xl border border-beige-dark bg-white px-4 py-3"
          >
            <option value="">{t.shop.allSizes}</option>
            {DRESS_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setStyle("");
                setColor("");
                setSize("");
              }}
              className="inline-flex items-center gap-1 text-sm text-gold sm:col-span-3"
            >
              <X className="h-4 w-4" />
              {t.shop.clearFilters}
            </button>
          )}
        </div>
      )}

      <p className="mb-6 text-sm text-muted">
        {filtered.length}{" "}
        {filtered.length === 1 ? t.shop.resultOne : t.shop.resultMany}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-beige-dark bg-beige/30 py-16 text-center">
          <p className="text-lg text-muted">{t.shop.noResultsFound}</p>
          <p className="mt-2 text-sm text-muted/70">{t.shop.noResultsHint}</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((dress, i) => (
            <DressCard key={dress.id} dress={dress} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PageHero({ title, description }: { title: string; description: string }) {
  return (
    <section className="luxury-gradient border-b border-beige-dark pt-32 pb-16 md:pt-40 md:pb-20">
      <div className="mx-auto max-w-7xl px-4 text-center md:px-8">
        <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.3em] text-gold uppercase">
          Nadeen Designs
        </p>
        <h1 className="mt-4 text-4xl font-bold text-charcoal md:text-5xl lg:text-6xl">
          {title}
        </h1>
        <div className="decorative-line mx-auto mt-6 w-24" />
        <p className="mx-auto mt-6 max-w-2xl whitespace-pre-line text-lg leading-relaxed text-muted">
          {description}
        </p>
      </div>
    </section>
  );
}
