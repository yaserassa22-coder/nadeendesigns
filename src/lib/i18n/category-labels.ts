/**
 * Storefront category / catalog labels.
 * When HE/EN CMS fields are empty, map known Arabic/English names & slugs
 * to dictionary strings so the chosen language is never stuck on Arabic.
 */

import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";

export type NamedCatalogEntity = {
  name_ar?: string | null;
  name_en?: string | null;
  name_he?: string | null;
  slug?: string | null;
  legacy_key?: string | null;
  href?: string | null;
  product_kind?: string | null;
  kind?: string | null;
};

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ");
}

/** Resolve a free-form DB label (category chip, product.category, product name). */
export function resolveCatalogLabel(
  raw: string | null | undefined,
  locale: Locale,
  hints?: { legacy_key?: string | null; slug?: string | null; href?: string | null; kind?: string | null }
): string {
  const t = getDictionary(locale);
  const original = (raw ?? "").trim();
  const blob = norm(
    [original, hints?.legacy_key, hints?.slug, hints?.href, hints?.kind]
      .filter(Boolean)
      .join(" ")
  );

  if (!blob && !hints?.legacy_key) return original;

  // Specific product labels before broad category kinds (حجاب ≠ طرحة)
  if (/hijab|حجاب|חיג'?אב|חיג׳אב|חיגאב/.test(blob)) {
    return t.catalog.hijab;
  }
  if (/necklace|سنسال|שרשרת/.test(blob)) {
    return t.catalog.necklace;
  }
  if (/\bkaeb\b|cape|كيب|קייפ|رداء/.test(blob)) {
    return t.catalog.cape;
  }

  // Legacy / kind first
  const legacy = hints?.legacy_key || hints?.kind || "";
  if (legacy === "wedding" || /wedding\s*dress|فساتين الزفاف|שמלות כלה/.test(blob)) {
    return t.nav.weddingDresses;
  }
  if (legacy === "nouf_dresses" || /nouf|نوف|נוף/.test(blob)) {
    return t.catalog.noufDresses;
  }
  if (legacy === "rental" || /rental|إيجار|השכרה|فساتين الإيجار/.test(blob)) {
    return t.catalog.rentalDresses;
  }
  if (
    legacy === "custom_design" ||
    /custom\s*design|تصميم خاص|تصميم فستان|עיצוב מותאם|עיצוב שמלת/.test(blob)
  ) {
    return t.nav.customDesign;
  }
  if (
    legacy === "accessories_group" ||
    /accessories|اكسسوارات|إكسسوارات|אקססוריז|bridal accessories/.test(blob)
  ) {
    return t.catalog.bridalAccessories;
  }
  if (legacy === "veils" || /\/veils|\bveil\b|طرحة|طرحه|היננ|רעלה/.test(blob)) {
    return t.nav.veils;
  }
  if (
    legacy === "bridal_robe" ||
    legacy === "bridal_robes" ||
    /\/robes|bridal\s*robe|برنص|برنس|חלוק/.test(blob)
  ) {
    return t.nav.robes;
  }

  if (/new[-_\s]?collection|مجموعة جديدة|קולקציה חדשה/.test(blob)) {
    return t.nav.newCollection;
  }
  if (/gallery|معرض|גלריה/.test(blob)) {
    return t.nav.gallery;
  }
  if (/view\s*collection|הציגי|عرض المجموعة|اكتشفي المجموعة/.test(blob)) {
    return t.nav.viewCollection;
  }

  // Veil length / style filters (VEIL_CATEGORY_OPTIONS)
  if (/cathedral|كاتدرائية|קתדרלה/.test(blob)) {
    return t.catalog.veilCathedral;
  }
  if (/^متوسطة$|fingertip|\bmedium\b|בינונית/.test(blob) || blob === "متوسطة") {
    return t.catalog.veilMedium;
  }
  if (/^قصيرة$|\bshort\b|קצרה/.test(blob) || blob === "قصيرة") {
    return t.catalog.veilShort;
  }
  if (/birdcage|بيرد|בירדקייג/.test(blob)) {
    return t.catalog.veilBirdcage;
  }
  if (/^كلاسيكي$|\bclassic\b|קלאסי/.test(blob) || blob === "كلاسيكي") {
    return t.catalog.veilClassic;
  }
  if (/حسب الطلب|custom\s*order|בהזמנה|לפי הזמנה/.test(blob)) {
    return t.catalog.veilCustom;
  }

  return original;
}

/**
 * Category / product display name for the active locale.
 * Preferred CMS field → sibling locale → catalog dictionary map → Arabic.
 */
export function resolveCategoryLabel(
  entity: NamedCatalogEntity,
  locale: Locale
): string {
  const ar = (entity.name_ar ?? "").trim();
  const en = (entity.name_en ?? "").trim();
  const he = (entity.name_he ?? "").trim();

  const preferred =
    locale === "he" ? he : locale === "en" ? en : ar;
  if (preferred) return preferred;

  if (locale === "he" && en) return en;
  if (locale === "en" && he) return he;

  const mapped = resolveCatalogLabel(ar || en || he, locale, {
    legacy_key: entity.legacy_key,
    slug: entity.slug,
    href: entity.href,
    kind: entity.product_kind || entity.kind,
  });
  if (mapped && mapped !== ar && mapped !== en && mapped !== he) {
    return mapped;
  }

  if (locale === "ar") {
    return ar || en || he || mapped || "";
  }

  // Avoid forcing Arabic onto HE/EN storefronts when a sibling exists.
  return en || he || mapped || ar || "";
}

/**
 * Prefer locale-appropriate description: UI fallback for HE/EN when CMS
 * description is Arabic-only.
 */
export function resolveCategoryDescription(
  entity: {
    description_ar?: string | null;
    description_en?: string | null;
    description_he?: string | null;
    legacy_key?: string | null;
  },
  locale: Locale,
  uiFallback = ""
): string {
  const preferred =
    locale === "he"
      ? (entity.description_he ?? "").trim()
      : locale === "en"
        ? (entity.description_en ?? "").trim()
        : (entity.description_ar ?? "").trim();
  if (preferred) return preferred;
  if (locale !== "ar" && uiFallback.trim()) return uiFallback.trim();
  return (entity.description_ar ?? "").trim() || uiFallback.trim();
}
