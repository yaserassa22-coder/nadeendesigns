/**
 * Locale display labels for dress colors / styles / materials.
 * DB values stay Arabic (canonical); UI shows the active language.
 */

import { COLOR_LEGACY_MAP, STYLE_LEGACY_MAP } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Dictionary, Locale } from "@/lib/i18n/types";
import { normalizeDressStyle } from "@/lib/styles";

type ColorKey = keyof Dictionary["attributes"]["colors"];
type StyleKey = keyof Dictionary["attributes"]["styles"];
type MaterialKey = keyof Dictionary["attributes"]["materials"];

/** Canonical Arabic color → dictionary key */
const COLOR_KEYS: Record<string, ColorKey> = {
  أبيض: "white",
  "أوف وايت": "offWhite",
  عاجي: "ivory",
  كريمي: "cream",
  بيج: "beige",
  شامبين: "champagne",
  ذهبي: "gold",
  فضي: "silver",
  "وردي فاتح": "lightPink",
  وردي: "pink",
  موف: "mauve",
  بنفسجي: "purple",
  "أزرق سماوي": "skyBlue",
  "أزرق ملكي": "royalBlue",
  كحلي: "navy",
  "أخضر زمردي": "emerald",
  "أخضر زيتوني": "olive",
  أحمر: "red",
  خمري: "burgundy",
  بني: "brown",
  أسود: "black",
  رمادي: "gray",
};

/** Canonical Arabic style → dictionary key */
const STYLE_KEYS: Record<string, StyleKey> = {
  كلاسيكي: "classic",
  عصري: "modern",
  ملكي: "royal",
  فاخر: "luxury",
  أناقة: "luxury",
  الأناقة: "luxury",
  ناعم: "soft",
  بسيط: "simple",
  أميري: "princess",
  "حورية البحر": "mermaid",
  "قصة A (قصة حرف A)": "aLine",
  منفوش: "ballgown",
  مستقيم: "sheath",
  بوهيمي: "bohemian",
  محتشم: "modest",
  مطرز: "embroidered",
  "دانتيل فاخر": "luxuryLace",
  "ساتان فاخر": "luxurySatin",
  "تول فاخر": "luxuryTulle",
  "تصميم مخصص": "customDesign",
};

function canonicalizeColor(raw: string): string {
  const trimmed = raw.trim();
  if (COLOR_KEYS[trimmed]) return trimmed;
  return COLOR_LEGACY_MAP[trimmed] ?? trimmed;
}

function canonicalizeStyle(raw: string): string {
  return normalizeDressStyle(raw) ?? raw.trim();
}

export function resolveDressColorLabel(
  raw: string | null | undefined,
  locale: Locale
): string {
  const original = (raw ?? "").trim();
  if (!original) return "";
  const canonical = canonicalizeColor(original);
  const key = COLOR_KEYS[canonical];
  if (key) return getDictionary(locale).attributes.colors[key];
  // English key already in personalization map, etc.
  const lower = original.toLowerCase();
  const fromEn = COLOR_LEGACY_MAP[original] ?? COLOR_LEGACY_MAP[lower];
  if (fromEn && COLOR_KEYS[fromEn]) {
    return getDictionary(locale).attributes.colors[COLOR_KEYS[fromEn]];
  }
  return original;
}

export function resolveDressStyleLabel(
  raw: string | null | undefined,
  locale: Locale
): string {
  const original = (raw ?? "").trim();
  if (!original) return "";
  const canonical = canonicalizeStyle(original);
  const key = STYLE_KEYS[canonical] ?? STYLE_KEYS[original];
  if (key) return getDictionary(locale).attributes.styles[key];
  const mapped =
    STYLE_LEGACY_MAP[original] ?? STYLE_LEGACY_MAP[original.toLowerCase()];
  if (mapped && STYLE_KEYS[mapped]) {
    return getDictionary(locale).attributes.styles[STYLE_KEYS[mapped]];
  }
  // Don't leak Arabic style tokens onto HE/EN storefronts.
  if (locale !== "ar" && /[\u0600-\u06FF]/.test(original)) {
    return "";
  }
  return original;
}

/**
 * Exact Arabic (and common typo) material phrases → dictionary keys.
 * Longer phrases first so compound labels win over single words.
 */
const MATERIAL_PHRASE_KEYS: Array<[string, MaterialKey]> = [
  ["مع الدانتيل الفاخر", "withLuxuryLace"],
  ["الدانتيل الفاخر", "theLuxuryLace"],
  ["ساتان مع دانتيل", "satinWithLace"],
  ["ستيان مع دانتيل", "satinWithLace"],
  ["ساتين مع دانتيل", "satinWithLace"],
  ["ستان مع دانتيل", "satinWithLace"],
  ["سيتان مع دانتيل", "satinWithLace"], // seen in product data
  ["دانتيل فرنسي", "frenchLace"],
  ["دانتيل فاخر", "luxuryLace"],
  ["ساتان فاخر", "luxurySatin"],
  ["ستيان فاخر", "luxurySatin"],
  ["ساتين فاخر", "luxurySatin"],
  ["ستان فاخر", "luxurySatin"],
  ["سيتان فاخر", "luxurySatin"],
  ["تول فاخر", "luxuryTulle"],
  ["حسب رغبتي", "custom"],
  ["الدانتيل", "theLace"],
  ["دانتيل", "lace"],
  ["ساتان", "satin"],
  ["ستيان", "satin"],
  ["ساتين", "satin"],
  ["ستان", "satin"],
  ["سيتان", "satin"],
  ["تول", "tulle"],
  ["كريب", "crepe"],
];

