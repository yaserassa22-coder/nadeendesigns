import { cache } from "react";
import {
  DEFAULT_PAYMENT_PROVIDERS,
  DEFAULT_STORE_INTEGRATIONS,
  DEFAULT_STORE_SETTINGS,
  type StoreAnnouncementItem,
  type StoreAnnouncementRotationInterval,
  type StoreAnnouncementSettings,
  type StoreAuthSettings,
  type StoreBusinessIdType,
  type StoreContactSettings,
  type StoreExtraServicesSettings,
  type StoreGeneralSettings,
  type StoreHomepageSettings,
  type StoreIntegrationStub,
  type StoreLegalSettings,
  type StoreNotificationChannelSettings,
  type StoreOrderOptionsSettings,
  type StorePaymentProvider,
  type StoreSecuritySettings,
  type StoreSeoSettings,
  type StoreSettings,
  type StoreSettingsSection,
  type StoreShippingSettings,
  type StoreSocialSettings,
  type StoreTaxDocumentType,
  type StoreTaxSettings,
  type VisualUnifiedBackgroundSettings,
  type VisualUnifiedBgPosition,
  type VisualUnifiedBgSize,
} from "@/types/store";
import {
  normalizeExtraServices,
  normalizeOrderOptions,
} from "@/lib/products/order-experience";
import { resolveUnifiedCanvasColor } from "@/lib/home/visual-unified-background";
import { normalizeAccessoriesEditorialFrame } from "@/lib/home/accessories-editorial-frame";
import { normalizeVisualGridLayoutId } from "@/lib/home/visual-layout-grid";
import {
  resolveStoreExtraServices,
  syncStoreServicesTable,
} from "@/lib/products/store-services";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  getCustomerAuthSettings,
  mergeCustomerAuthSettings,
  saveCustomerAuthSettings,
} from "@/lib/customer-auth/settings";
import {
  mergeSiteSettingsPatch,
  normalizeSiteSettings,
} from "@/lib/settings";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import type { SiteSettings } from "@/types";
import {
  normalizeEnabledLocales,
  resolveEnabledLocale,
  isLocale,
} from "@/lib/i18n/config";

export const STORE_SETTINGS_KEY = "store";

