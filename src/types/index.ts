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
} from "@/types/category";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

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

export interface Dress {
  id: string;
  name_ar: string;
  /** English name (migration 035) */
  name_en?: string | null;
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

export interface GalleryItem {
  id: string;
  title_ar: string;
  image_url: string;
  category: string;
  sort_order: number;
  created_at: string;
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
}

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
}

/** Lucide icon keys used by About values cards */
export type AboutValueIcon = "Heart" | "Sparkles" | "Users" | "Award";

export interface AboutValueItem {
  icon: AboutValueIcon;
  title_ar: string;
  description_ar: string;
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
  instagram_url: string;
  instagram_handle: string;
  working_hours_ar: string;

  // —— Hero (flat, merge-safe) ——
  hero_title_ar: string;
  hero_title_en?: string;
  /** Substring of title that is bold + gold underline (current UI) */
  hero_title_emphasis_ar: string;
  hero_title_emphasis_en?: string;
  hero_subtitle_ar: string;
  hero_subtitle_en?: string;
  hero_image_url: string;
  hero_image_alt_ar: string;
  hero_image_alt_en?: string;
  hero_cta_primary_label_ar: string;
  hero_cta_primary_label_en?: string;
  hero_cta_primary_href: string;
  hero_cta_secondary_label_ar: string;
  hero_cta_secondary_label_en?: string;
  hero_cta_secondary_href: string;

  // —— About (flat, merge-safe; about_ar already existed) ——
  about_ar: string;
  about_en?: string;
  about_page_title_ar: string;
  about_page_title_en?: string;
  about_page_subtitle_ar: string;
  about_page_subtitle_en?: string;
  about_story_eyebrow_ar: string;
  about_story_eyebrow_en?: string;
  about_story_heading_ar: string;
  about_story_heading_en?: string;
  about_secondary_ar: string;
  about_secondary_en?: string;
  about_image_url: string;
  about_image_alt_ar: string;
  about_image_alt_en?: string;
  about_cta_label_ar: string;
  about_cta_label_en?: string;
  about_cta_href: string;
  about_values: AboutValueItem[];

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
   */
  trash_cleanup_days: number;
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
  cancelled: "ملغي",
  completed: "مكتمل",
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
