import type { AboutValueIcon, AboutValueItem, SiteSettings } from "@/types";
import {
  DEFAULT_SETTINGS,
  OFFICIAL_INSTAGRAM_HANDLE,
  OFFICIAL_INSTAGRAM_URL,
} from "@/lib/constants";

const ABOUT_VALUE_ICONS: AboutValueIcon[] = [
  "Heart",
  "Sparkles",
  "Users",
  "Award",
];

function isAboutValueIcon(value: unknown): value is AboutValueIcon {
  return (
    typeof value === "string" &&
    (ABOUT_VALUE_ICONS as string[]).includes(value)
  );
}

function normalizeAboutValues(raw: unknown): AboutValueItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_SETTINGS.about_values;
  }

  const items: AboutValueItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const title_ar = typeof row.title_ar === "string" ? row.title_ar : "";
    const description_ar =
      typeof row.description_ar === "string" ? row.description_ar : "";
    if (!title_ar.trim() && !description_ar.trim()) continue;
    items.push({
      icon: isAboutValueIcon(row.icon) ? row.icon : "Heart",
      title_ar,
      description_ar,
      ...(typeof row.title_en === "string" ? { title_en: row.title_en } : {}),
      ...(typeof row.description_en === "string"
        ? { description_en: row.description_en }
        : {}),
    });
  }

  return items.length > 0 ? items : DEFAULT_SETTINGS.about_values;
}

function stringOrDefault(
  raw: unknown,
  fallback: string
): string {
  return typeof raw === "string" ? raw : fallback;
}

/**
 * Merge DB JSON with defaults.
 * Only fills missing keys from DEFAULT_SETTINGS — never overwrites existing
 * admin content (including empty strings the admin intentionally saved).
 */