/** Any Arabic/latin satin spelling we have seen in product free-text. */
const SATIN_TOKEN_RE = /سيتان|ستيان|ساتان|ساتين|ستان|satin/gi;

/** Lace in Arabic or already-partial Hebrew translation. */
const LACE_TOKEN_RE = /الدانتيل|دانتيل|תחרה|lace/gi;

/**
 * Token replacements for free-text (materials + short product blurbs).
 * Longer tokens first. Includes Arabic "مع" so mixed chips never keep it.
 */
const MATERIAL_TOKEN_KEYS: Array<[string, MaterialKey]> = [
  ["مع الدانتيل الفاخر", "withLuxuryLace"],
  ["الدانتيل الفاخر", "theLuxuryLace"],
  ["دانتيل فرنسي", "frenchLace"],
  ["دانتيل فاخر", "luxuryLace"],
  ["ساتان فاخر", "luxurySatin"],
  ["ستيان فاخر", "luxurySatin"],
  ["ساتين فاخر", "luxurySatin"],
  ["ستان فاخر", "luxurySatin"],
  ["سيتان فاخر", "luxurySatin"],
  ["تول فاخر", "luxuryTulle"],
  ["الدانتيل", "theLace"],
  ["سيتان", "satin"],
  ["ستيان", "satin"],
  ["ساتين", "satin"],
  ["ساتان", "satin"],
  ["ستان", "satin"],
  ["دانتيل", "lace"],
  ["تول", "tulle"],
  ["كريب", "crepe"],
  ["مع", "with"],
];

function stripArabicMarks(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\u06CC/g, "\u064A") // Persian ی → Arabic ي
    .replace(/\u06A9/g, "\u0643") // Persian ک → Arabic ك
    .replace(/[\u064B-\u065F\u0670\u0640\u200C\u200D\u200E\u200F\uFEFF]/g, "")
    .replace(/[^\S\n]+/g, " ")
    .trim();
}

function containsArabic(value: string): boolean {
  return /[\u0600-\u06FF]/.test(value);
}

/**
 * Localize product material / fabric free-text (Arabic canonical in DB).
 */
export function resolveDressMaterialLabel(
  raw: string | null | undefined,
  locale: Locale
): string {
  return localizeArabicProductText(raw, locale);
}

/**
 * Translate known Arabic bridal fabric / material fragments into the active locale.
 * Used for material chips and as a storefront fallback when HE/EN CMS fields are empty.
 */
export function localizeArabicProductText(
  raw: string | null | undefined,
  locale: Locale
): string {
  const original = (raw ?? "").trim();
  if (!original) return "";
  if (locale === "ar") return original;

  const materials = getDictionary(locale).attributes.materials;
  const normalized = stripArabicMarks(original);

  for (const [phrase, key] of MATERIAL_PHRASE_KEYS) {
    if (normalized === phrase) return materials[key];
  }

  // Compound “satin + lace” even when spellings / partial HE mixes differ.
  const hasSatin = SATIN_TOKEN_RE.test(normalized);
  SATIN_TOKEN_RE.lastIndex = 0;
  const hasLace = LACE_TOKEN_RE.test(normalized);
  LACE_TOKEN_RE.lastIndex = 0;
  if (hasSatin && hasLace) {
    return materials.satinWithLace;
  }

  const lower = normalized.toLowerCase();
  const enKeys: Record<string, MaterialKey> = {
    lace: "lace",
    satin: "satin",
    tulle: "tulle",
    crepe: "crepe",
    "french lace": "frenchLace",
    "satin with lace": "satinWithLace",
    "luxury lace": "luxuryLace",
    "with luxury lace": "withLuxuryLace",
    "luxury satin": "luxurySatin",
    "luxury tulle": "luxuryTulle",
  };
  if (enKeys[lower]) return materials[enKeys[lower]];

  let translated = normalized;
  let changed = false;
  for (const [token, key] of MATERIAL_TOKEN_KEYS) {
    if (translated.includes(token)) {
      translated = translated.split(token).join(materials[key]);
      changed = true;
    }
  }

  // Catch leftover Arabic connectors / satin spellings after partial translates.
  if (/مع/.test(translated)) {
    translated = translated.replace(/مع/g, materials.with);
    changed = true;
  }
  if (SATIN_TOKEN_RE.test(translated)) {
    translated = translated.replace(SATIN_TOKEN_RE, materials.satin);
    changed = true;
  }
  SATIN_TOKEN_RE.lastIndex = 0;

  if (LACE_TOKEN_RE.test(translated) && /[\u0600-\u06FF]/.test(translated)) {
    translated = translated
      .replace(/الدانتيل/g, materials.theLace)
      .replace(/دانتيل/g, materials.lace);
    changed = true;
  }
  LACE_TOKEN_RE.lastIndex = 0;

  const result = changed ? translated.replace(/\s+/g, " ").trim() : original;
  return result;
}

export function hasArabicScript(value: string): boolean {
  return containsArabic(value);
}
