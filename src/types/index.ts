/**
 * @deprecated Historical seeded dress keys only — prefer Category.id / product_kind.
 * Kept for seed data, booking service_type bridges, and dual-read of TEXT category.
 */
export type DressCategory =
  | "wedding"
  | "rental"
  | "custom_design"
  | "nouf_dresses";

export type {
  Veil,
  BridalRobe,
  CartItem,
  ShopOrder,
  ShopOrderItem,
  ShopProductType,
  ShopOrderStatus,
} from "@/types/shop";

export type {
  Category,
  CategoryTreeNode,
  CategoryProductKind,
} from "@/types/category";
export {
  SEED_CATEGORIES,
  buildCategoryTree,
  slugifyCategory,
  resolveCategoryProductKind,
  isAccessoriesGroupCategory,
  isDressProductCategory,
  adminCategoryProductsHref,
  isAdminCategoryNavActive,
} from "@/types/category";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "rescheduled"
  | "cancelled"
  | "completed";

export type BookingSource = "online" | "phone" | "walk_in" | "admin";

export type AppointmentLifecycleAction =
  | "arrived"
  | "started"
  | "completed"
  | "no_show";

/** Booking service types (product-focused) */
export type ServiceType =
  | "wedding_dress"
  | "rental_dress"
  | "custom_design"
  | "nouf_dresses"
  | "veil"
  | "bridal_cape"
  // Legacy values kept for existing Supabase rows
  | "nouf_dress"
  | "fitting"
  | "consultation"
  | "rental"
  | "purchase";

export type DeliveryStatus =
  | "pending"
  | "preparing"
  | "out_for_delivery"
  | "delivered";

/** Product visibility — migration 035. Dual-writes to is_available. */
export type DressStatus = "published" | "draft" | "hidden";

import type { ProductCommerceType } from "@/lib/products/primary-action";
export type { ProductCommerceType };

export interface Dress {
  id: string;
  name_ar: string;
  /** English name (migration 035) */
  name_en?: string | null;
  /** Hebrew name (optional — APPLY_LOCALE_HE_NAMES.sql) */
  name_he?: string | null;
  description_ar: string;
  /** Short blurb (migration 035) */
  short_description?: string | null;
  /** URL slug (migration 035) — storefront still uses /dresses/[id] */
  slug?: string | null;
  sku?: string | null;
  /**
   * Legacy TEXT (legacy_key / slug) — kept for transition reads.
   * Prefer category_id for new writes and filtering.
   */
  category: string;
  /** FK to categories.id (migration 027) */
  category_id?: string | null;
  /** Optional collection category (featured_collection) — migration 035 */
  collection_id?: string | null;
  /**
   * Commerce / primary-action type (migration 036 / 037).
   * Storefront CTAs must use this only — never category name/slug.
   * Values: ready_to_buy | bridal_accessory | rental_dress | custom_design | service
   * Not the same as cart ShopProductType (veil|bridal_robe|dress).
   */
  product_type?: ProductCommerceType | null;
  /**
   * Per-product order options override (migration 037). null = store defaults.
   * Config only in Phase 1 — not wired into checkout.
   */
  order_options_config?: import("@/lib/products/order-experience").ProductOrderOptionsConfig | null;
  experience_config?: import("@/lib/products/experience-designer").ProductExperienceConfig | null;
  /**
   * Per-product feature library assignment (migration 040).
   * null = smart defaults from product_type + shop surface.
   */
  features_config?: import("@/lib/products/experience-features").ProductFeaturesConfig | null;
  /**
   * Per-product extra services override (migration 037). null = store defaults.
   * Config only in Phase 1 — not wired into checkout.
   */
  extra_services_config?: import("@/lib/products/order-experience").ProductExtraServicesConfig | null;
  price: number | null;
  sale_price?: number | null;
  /** Admin-only cost (migration 035) */
  cost_price?: number | null;
  rental_price: number | null;
  size: string | null;
  color: string | null;
  style: string | null;
  tags?: string[] | null;
  /** published | draft | hidden — prefer over raw is_available for admin */
  status?: DressStatus | null;
  is_featured: boolean;
  is_available: boolean;
  images: string[];
  created_at: string;
  updated_at: string;
}

export type GalleryMediaType = "image" | "video";

export interface GalleryItem {
  id: string;
  title_ar: string;
  image_url: string;
  category: string;
  sort_order: number;
  created_at: string;
  media_type?: GalleryMediaType;
  video_url?: string | null;
}

/** Admin-managed homepage “Worn by You” customer visual gallery item. */
export type WornByYouMediaType = "image" | "video";
export type WornByYouProductKind = "dress" | "veil" | "bridal_robe";