export function normalizeSiteSettings(
  raw?: Partial<SiteSettings> | null
): SiteSettings {
  const source = (raw ?? {}) as Partial<SiteSettings> & Record<string, unknown>;
  const settings = { ...DEFAULT_SETTINGS, ...source };

  return {
    ...settings,
    hero_title_ar: stringOrDefault(
      source.hero_title_ar,
      DEFAULT_SETTINGS.hero_title_ar
    ),
    hero_title_emphasis_ar: stringOrDefault(
      source.hero_title_emphasis_ar,
      DEFAULT_SETTINGS.hero_title_emphasis_ar
    ),
    hero_subtitle_ar: stringOrDefault(
      source.hero_subtitle_ar,
      DEFAULT_SETTINGS.hero_subtitle_ar
    ),
    hero_image_url: stringOrDefault(
      source.hero_image_url,
      DEFAULT_SETTINGS.hero_image_url
    ),
    hero_image_alt_ar: stringOrDefault(
      source.hero_image_alt_ar,
      DEFAULT_SETTINGS.hero_image_alt_ar
    ),
    hero_cta_primary_label_ar: stringOrDefault(
      source.hero_cta_primary_label_ar,
      DEFAULT_SETTINGS.hero_cta_primary_label_ar
    ),
    hero_cta_primary_href: stringOrDefault(
      source.hero_cta_primary_href,
      DEFAULT_SETTINGS.hero_cta_primary_href
    ),
    hero_cta_secondary_label_ar: stringOrDefault(
      source.hero_cta_secondary_label_ar,
      DEFAULT_SETTINGS.hero_cta_secondary_label_ar
    ),
    hero_cta_secondary_href: stringOrDefault(
      source.hero_cta_secondary_href,
      DEFAULT_SETTINGS.hero_cta_secondary_href
    ),
    about_ar: stringOrDefault(source.about_ar, DEFAULT_SETTINGS.about_ar),
    about_page_title_ar: stringOrDefault(
      source.about_page_title_ar,
      DEFAULT_SETTINGS.about_page_title_ar
    ),
    about_page_subtitle_ar: stringOrDefault(
      source.about_page_subtitle_ar,
      DEFAULT_SETTINGS.about_page_subtitle_ar
    ),
    about_story_eyebrow_ar: stringOrDefault(
      source.about_story_eyebrow_ar,
      DEFAULT_SETTINGS.about_story_eyebrow_ar
    ),
    about_story_heading_ar: stringOrDefault(
      source.about_story_heading_ar,
      DEFAULT_SETTINGS.about_story_heading_ar
    ),
    about_secondary_ar: stringOrDefault(
      source.about_secondary_ar,
      DEFAULT_SETTINGS.about_secondary_ar
    ),
    about_image_url: stringOrDefault(
      source.about_image_url,
      DEFAULT_SETTINGS.about_image_url
    ),
    about_image_alt_ar: stringOrDefault(
      source.about_image_alt_ar,
      DEFAULT_SETTINGS.about_image_alt_ar
    ),
    about_cta_label_ar: stringOrDefault(
      source.about_cta_label_ar,
      DEFAULT_SETTINGS.about_cta_label_ar
    ),
    about_cta_href: stringOrDefault(
      source.about_cta_href,
      DEFAULT_SETTINGS.about_cta_href
    ),
    about_values: normalizeAboutValues(source.about_values),
    homepage_extra:
      source.homepage_extra &&
      typeof source.homepage_extra === "object" &&
      !Array.isArray(source.homepage_extra)
        ? (source.homepage_extra as Record<string, unknown>)
        : DEFAULT_SETTINGS.homepage_extra,
    cms:
      source.cms && typeof source.cms === "object" && !Array.isArray(source.cms)
        ? {
            homepage:
              source.cms.homepage &&
              typeof source.cms.homepage === "object" &&
              !Array.isArray(source.cms.homepage)
                ? source.cms.homepage
                : {},
            about:
              source.cms.about &&
              typeof source.cms.about === "object" &&
              !Array.isArray(source.cms.about)
                ? source.cms.about
                : {},
          }
        : DEFAULT_SETTINGS.cms,
    shipping_enabled:
      typeof source.shipping_enabled === "boolean"
        ? source.shipping_enabled
        : DEFAULT_SETTINGS.shipping_enabled,
    shipping_flat_fee:
      typeof source.shipping_flat_fee === "number" &&
      Number.isFinite(source.shipping_flat_fee)
        ? Math.max(0, source.shipping_flat_fee)
        : DEFAULT_SETTINGS.shipping_flat_fee,
    shipping_free_threshold:
      typeof source.shipping_free_threshold === "number" &&
      Number.isFinite(source.shipping_free_threshold)
        ? Math.max(0, source.shipping_free_threshold)
        : DEFAULT_SETTINGS.shipping_free_threshold,
    boutique_pickup_enabled:
      typeof source.boutique_pickup_enabled === "boolean"
        ? source.boutique_pickup_enabled
        : DEFAULT_SETTINGS.boutique_pickup_enabled,
    delivery_enabled:
      typeof source.delivery_enabled === "boolean"
        ? source.delivery_enabled
        : DEFAULT_SETTINGS.delivery_enabled,
    instagram_url: OFFICIAL_INSTAGRAM_URL,
    instagram_handle: OFFICIAL_INSTAGRAM_HANDLE,
  };
}

/**
 * Deep-ish merge for PUT: apply partial patch over current settings.
 * Arrays (`about_values`) replace when provided; nested `cms` / `homepage_extra`
 * bags shallow-merge so future section keys are preserved.
 */
export function mergeSiteSettingsPatch(
  current: SiteSettings,
  patch: Partial<SiteSettings>
): SiteSettings {
  const next: Partial<SiteSettings> = { ...current, ...patch };

  if (patch.about_values !== undefined) {
    next.about_values = patch.about_values;
  }

  if (patch.homepage_extra !== undefined) {
    next.homepage_extra = {
      ...(current.homepage_extra ?? {}),
      ...(patch.homepage_extra ?? {}),
    };
  }

  if (patch.cms !== undefined) {
    next.cms = {
      homepage: {
        ...(current.cms?.homepage ?? {}),
        ...(patch.cms.homepage ?? {}),
      },
      about: {
        ...(current.cms?.about ?? {}),
        ...(patch.cms.about ?? {}),
      },
    };
  }

  return normalizeSiteSettings(next);
}