let cached: StoreSettings | null = null;
let cachedAt = 0;
const CACHE_MS = 30_000;

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function num(value: unknown, fallback: number, min = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, n);
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function clampPercent(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

function normalizeUnifiedBackground(raw: unknown): VisualUnifiedBackgroundSettings {
  const d = DEFAULT_STORE_SETTINGS.homepage.visual_layout_unified;
  const s = asObject(raw);
  const sizeRaw = str(s.size, d.size);
  const size: VisualUnifiedBgSize =
    sizeRaw === "cover" || sizeRaw === "contain" || sizeRaw === "natural"
      ? sizeRaw
      : d.size;
  const posRaw = str(s.position, d.position);
  const position: VisualUnifiedBgPosition =
    posRaw === "center" ||
    posRaw === "top" ||
    posRaw === "bottom" ||
    posRaw === "left" ||
    posRaw === "right"
      ? posRaw
      : d.position;
  const colorRaw = str(s.color, d.color).trim();
  const color = resolveUnifiedCanvasColor(colorRaw);
  const scale = num(s.product_scale, d.product_scale);
  const intensity = num(s.product_shadow_intensity, d.product_shadow_intensity);
  const enabled = bool(s.enabled, d.enabled);
  return {
    enabled,
    color,
    image_url: str(s.image_url, d.image_url).trim(),
    size,
    position,
    product_scale: Math.min(1.2, Math.max(0.7, scale)),
    product_offset_x: Math.min(20, Math.max(-20, num(s.product_offset_x, d.product_offset_x))),
    product_offset_y: Math.min(20, Math.max(-20, num(s.product_offset_y, d.product_offset_y))),
    product_shadow: bool(s.product_shadow, d.product_shadow),
    product_shadow_intensity: Math.min(100, Math.max(0, intensity)),
    isolate_products: bool(s.isolate_products, enabled ? true : d.isolate_products),
    keep_product_grids: bool(s.keep_product_grids, d.keep_product_grids),
  };
}

function normalizeProvider(
  raw: unknown,
  fallback: StorePaymentProvider
): StorePaymentProvider {
  const src = asObject(raw);
  const nameHe =
    typeof src.name_he === "string" && src.name_he.trim()
      ? src.name_he.trim()
      : fallback.name_he ?? "";
  const descriptionHe =
    typeof src.description_he === "string" && src.description_he.trim()
      ? src.description_he.trim()
      : fallback.description_he ?? "";
  return {
    id: str(src.id, fallback.id),
    name: str(src.name, fallback.name),
    name_ar: str(src.name_ar, fallback.name_ar),
    name_he: nameHe,
    enabled: bool(src.enabled, fallback.enabled),
    coming_soon: bool(src.coming_soon, fallback.coming_soon),
    sort_order: Math.floor(num(src.sort_order, fallback.sort_order)),
    icon: str(src.icon, fallback.icon),
    description: str(src.description, fallback.description),
    description_ar: str(src.description_ar, fallback.description_ar),
    description_he: descriptionHe,
    configuration: asObject(src.configuration),
    secret_env_ref:
      src.secret_env_ref === null
        ? null
        : str(src.secret_env_ref, fallback.secret_env_ref ?? ""),
    configured: bool(src.configured, fallback.configured),
  };
}

function normalizeProviders(raw: unknown): StorePaymentProvider[] {
  const list = Array.isArray(raw) ? raw : [];
  const byId = new Map<string, unknown>();
  for (const item of list) {
    const id = str(asObject(item).id, "");
    if (id) byId.set(id, item);
  }

  const merged = DEFAULT_PAYMENT_PROVIDERS.map((def) =>
    normalizeProvider(byId.get(def.id) ?? def, def)
  );

  // Preserve any custom providers admin may have added
  for (const item of list) {
    const id = str(asObject(item).id, "");
    if (!id || DEFAULT_PAYMENT_PROVIDERS.some((d) => d.id === id)) continue;
    merged.push(
      normalizeProvider(item, {
        ...DEFAULT_PAYMENT_PROVIDERS[0],
        id,
        enabled: false,
        coming_soon: true,
        configured: false,
      })
    );
  }

  return merged.sort((a, b) => a.sort_order - b.sort_order);
}

function normalizeIntegrations(raw: unknown): StoreIntegrationStub[] {
  const list = Array.isArray(raw) ? raw : [];
  const byId = new Map<string, unknown>();
  for (const item of list) {
    const id = str(asObject(item).id, "");
    if (id) byId.set(id, item);
  }

  return DEFAULT_STORE_INTEGRATIONS.map((def) => {
    const src = asObject(byId.get(def.id) ?? {});
    return {
      id: def.id,
      name: str(src.name, def.name),
      enabled: bool(src.enabled, def.enabled),
      coming_soon: bool(src.coming_soon, def.coming_soon),
      configured: bool(src.configured, def.configured),
      env_refs: Array.isArray(src.env_refs)
        ? (src.env_refs as unknown[]).filter(
            (x): x is string => typeof x === "string"
          )
        : def.env_refs,
      notes: str(src.notes, def.notes),
    };
  });
}

function normalizeGeneral(raw: unknown): StoreGeneralSettings {
  const d = DEFAULT_STORE_SETTINGS.general;
  const s = asObject(raw);
  const enabled_locales = normalizeEnabledLocales(
    s.enabled_locales !== undefined ? s.enabled_locales : d.enabled_locales
  );
  const languageRaw = str(s.language, d.language);
  const language = resolveEnabledLocale(
    isLocale(languageRaw) ? languageRaw : d.language,
    enabled_locales,
    enabled_locales[0]
  );
  return {
    store_name: str(s.store_name, d.store_name),
    description: str(s.description, d.description),
    description_ar: str(s.description_ar, d.description_ar),
    description_he: str(s.description_he, d.description_he),
    logo_url: str(s.logo_url, d.logo_url),
    favicon_url: str(s.favicon_url, d.favicon_url),
    business_email: str(s.business_email, d.business_email),
    business_phone: str(s.business_phone, d.business_phone),
    business_address: str(s.business_address, d.business_address),
    business_address_ar: str(s.business_address_ar, d.business_address_ar),
    business_address_he: str(s.business_address_he, d.business_address_he),
    working_hours: str(s.working_hours, d.working_hours),
    working_hours_ar: str(s.working_hours_ar, d.working_hours_ar),
    working_hours_he: str(s.working_hours_he, d.working_hours_he),
    currency: str(s.currency, d.currency),
    language,
    enabled_locales,
    timezone: str(s.timezone, d.timezone),
  };
}

function normalizeShipping(raw: unknown): StoreShippingSettings {
  const d = DEFAULT_STORE_SETTINGS.shipping;
  const s = asObject(raw);
  return {
    shipping_enabled: bool(s.shipping_enabled, d.shipping_enabled),
    shipping_flat_fee: num(s.shipping_flat_fee, d.shipping_flat_fee),
    shipping_free_threshold: num(
      s.shipping_free_threshold,
      d.shipping_free_threshold
    ),
    boutique_pickup_enabled: bool(
      s.boutique_pickup_enabled,
      d.boutique_pickup_enabled
    ),
    delivery_enabled: bool(s.delivery_enabled, d.delivery_enabled),
    estimated_delivery_ar: str(
      s.estimated_delivery_ar,
      d.estimated_delivery_ar
    ),
  };
}

function normalizeContact(raw: unknown): StoreContactSettings {
  const d = DEFAULT_STORE_SETTINGS.contact;
  const s = asObject(raw);
  return {
    phone: str(s.phone, d.phone),
    email: str(s.email, d.email),
    whatsapp: str(s.whatsapp, d.whatsapp),
    instagram_url: str(s.instagram_url, d.instagram_url),
    facebook_url: str(s.facebook_url, d.facebook_url),
    tiktok_url: str(s.tiktok_url, d.tiktok_url),
    location_ar: str(s.location_ar, d.location_ar),
    google_maps_url: str(s.google_maps_url, d.google_maps_url),
  };
}

function normalizeSocial(raw: unknown): StoreSocialSettings {
  const d = DEFAULT_STORE_SETTINGS.social;
  const s = asObject(raw);
  return {
    instagram_url: str(s.instagram_url, d.instagram_url),
    facebook_url: str(s.facebook_url, d.facebook_url),
    tiktok_url: str(s.tiktok_url, d.tiktok_url),
    pinterest_url: str(s.pinterest_url, d.pinterest_url),
    youtube_url: str(s.youtube_url, d.youtube_url),
  };
}

function normalizeHomepage(raw: unknown): StoreHomepageSettings {
  const d = DEFAULT_STORE_SETTINGS.homepage;
  const s = asObject(raw);
  const editorialRaw = s.editorial_order;
  const editorial_order = Array.isArray(editorialRaw)
    ? editorialRaw
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        .map((id) => id.trim())
    : [...d.editorial_order];
  const colsRaw = Number(s.editorial_columns);
  const editorial_columns =
    colsRaw === 2 || colsRaw === 3 || colsRaw === 4
      ? (colsRaw as 2 | 3 | 4)
      : d.editorial_columns;
  // Legacy: a non-empty order saved before editorial_manual existed counts as manual.
  const editorial_manual =
    "editorial_manual" in s
      ? bool(s.editorial_manual, d.editorial_manual)
      : editorial_order.length > 0;
  const gapRaw = str(s.editorial_gap, d.editorial_gap);
  const editorial_gap =
    gapRaw === "none" ||
    gapRaw === "sm" ||
    gapRaw === "md" ||
    gapRaw === "lg" ||
    gapRaw === "xl"
      ? gapRaw
      : d.editorial_gap;
  const sizeRaw = str(s.editorial_tile_size, d.editorial_tile_size);
  const editorial_tile_size =
    sizeRaw === "sm" || sizeRaw === "md" || sizeRaw === "lg"
      ? sizeRaw
      : d.editorial_tile_size;
  const patternRaw = str(s.editorial_pattern, d.editorial_pattern);
  const editorial_pattern =
    patternRaw === "uniform" ||
    patternRaw === "editorial" ||
    patternRaw === "spotlight"
      ? patternRaw
      : d.editorial_pattern;
  const visualLayoutEnabled = bool(
    s.visual_layout_enabled,
    d.visual_layout_enabled
  );
  const visualLayoutHeight = Math.min(
    1800,
    Math.max(520, Math.floor(num(s.visual_layout_height, d.visual_layout_height, 520)))
  );
  const visualLayoutItems = Array.isArray(s.visual_layout_items)
    ? s.visual_layout_items
        .map((entry, index) => {
          const item = asObject(entry);
          const shapeRaw = str(item.shape, "portrait");
          const shape: StoreHomepageSettings["visual_layout_items"][number]["shape"] =
            shapeRaw === "square" ||
            shapeRaw === "portrait" ||
            shapeRaw === "landscape" ||
            shapeRaw === "wide" ||
            shapeRaw === "hero"
              ? shapeRaw
              : "portrait";
          const width = Math.max(10, Math.min(100, clampPercent(item.w, 24)));
          const height = Math.max(12, Math.min(100, clampPercent(item.h, 36)));
          return {
            id: str(item.id, "").trim(),
            x: clampPercent(item.x, 0),
            y: clampPercent(item.y, 0),
            w: width,
            h: height,
            shape,
            z: Math.max(0, Math.floor(num(item.z, index, 0))),
          };
        })
        .filter((item) => item.id.length > 0)
    : d.visual_layout_items;

  const legacyGapRaw = str(s.visual_layout_gap, "");
  const hasNumericSpacing =
    s.visual_layout_pad_top !== undefined ||
    s.visual_layout_block_gap !== undefined ||
    s.visual_layout_edge_gap !== undefined;

  let visual_layout_pad_top = clampPercent(
    s.visual_layout_pad_top,
    d.visual_layout_pad_top
  );
  let visual_layout_block_gap = clampPercent(
    s.visual_layout_block_gap,
    d.visual_layout_block_gap
  );
  let visual_layout_edge_gap = clampPercent(
    s.visual_layout_edge_gap,
    d.visual_layout_edge_gap
  );

  if (!hasNumericSpacing && legacyGapRaw) {
    const migrated =
      legacyGapRaw === "none" ||
      legacyGapRaw === "sm" ||
      legacyGapRaw === "md" ||
      legacyGapRaw === "lg" ||
      legacyGapRaw === "xl"
        ? legacyGapRaw
        : "md";
    const spacing =
      migrated === "none"
        ? { padTop: 8, blockGap: 0, edgeGap: 1 }
        : migrated === "sm"
          ? { padTop: 10, blockGap: 0.3, edgeGap: 1.5 }
          : migrated === "lg"
            ? { padTop: 14, blockGap: 1, edgeGap: 2.5 }
            : migrated === "xl"
              ? { padTop: 16, blockGap: 1.65, edgeGap: 3 }
              : { padTop: 12, blockGap: 0.6, edgeGap: 2 };
    visual_layout_pad_top = spacing.padTop;
    visual_layout_block_gap = spacing.blockGap;
    visual_layout_edge_gap = spacing.edgeGap;
  }

  visual_layout_pad_top = Math.min(24, Math.max(4, visual_layout_pad_top));
  visual_layout_block_gap = Math.min(5, Math.max(0, visual_layout_block_gap));
  visual_layout_edge_gap = Math.min(4, Math.max(0, visual_layout_edge_gap));

  const visual_layout_row_scales = Array.isArray(s.visual_layout_row_scales)
    ? s.visual_layout_row_scales
        .map((value) => {
          const n = typeof value === "number" ? value : Number(value);
          if (!Number.isFinite(n)) return 1;
          return Math.min(2.5, Math.max(0.4, Math.round(n * 100) / 100));
        })
        .slice(0, 24)
    : d.visual_layout_row_scales;

  const visual_layout_unified = normalizeUnifiedBackground(
    s.visual_layout_unified
  );

  return {
    hero: bool(s.hero, d.hero),
    featured_categories: bool(s.featured_categories, d.featured_categories),
    featured_products: bool(s.featured_products, d.featured_products),
    accessories_editorial: bool(
      s.accessories_editorial,
      d.accessories_editorial
    ),
    accessories_editorial_frame: normalizeAccessoriesEditorialFrame(
      s.accessories_editorial_frame
    ),
    accessories_editorial_grid_enabled: bool(
      s.accessories_editorial_grid_enabled,
      d.accessories_editorial_grid_enabled
    ),
    accessories_editorial_grid_columns:
      Number(s.accessories_editorial_grid_columns) === 2 ||
      Number(s.accessories_editorial_grid_columns) === 4 ||
      Number(s.accessories_editorial_grid_columns) === 6
        ? (Number(s.accessories_editorial_grid_columns) as 2 | 4 | 6)
        : d.accessories_editorial_grid_columns,
    accessories_editorial_grid_scroll: bool(
      s.accessories_editorial_grid_scroll,
      d.accessories_editorial_grid_scroll
    ),
    accessories_editorial_grid_style:
      s.accessories_editorial_grid_style === "cards" ||
      s.accessories_editorial_grid_style === "minimal" ||
      s.accessories_editorial_grid_style === "editorial"
        ? s.accessories_editorial_grid_style
        : d.accessories_editorial_grid_style,
    collections: bool(s.collections, d.collections),
    testimonials: bool(s.testimonials, d.testimonials),
    worn_by_you: bool(s.worn_by_you, d.worn_by_you),
    worn_by_you_eyebrow: str(s.worn_by_you_eyebrow, d.worn_by_you_eyebrow),
    worn_by_you_title: str(s.worn_by_you_title, d.worn_by_you_title),
    instagram: bool(s.instagram, d.instagram),
    newsletter: bool(s.newsletter, d.newsletter),
    editorial_order,
    editorial_manual,
    editorial_columns,
    editorial_gap,
    editorial_tile_size,
    editorial_pattern,
    visual_layout_enabled: visualLayoutEnabled,
    visual_layout_grid: normalizeVisualGridLayoutId(s.visual_layout_grid),
    visual_layout_height: visualLayoutHeight,
    visual_layout_items: visualLayoutItems,
    visual_layout_pad_top,
    visual_layout_block_gap,
    visual_layout_edge_gap,
    visual_layout_row_scales,
    visual_layout_unified,
  };
}

function normalizeAuth(raw: unknown): StoreAuthSettings {
  const d = DEFAULT_STORE_SETTINGS.authentication;
  const s = asObject(raw);
  return {
    guest_checkout_enabled: bool(
      s.guest_checkout_enabled,
      d.guest_checkout_enabled
    ),
    google_enabled: bool(s.google_enabled, d.google_enabled),
    apple_enabled: bool(s.apple_enabled, d.apple_enabled),
    email_password_enabled: bool(
      s.email_password_enabled,
      d.email_password_enabled
    ),
    phone_otp_enabled: bool(s.phone_otp_enabled, d.phone_otp_enabled),
    registration_enabled: bool(s.registration_enabled, d.registration_enabled),
  };
}

function normalizeNotifications(
  raw: unknown
): StoreNotificationChannelSettings {
  const d = DEFAULT_STORE_SETTINGS.notifications;
  const s = asObject(raw);
  return {
    email_enabled: bool(s.email_enabled, d.email_enabled),
    whatsapp_enabled: bool(s.whatsapp_enabled, d.whatsapp_enabled),
    sms_enabled: bool(s.sms_enabled, d.sms_enabled),
    sms_coming_soon: bool(s.sms_coming_soon, d.sms_coming_soon),
  };
}

function normalizeSeo(raw: unknown): StoreSeoSettings {
  const d = DEFAULT_STORE_SETTINGS.seo;
  const s = asObject(raw);
  return {
    title: str(s.title, d.title),
    description: str(s.description, d.description),
    keywords: str(s.keywords, d.keywords),
    og_image_url: str(s.og_image_url, d.og_image_url),
    robots_index: bool(s.robots_index, d.robots_index),
    robots_follow: bool(s.robots_follow, d.robots_follow),
    google_analytics_id: str(s.google_analytics_id, d.google_analytics_id),
    google_analytics_enabled: bool(
      s.google_analytics_enabled,
      d.google_analytics_enabled
    ),
    meta_pixel_id: str(s.meta_pixel_id, d.meta_pixel_id),
    meta_pixel_enabled: bool(s.meta_pixel_enabled, d.meta_pixel_enabled),
  };
}

function normalizeSecurity(raw: unknown): StoreSecuritySettings {
  const d = DEFAULT_STORE_SETTINGS.security;
  const s = asObject(raw);
  const status = str(s.backup_status, d.backup_status);
  const backup_status =
    status === "ok" ||
    status === "warning" ||
    status === "error" ||
    status === "unknown"
      ? status
      : d.backup_status;
  return {
    session_timeout_minutes: Math.min(
      1440,
      Math.max(5, Math.floor(num(s.session_timeout_minutes, d.session_timeout_minutes, 5)))
    ),
    maintenance_mode: bool(s.maintenance_mode, d.maintenance_mode),
    maintenance_message_ar: str(
      s.maintenance_message_ar,
      d.maintenance_message_ar
    ),
    maintenance_message_he: str(
      s.maintenance_message_he,
      d.maintenance_message_he
    ),
    maintenance_message_en: str(
      s.maintenance_message_en,
      d.maintenance_message_en
    ),
    backup_status,
    backup_last_at:
      s.backup_last_at === null
        ? null
        : str(s.backup_last_at, d.backup_last_at ?? ""),
    backup_note: str(s.backup_note, d.backup_note),
  };
}

const ANNOUNCEMENT_INTERVALS: StoreAnnouncementRotationInterval[] = [
  4, 5, 6, 8, 10,
];

function newAnnouncementId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `ann_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `ann_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeAnnouncementInterval(
  value: unknown,
  fallback: StoreAnnouncementRotationInterval
): StoreAnnouncementRotationInterval {
  const n = Math.round(num(value, fallback));
  return (ANNOUNCEMENT_INTERVALS.includes(n as StoreAnnouncementRotationInterval)
    ? n
    : fallback) as StoreAnnouncementRotationInterval;
}

function normalizeAnnouncementMarqueeDuration(raw: unknown, bag: Record<string, unknown>): number {
  const d = DEFAULT_STORE_SETTINGS.announcement.marquee_duration_seconds;
  if (raw != null && raw !== "") {
    const n = Math.round(num(raw, d));
    return Math.min(180, Math.max(5, n));
  }
  // Backwards compatibility with old slow|normal|fast enum
  const legacy = str(bag.marquee_speed, "");
  if (legacy === "slow") return 48;
  if (legacy === "fast") return 20;
  if (legacy === "normal") return 32;
  return d;
}

function normalizeAnnouncementItem(
  raw: unknown,
  index: number
): StoreAnnouncementItem {
  const s = asObject(raw);
  const id = str(s.id, "").trim() || newAnnouncementId();
  return {
    id,
    enabled: bool(s.enabled, true),
    order: Math.max(0, Math.floor(num(s.order, index))),
    text_ar: str(s.text_ar, ""),
    text_he: str(s.text_he, ""),
    text_en: str(s.text_en, ""),
    link: str(s.link, ""),
  };
}

function normalizeAnnouncement(raw: unknown): StoreAnnouncementSettings {
  const d = DEFAULT_STORE_SETTINGS.announcement;
  const s = asObject(raw);

  let items: StoreAnnouncementItem[] = [];
  if (Array.isArray(s.items)) {
    items = s.items.map((item, i) => normalizeAnnouncementItem(item, i));
  }

  // Backwards compatibility: migrate legacy single-message fields into items.
  if (items.length === 0) {
    const legacyAr = str(s.text_ar, "");
    const legacyHe = str(s.text_he, "");
    const legacyEn = str(s.text_en, "");
    const legacyLink = str(s.link, "");
    if (legacyAr || legacyHe || legacyEn || legacyLink) {
      items = [
        {
          id: newAnnouncementId(),
          enabled: true,
          order: 0,
          text_ar: legacyAr,
          text_he: legacyHe,
          text_en: legacyEn,
          link: legacyLink,
        },
      ];
    }
  }

  items = [...items]
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((item, i) => ({ ...item, order: i }));

  const first = items[0];

  return {
    enabled: bool(s.enabled, d.enabled),
    rotation_enabled: bool(s.rotation_enabled, d.rotation_enabled),
    rotation_interval: normalizeAnnouncementInterval(
      s.rotation_interval,
      d.rotation_interval
    ),
    marquee_enabled: bool(s.marquee_enabled, d.marquee_enabled),
    marquee_duration_seconds: normalizeAnnouncementMarqueeDuration(
      s.marquee_duration_seconds,
      s
    ),
    desktop_enabled: bool(s.desktop_enabled, d.desktop_enabled),
    mobile_enabled: bool(s.mobile_enabled, d.mobile_enabled),
    background_color: str(s.background_color, d.background_color),
    text_color: str(s.text_color, d.text_color),
    items,
    // Mirror first item so any legacy readers keep working.
    text_ar: first?.text_ar ?? "",
    text_he: first?.text_he ?? "",
    text_en: first?.text_en ?? "",
    link: first?.link ?? "",
  };
}

function normalizeLegal(raw: unknown): StoreLegalSettings {
  const d = DEFAULT_STORE_SETTINGS.legal;
  const s = asObject(raw);
  return {
    terms_ar: str(s.terms_ar, d.terms_ar),
    terms_he: str(s.terms_he, d.terms_he),
    terms_en: str(s.terms_en, d.terms_en),
    privacy_ar: str(s.privacy_ar, d.privacy_ar),
    privacy_he: str(s.privacy_he, d.privacy_he),
    privacy_en: str(s.privacy_en, d.privacy_en),
    returns_ar: str(s.returns_ar, d.returns_ar),
    returns_he: str(s.returns_he, d.returns_he),
    returns_en: str(s.returns_en, d.returns_en),
    shipping_policy_ar: str(s.shipping_policy_ar, d.shipping_policy_ar),
    shipping_policy_he: str(s.shipping_policy_he, d.shipping_policy_he),
    shipping_policy_en: str(s.shipping_policy_en, d.shipping_policy_en),
    show_template_banner: bool(s.show_template_banner, d.show_template_banner),
    require_checkout_acceptance: bool(
      s.require_checkout_acceptance,
      d.require_checkout_acceptance
    ),
    cookie_banner_enabled: bool(
      s.cookie_banner_enabled,
      d.cookie_banner_enabled
    ),
    updated_at:
      s.updated_at === null ? null : str(s.updated_at, d.updated_at ?? ""),
  };
}

function normalizeTaxDocumentType(
  value: unknown,
  fallback: StoreTaxDocumentType
): StoreTaxDocumentType {
  const v = str(value, fallback);
  if (v === "receipt" || v === "tax_invoice" || v === "tax_invoice_receipt") {
    return v;
  }
  return fallback;
}

function normalizeBusinessIdType(
  value: unknown,
  fallback: StoreBusinessIdType
): StoreBusinessIdType {
  const v = str(value, fallback);
  if (
    v === "company" ||
    v === "authorized_dealer" ||
    v === "exempt" ||
    v === "other"
  ) {
    return v;
  }
  return fallback;
}

function normalizeTax(raw: unknown): StoreTaxSettings {
  const d = DEFAULT_STORE_SETTINGS.tax;
  const s = asObject(raw);
  const trigger = str(s.issue_trigger, d.issue_trigger);
  const issue_trigger =
    trigger === "on_order" ||
    trigger === "on_payment_received" ||
    trigger === "manual"
      ? trigger
      : d.issue_trigger;
  return {
    business_id: str(s.business_id, d.business_id),
    business_id_type: normalizeBusinessIdType(
      s.business_id_type,
      d.business_id_type
    ),
    vat_rate: Math.min(100, Math.max(0, num(s.vat_rate, d.vat_rate))),
    prices_include_vat: bool(s.prices_include_vat, d.prices_include_vat),
    default_document_type: normalizeTaxDocumentType(
      s.default_document_type,
      d.default_document_type
    ),
    issue_trigger,
    invoice_prefix: str(s.invoice_prefix, d.invoice_prefix).slice(0, 16),
    next_invoice_number: Math.max(
      1,
      Math.floor(num(s.next_invoice_number, d.next_invoice_number, 1))
    ),
    provider: str(s.provider, d.provider),
    provider_coming_soon: bool(s.provider_coming_soon, d.provider_coming_soon),
    provider_notes: str(s.provider_notes, d.provider_notes),
  };
}

/** Fill missing keys from defaults; preserve admin-saved empty strings. */
export function normalizeStoreSettings(
  raw?: Partial<StoreSettings> | null
): StoreSettings {
  const src = asObject(raw);
  const payments = asObject(src.payments);
  return {
    general: normalizeGeneral(src.general),
    announcement: normalizeAnnouncement(src.announcement),
    payments: {
      providers: normalizeProviders(payments.providers),
    },
    shipping: normalizeShipping(src.shipping),
    contact: normalizeContact(src.contact),
    social: normalizeSocial(src.social),
    homepage: normalizeHomepage(src.homepage),
    authentication: normalizeAuth(src.authentication),
    notifications: normalizeNotifications(src.notifications),
    seo: normalizeSeo(src.seo),
    security: normalizeSecurity(src.security),
    integrations: normalizeIntegrations(src.integrations),
    order_options: normalizeOrderOptions(
      src.order_options
    ) as StoreOrderOptionsSettings,
    extra_services: normalizeExtraServices(
      src.extra_services
    ) as StoreExtraServicesSettings,
    legal: normalizeLegal(src.legal),
    tax: normalizeTax(src.tax),
  };
}

/**
 * Merge-safe patch: shallow-spread top level, deep-merge known section bags
 * and payment providers by id so concurrent section saves never clobber.
 */
export function mergeStoreSettingsPatch(
  current: StoreSettings,
  patch: Partial<StoreSettings>
): StoreSettings {
  const next: StoreSettings = {
    ...current,
    general: patch.general
      ? { ...current.general, ...patch.general }
      : current.general,
    announcement: patch.announcement
      ? normalizeAnnouncement({
          ...current.announcement,
          ...patch.announcement,
        })
      : current.announcement,
    payments: patch.payments
      ? {
          providers: normalizeProviders(
            patch.payments.providers ?? current.payments.providers
          ),
        }
      : current.payments,
    shipping: patch.shipping
      ? { ...current.shipping, ...patch.shipping }
      : current.shipping,
    contact: patch.contact
      ? { ...current.contact, ...patch.contact }
      : current.contact,
    social: patch.social
      ? { ...current.social, ...patch.social }
      : current.social,
    homepage: patch.homepage
      ? { ...current.homepage, ...patch.homepage }
      : current.homepage,
    authentication: patch.authentication
      ? { ...current.authentication, ...patch.authentication }
      : current.authentication,
    notifications: patch.notifications
      ? { ...current.notifications, ...patch.notifications }
      : current.notifications,
    seo: patch.seo ? { ...current.seo, ...patch.seo } : current.seo,
    security: patch.security
      ? { ...current.security, ...patch.security }
      : current.security,
    integrations: patch.integrations
      ? normalizeIntegrations(patch.integrations)
      : current.integrations,
    order_options: patch.order_options
      ? (normalizeOrderOptions({
          options: patch.order_options.options ?? current.order_options.options,
        }) as StoreOrderOptionsSettings)
      : current.order_options,
    extra_services: patch.extra_services
      ? (normalizeExtraServices({
          services:
            patch.extra_services.services ?? current.extra_services.services,
        }) as StoreExtraServicesSettings)
      : current.extra_services,
    legal: patch.legal
      ? { ...current.legal, ...patch.legal }
      : current.legal,
    tax: patch.tax ? { ...current.tax, ...patch.tax } : current.tax,
  };

  // Keep Contact + Social TikTok/Facebook/Instagram URLs in sync so either admin tab shows on the storefront.
  if (patch.contact) {
    next.social = {
      ...next.social,
      instagram_url: next.contact.instagram_url || next.social.instagram_url,
      facebook_url: next.contact.facebook_url || next.social.facebook_url,
      tiktok_url: next.contact.tiktok_url || next.social.tiktok_url,
    };
  }
  if (patch.social) {
    next.contact = {
      ...next.contact,
      instagram_url: next.social.instagram_url || next.contact.instagram_url,
      facebook_url: next.social.facebook_url || next.contact.facebook_url,
      tiktok_url: next.social.tiktok_url || next.contact.tiktok_url,
    };
  }

  return normalizeStoreSettings(next);
}

export const getStoreSettings = cache(async function getStoreSettings(
  force = false
): Promise<StoreSettings> {
  const now = Date.now();
  if (!force && cached && now - cachedAt < CACHE_MS) return cached;

  if (!isSupabaseConfigured()) {
    cached = DEFAULT_STORE_SETTINGS;
    cachedAt = now;
    return cached;
  }

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", STORE_SETTINGS_KEY)
      .maybeSingle();

    let settings = normalizeStoreSettings(
      (data?.value as Partial<StoreSettings> | null) ?? null
    );

    // Hydrate shipping/contact from live `site` when store bag is still default-ish
    // so admin UI reflects what storefront already shows.
    try {
      const { data: siteRow } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "site")
        .maybeSingle();
      if (siteRow?.value) {
        const site = normalizeSiteSettings(siteRow.value as SiteSettings);
        settings = hydrateFromSite(settings, site);
      }
    } catch {
      /* site hydrate optional */
    }

    try {
      const auth = await getCustomerAuthSettings(true);
      settings = {
        ...settings,
        authentication: {
          guest_checkout_enabled: auth.guest_checkout_enabled,
          google_enabled: auth.google_enabled,
          apple_enabled: auth.apple_enabled,
          email_password_enabled: auth.email_password_enabled,
          phone_otp_enabled: auth.otp_enabled,
          registration_enabled: settings.authentication.registration_enabled,
        },
      };
    } catch {
      /* auth hydrate optional */
    }

    try {
      const library = await resolveStoreExtraServices(settings.extra_services);
      settings = {
        ...settings,
        extra_services: library as StoreExtraServicesSettings,
      };
    } catch {
      /* store_services table optional until 038 */
    }

    cached = settings;
    cachedAt = now;
    return cached;
  } catch {
    return DEFAULT_STORE_SETTINGS;
  }
});