export interface WornByYouItem {
  id: string;
  media_type: WornByYouMediaType;
  /** Optional for video items; required for image items. */
  image_url: string;
  video_url: string | null;
  customer_name: string | null;
  caption: string | null;
  alt_text: string | null;
  product_kind: WornByYouProductKind | null;
  product_id: string | null;
  product_label: string | null;
  social_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at?: string;
  is_deleted?: boolean | null;
  archived_at?: string | null;
}

export type {
  ProductPersonalization,
  GiftOptions,
} from "@/types/customization";
import type { GiftOptions, ProductPersonalization } from "@/types/customization";

export interface Booking {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  date: string;
  time: string;
  service_type: ServiceType;
  city?: string | null;
  region?: string | null;
  dress_id: string | null;
  notes: string | null;
  status: BookingStatus;
  delivery_required: boolean;
  delivery_address: string | null;
  /** @deprecated legacy column — prefer region */
  delivery_region?: string | null;
  /** @deprecated legacy column — prefer city */
  delivery_city?: string | null;
  /** @deprecated legacy column */
  delivery_phone?: string | null;
  delivery_status?: DeliveryStatus | null;
  personalization?: ProductPersonalization | null;
  gift_options?: GiftOptions | null;
  created_at: string;
  /** Customer opted in to WhatsApp updates (default true for legacy rows) */
  notify_whatsapp?: boolean;
  /** Customer opted in to email updates (default true for legacy rows) */
  notify_email?: boolean;
  /** Linked customers.id when booking is from a signed-in account */
  customer_id?: string | null;
  /** Phase D — smart appointments */
  booking_source?: BookingSource | null;
  consultant_id?: string | null;
  duration_minutes?: number | null;
  buffer_before?: number | null;
  buffer_after?: number | null;
  is_vip?: boolean | null;
  arrived_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  no_show_at?: string | null;
  archived_at?: string | null;
  is_deleted?: boolean | null;
  /** Admin → customer reply metadata (migration 043). */
  last_reply_at?: string | null;
  last_reply_status?: "sent" | "failed" | "skipped" | "local" | string | null;
  last_reply_subject?: string | null;
  last_reply_by?: string | null;
  /** Append-only status timeline (migration 043). */
  status_history?: BookingStatusHistoryEntry[] | null;
}

export type BookingStatusHistoryEntry = {
  status: BookingStatus;
  at: string;
  by?: string | null;
  action?: string | null;
  note?: string | null;
};

export interface Consultant {
  id: string;
  name_ar: string;
  active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export type WaitingListStatus =
  | "waiting"
  | "notified"
  | "booked"
  | "cancelled";

export interface WaitingListEntry {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  preferred_date?: string | null;
  preferred_time?: string | null;
  consultant_id?: string | null;
  notes?: string | null;
  status: WaitingListStatus;
  notify_whatsapp?: boolean;
  notify_email?: boolean;
  created_at: string;
  updated_at?: string;
}

export type SpecialDayType =
  | "holiday"
  | "vacation"
  | "maintenance"
  | "private_event";

export interface SpecialDay {
  id: string;
  day_date: string;
  day_type: SpecialDayType;
  note?: string | null;
  created_at?: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
  /** Last Admin Resend reply (optional until APPLY_CONTACT_MESSAGE_REPLIES.sql). */
  last_reply_at?: string | null;
  last_reply_status?: "sent" | "failed" | "local" | string | null;
  last_reply_subject?: string | null;
  last_reply_error?: string | null;
  /** contact = Contact Form; account = /account/messages bridge */
  source?: "contact" | "account" | string | null;
  customer_id?: string | null;
  account_message_id?: string | null;
}

/** Lucide icon keys used by About values cards */
export type AboutValueIcon = "Heart" | "Sparkles" | "Users" | "Award";

export interface AboutValueItem {
  icon: AboutValueIcon;
  title_ar: string;
  description_ar: string;
  title_he?: string;
  description_he?: string;
  title_en?: string;
  description_en?: string;
}

/**
 * Reserved nested CMS bags for future homepage sections (Featured, Services,
 * Instagram, CTA, etc.) without DB/API changes. Phase A uses flat hero/about fields.
 */
export interface SiteCmsBags {
  homepage?: Record<string, unknown>;
  about?: Record<string, unknown>;
}

export interface SiteSettings {
  phone: string;
  whatsapp: string;
  email: string;
  address_ar: string;
  address_he?: string;
  address_en?: string;
  instagram_url: string;
  instagram_handle: string;
  working_hours_ar: string;
  working_hours_he?: string;
  working_hours_en?: string;

