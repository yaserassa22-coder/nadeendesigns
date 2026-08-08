import { pickLocalized } from "@/lib/cms/locale-text";
import { localizeArabicProductText } from "@/lib/i18n/attribute-labels";
import { resolveCatalogLabel } from "@/lib/i18n/category-labels";
import type { Locale } from "@/lib/i18n/types";

/** Any catalog entity with Arabic name + optional translations. */
export type LocalizableNamed = {
  name_ar: string;
  name_en?: string | null;
  name_he?: string | null;
  title_ar?: string | null;
  title_en?: string | null;
  title_he?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  description_he?: string | null;
  short_description?: string | null;
  short_description_en?: string | null;
  short_description_he?: string | null;
};

export function localizedName(
  entity: LocalizableNamed | null | undefined,
  locale: Locale,
  fallback = ""
): string {
  if (!entity) return fallback;
  const ar = (entity.name_ar || entity.title_ar || "").trim();
  const en = (entity.name_en || entity.title_en || "").trim();
  const he = (entity.name_he || entity.title_he || "").trim();

  const preferred =
    locale === "he" ? he : locale === "en" ? en : ar;
  if (preferred) return preferred;

  // Missing translation: prefer Latin/Hebrew sibling before Arabic so a
  // Hebrew-only storefront does not flash Arabic product titles.
  if (locale === "he") {
    if (en) return en;
  } else if (locale === "en") {
    if (he) return he;
  }

  if (locale !== "ar" && ar) {
    const mapped = resolveCatalogLabel(ar, locale);
    if (mapped && mapped !== ar) return mapped;
  }

  if (locale === "ar") {
    return ar || en || he || fallback;
  }

  // Last resort only — still better than an empty card title.
  return en || he || ar || fallback;
}

export function localizedDescription(
  entity: LocalizableNamed | null | undefined,
  locale: Locale,
  fallback = ""
): string {
  if (!entity) return fallback;
  const picked = pickLocalized(
    entity.description_ar || entity.short_description,
    entity.description_en || entity.short_description_en,
    fallback,
    locale,
    entity.description_he || entity.short_description_he
  );
  if (!picked) return "";

  // Missing HE/EN falls back to Arabic — translate known fabric phrases for storefront.
  if (locale !== "ar" && /[\u0600-\u06FF]/.test(picked)) {
    return localizeArabicProductText(picked, locale);
  }
  return picked;
}