function hydrateFromSite(
  store: StoreSettings,
  site: SiteSettings
): StoreSettings {
  return {
    ...store,
    shipping: {
      ...store.shipping,
      shipping_enabled: site.shipping_enabled,
      shipping_flat_fee: site.shipping_flat_fee,
      shipping_free_threshold: site.shipping_free_threshold,
      boutique_pickup_enabled: site.boutique_pickup_enabled,
      delivery_enabled: site.delivery_enabled,
    },
    contact: {
      ...store.contact,
      phone: site.phone || store.contact.phone,
      email: site.email || store.contact.email,
      whatsapp: site.whatsapp || store.contact.whatsapp,
      instagram_url: site.instagram_url || store.contact.instagram_url,
      location_ar: site.address_ar || store.contact.location_ar,
    },
    general: {
      ...store.general,
      business_email: site.email || store.general.business_email,
      business_phone: site.phone || store.general.business_phone,
      business_address_ar:
        site.address_ar || store.general.business_address_ar,
      working_hours_ar: site.working_hours_ar || store.general.working_hours_ar,
    },
  };
}

async function loadSiteSettings(): Promise<SiteSettings> {
  if (!isSupabaseConfigured()) {
    return normalizeSiteSettings(DEFAULT_SETTINGS);
  }
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "site")
    .maybeSingle();
  if (!data?.value) return normalizeSiteSettings(DEFAULT_SETTINGS);
  return normalizeSiteSettings(data.value as SiteSettings);
}