  // —— Hero (flat, merge-safe) ——
  hero_title_ar: string;
  hero_title_he?: string;
  hero_title_en?: string;
  /** Substring of title that is bold + gold underline (current UI) */
  hero_title_emphasis_ar: string;
  hero_title_emphasis_he?: string;
  hero_title_emphasis_en?: string;
  hero_subtitle_ar: string;
  hero_subtitle_he?: string;
  hero_subtitle_en?: string;
  hero_image_url: string;
  /**
   * Optional additional hero slideshow images (CMS).
   * Combined with `hero_image_url` (primary / first slide), max 4 unique URLs.
   * Prefer `hero_slides` when mixing images and looping videos.
   */
  hero_image_urls?: string[];
  /**
   * Typed hero media slides (image and/or muted looping video). Max 4.
   * When present, takes precedence over legacy image URL fields.
   */
  hero_slides?: Array<{
    type: "image" | "video";
    url: string;
    poster_url?: string;
    video_display?: {
      focal_x?: number;
      focal_y?: number;
      rotation?: 0 | 90 | 180 | 270;
      playback_rate?: number;
      start_time?: number;
      end_time?: number | null;
    };
    duration_ms?: number;
    transition_ms?: number;
  }>;
  hero_image_alt_ar: string;
  hero_image_alt_he?: string;
  hero_image_alt_en?: string;
  hero_cta_primary_label_ar: string;
  hero_cta_primary_label_he?: string;
  hero_cta_primary_label_en?: string;
  hero_cta_primary_href: string;
  hero_cta_secondary_label_ar: string;
  hero_cta_secondary_label_he?: string;
  hero_cta_secondary_label_en?: string;
  hero_cta_secondary_href: string;

  // —— About (flat, merge-safe; about_ar already existed) ——
  about_ar: string;
  about_he?: string;
  about_en?: string;
  about_page_title_ar: string;
  about_page_title_he?: string;
  about_page_title_en?: string;
  about_page_subtitle_ar: string;
  about_page_subtitle_he?: string;
  about_page_subtitle_en?: string;
  about_story_eyebrow_ar: string;
  about_story_eyebrow_he?: string;
  about_story_eyebrow_en?: string;
  about_story_heading_ar: string;
  about_story_heading_he?: string;
  about_story_heading_en?: string;
  about_secondary_ar: string;
  about_secondary_en?: string;
  about_image_url: string;
  about_image_alt_ar: string;
  about_image_alt_he?: string;
  about_image_alt_en?: string;
  about_cta_label_ar: string;
  about_cta_label_he?: string;
  about_cta_label_en?: string;
  about_cta_href: string;
  about_values: AboutValueItem[];

  /**
   * Homepage post-hero “تصميم فستان خاص” editorial tile image (CMS).
   * When empty, storefront falls back to category cover / about / featured.
   * Synced with `custom_design_image_urls[0]` when the multi-image list is set.
   */
  custom_design_image_url: string;
  /**
   * Up to 5 CMS images for the Custom Design homepage section
   * (atelier → craft → dress stages + extras). Primary is index 0.
   */
  custom_design_image_urls: string[];
  /**
   * When true (default), homepage Custom Design images transition across
   * scroll stages. When false, the section stays on the first image.
   */
  custom_design_image_transition: boolean;

  /**
   * Optional bag for future homepage section payloads (Featured / Services /
   * Instagram / CTA) — no schema migration required.
   */
  homepage_extra?: Record<string, unknown>;
  /** Namespaced CMS extension point alongside flat hero/about fields */
  cms?: SiteCmsBags;

  /**
   * Flat shipping fee for bridal accessories (DB-backed via settings JSON).
   * Not used for dresses / booking flow. Regional fees override when a zone is selected.
   */
  shipping_enabled: boolean;
  shipping_flat_fee: number;
  /** Order subtotal at/above this → free shipping (0 = no free-shipping rule) */
  shipping_free_threshold: number;
  /** Allow boutique pickup at checkout when cart needs shipping */
  boutique_pickup_enabled: boolean;
  /** Allow courier delivery at checkout when cart needs shipping */
  delivery_enabled: boolean;

  /**
   * Days soft-deleted items stay in trash before an explicit "Run cleanup".
   * Never auto-runs; never applies to orders/bookings.
   * Used as the default for product/catalog/gallery modules.
   */
  trash_cleanup_days: number;
  /** Soft-deleted read notifications older than N days (cleanup eligible). */
  cleanup_read_notifications_days: number;
  /** Soft-deleted contact messages older than N days. */
  cleanup_old_messages_days: number;
  /** Soft-deleted notification / audit-style logs older than N days. */
  cleanup_archived_logs_days: number;
}

export interface DressFilters {
  search?: string;
  /** Dynamic category slug / legacy_key / TEXT category value */
  category?: string;
  /** Preferred: filter by categories.id */
  categoryId?: string;
  style?: string;
  color?: string;
  size?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  /** Cap rows for related-product queries (storefront PDP). */
  limit?: number;
}

/**
 * @deprecated Seeded dress keys only — UI must load categories from DB.
 * Kept for seed/booking bridges and offline fallbacks.
 */
export const DRESS_CATEGORIES: DressCategory[] = [
  "wedding",
  "nouf_dresses",
  "rental",
  "custom_design",
];

/** @deprecated Prefer Category.name_ar from DB */
export const DRESS_CATEGORY_LABELS: Record<DressCategory, string> = {
  wedding: "فساتين الزفاف",
  rental: "فساتين للإيجار",
  custom_design: "تصميم فستان خاص",
  nouf_dresses: "فساتين نوف",
};

/** @deprecated Prefer resolveCategoryHref from DB category */
export const DRESS_CATEGORY_HREFS: Record<DressCategory, string> = {
  wedding: "/wedding-dresses",
  rental: "/rental-dresses",
  custom_design: "/custom-design",
  nouf_dresses: "/nouf-dresses",
};

/**
 * Normalize known seeded dress category TEXT values.
 * Returns null for unknown / dynamic slugs (use as-is via category_id).
 */
export function normalizeDressCategory(
  value: string | null | undefined
): DressCategory | null {
  if (!value) return null;
  if (value === "wedding_dress") return "wedding";
  if (value === "nouf_dress") return "nouf_dresses";
  if ((DRESS_CATEGORIES as string[]).includes(value)) {
    return value as DressCategory;
  }
  return null;
}

/**
 * @deprecated Offline nav fallback only — storefront uses buildStorefrontNav(DB).
 */
export const SHOP_NAV_LINKS = [
  { href: "/veils", label: "طرحة العروس" },
  { href: "/robes", label: "برنص العروس" },
] as const;

/** @deprecated Offline nav fallback only */
export const ACCESSORIES_PARENT = {
  label: "اكسسوارات العروس",
  slug: "bridal-accessories",
  children: SHOP_NAV_LINKS,
} as const;

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  rescheduled: "إعادة جدولة",
  cancelled: "ملغي",
  completed: "مكتمل",
};

/** Admin list badge colors — status is the single visual signal. */
export const BOOKING_STATUS_BADGE_CLASS: Record<BookingStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80",
  confirmed: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80",
  rescheduled: "bg-sky-50 text-sky-800 ring-1 ring-sky-200/80",
  cancelled: "bg-red-50 text-red-700 ring-1 ring-red-200/80",
  completed: "bg-stone-100 text-stone-700 ring-1 ring-stone-300/70",
};

export const BOOKING_SOURCE_LABELS: Record<BookingSource, string> = {
  online: "أونلاين",
  phone: "هاتف",
  walk_in: "حضور مباشر",
  admin: "يدوي (إدارة)",
};

/** Options shown in the public booking form */
export const BOOKING_SERVICE_OPTIONS: {
  value: Exclude<
    ServiceType,
    "fitting" | "consultation" | "rental" | "purchase" | "nouf_dress"
  >;
  label: string;
}[] = [
  { value: "wedding_dress", label: "فستان زفاف" },
  { value: "rental_dress", label: "فستان للإيجار" },
  { value: "custom_design", label: "تصميم فستان خاص" },
  { value: "nouf_dresses", label: "فساتين نوف" },
  { value: "veil", label: "طرحة العروس" },
  { value: "bridal_cape", label: "برنص العروس" },
];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  wedding_dress: "فستان زفاف",
  rental_dress: "فستان للإيجار",
  custom_design: "تصميم فستان خاص",
  nouf_dresses: "فساتين نوف",
  nouf_dress: "فساتين نوف",
  veil: "طرحة العروس",
  bridal_cape: "برنص العروس",
  fitting: "تجربة فستان",
  consultation: "استشارة",
  rental: "إيجار",
  purchase: "شراء",
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: "قيد الانتظار",
  preparing: "قيد التجهيز",
  out_for_delivery: "في الطريق",
  delivered: "تم التوصيل",
};

export function getServiceTypeLabel(type: string): string {
  return SERVICE_TYPE_LABELS[type as ServiceType] ?? type;
}