async function saveSitePatch(patch: Partial<SiteSettings>): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const current = await loadSiteSettings();
  const merged = mergeSiteSettingsPatch(current, patch);
  const supabase = await createPrivilegedClient();
  const { error } = await supabase.from("settings").upsert({
    key: "site",
    value: merged,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/**
 * Persist store settings and sync overlapping domains into existing keys
 * (`site` shipping/contact, `customer_auth`) so checkout/CMS keep working.
 */
export async function saveStoreSettings(
  value: StoreSettings,
  sections?: StoreSettingsSection[]
): Promise<StoreSettings> {
  const merged = normalizeStoreSettings(value);
  const touchAll = !sections || sections.length === 0;
  const touch = (s: StoreSettingsSection) => touchAll || sections.includes(s);

  if (isSupabaseConfigured()) {
    const supabase = await createPrivilegedClient();
    const { error } = await supabase.from("settings").upsert({
      key: STORE_SETTINGS_KEY,
      value: merged,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  if (touch("shipping") || touch("contact") || touch("general") || touch("social")) {
    const sitePatch: Partial<SiteSettings> = {};
    if (touch("shipping")) {
      sitePatch.shipping_enabled = merged.shipping.shipping_enabled;
      sitePatch.shipping_flat_fee = merged.shipping.shipping_flat_fee;
      sitePatch.shipping_free_threshold = merged.shipping.shipping_free_threshold;
      sitePatch.boutique_pickup_enabled =
        merged.shipping.boutique_pickup_enabled;
      sitePatch.delivery_enabled = merged.shipping.delivery_enabled;
    }
    if (touch("contact") || touch("general")) {
      sitePatch.phone =
        merged.contact.phone || merged.general.business_phone;
      sitePatch.email =
        merged.contact.email || merged.general.business_email;
      sitePatch.whatsapp = merged.contact.whatsapp;
      sitePatch.address_ar =
        merged.contact.location_ar || merged.general.business_address_ar;
      sitePatch.address_he = merged.general.business_address_he;
      sitePatch.address_en = merged.general.business_address;
      sitePatch.working_hours_ar = merged.general.working_hours_ar;
      sitePatch.working_hours_he = merged.general.working_hours_he;
      sitePatch.working_hours_en = merged.general.working_hours;
    }
    if (touch("social") || touch("contact")) {
      const ig =
        merged.social.instagram_url || merged.contact.instagram_url;
      if (ig) {
        sitePatch.instagram_url = ig;
        try {
          const handle = new URL(ig).pathname.replace(/\//g, "");
          if (handle) sitePatch.instagram_handle = `@${handle}`;
        } catch {
          /* ignore invalid url */
        }
      }
    }
    await saveSitePatch(sitePatch);
  }

  if (touch("authentication")) {
    const currentAuth = await getCustomerAuthSettings(true);
    const authFlags = {
      guest_checkout_enabled: merged.authentication.guest_checkout_enabled,
      google_enabled: merged.authentication.google_enabled,
      apple_enabled: merged.authentication.apple_enabled,
      email_password_enabled: merged.authentication.email_password_enabled,
      otp_enabled: merged.authentication.phone_otp_enabled,
    };
    const channels = currentAuth.channels.map((ch) => {
      if (ch.id === "guest") {
        return { ...ch, enabled: authFlags.guest_checkout_enabled };
      }
      if (ch.id === "google") {
        return { ...ch, enabled: authFlags.google_enabled };
      }
      if (ch.id === "apple") {
        return { ...ch, enabled: authFlags.apple_enabled };
      }
      if (ch.id === "email") {
        return { ...ch, enabled: authFlags.email_password_enabled };
      }
      if (ch.id === "whatsapp") {
        return authFlags.otp_enabled
          ? { ...ch, enabled: true, coming_soon: false }
          : { ...ch, enabled: true, coming_soon: true };
      }
      return ch;
    });
    await saveCustomerAuthSettings(
      mergeCustomerAuthSettings({
        ...currentAuth,
        ...authFlags,
        channels,
      })
    );
  }

  if (touch("extra_services")) {
    await syncStoreServicesTable(merged.extra_services.services);
  }

  cached = merged;
  cachedAt = Date.now();
  if (touch("security")) {
    try {
      const { bustMaintenanceModeCache } = await import(
        "@/lib/store/maintenance-edge"
      );
      bustMaintenanceModeCache();
    } catch {
      /* edge helper optional in some runtimes */
    }
  }
  return merged;
}

export function invalidateStoreSettingsCache() {
  cached = null;
  cachedAt = 0;
}

/** Live (selectable) payment methods for checkout charge flow. */
export function getEnabledPaymentProviders(settings: StoreSettings) {
  return settings.payments.providers
    .filter((p) => p.enabled && !p.coming_soon)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Storefront-visible methods: enabled OR coming_soon (قريباً preview).
 * To hide a method completely: set enabled=false and coming_soon=false in Admin.
 */
export function getVisiblePaymentProviders(settings: StoreSettings) {
  return settings.payments.providers
    .filter((p) => p.enabled || p.coming_soon)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function getStoreDisplayName(settings: StoreSettings): string {
  return settings.general.store_name.trim() || DEFAULT_STORE_SETTINGS.general.store_name;
}
