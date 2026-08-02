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

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

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

export interface Dress {
  id: string;
  name_ar: string;
  description_ar: string;
  category: DressCategory;
  price: number | null;
  rental_price: number | null;
  size: string | null;
  color: string | null;
  style: string | null;
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

export interface SiteSettings {
  phone: string;
  whatsapp: string;
  email: string;
  address_ar: string;
  instagram_url: string;
  instagram_handle: string;
  working_hours_ar: string;
  about_ar: string;
  hero_title_ar: string;
  hero_subtitle_ar: string;
}

export interface DressFilters {
  search?: string;
  category?: DressCategory;
  style?: string;
  color?: string;
  size?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
}

/** Dress categories only (veils & bridal robes use separate tables) */
export const DRESS_CATEGORIES: DressCategory[] = [
  "wedding",
  "nouf_dresses",
  "rental",
  "custom_design",
];

export const DRESS_CATEGORY_LABELS: Record<DressCategory, string> = {
  wedding: "فساتين الزفاف",
  rental: "فساتين للإيجار",
  custom_design: "تصميم فستان خاص",
  nouf_dresses: "فساتين نوف",
};

export const DRESS_CATEGORY_HREFS: Record<DressCategory, string> = {
  wedding: "/wedding-dresses",
  rental: "/rental-dresses",
  custom_design: "/custom-design",
  nouf_dresses: "/nouf-dresses",
};

/**
 * Normalize dress category values.
 * Legacy: wedding_dress → wedding, nouf_dress → nouf_dresses
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

/** Public shop nav entries beyond dress categories */
export const SHOP_NAV_LINKS = [
  { href: "/veils", label: "الطرحات" },
  { href: "/robes", label: "برنص عروس" },
] as const;

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  cancelled: "ملغي",
  completed: "مكتمل",
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
  { value: "veil", label: "طرحة" },
  { value: "bridal_cape", label: "برنص عروس" },
];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  wedding_dress: "فستان زفاف",
  rental_dress: "فستان للإيجار",
  custom_design: "تصميم فستان خاص",
  nouf_dresses: "فساتين نوف",
  nouf_dress: "فساتين نوف",
  veil: "طرحة",
  bridal_cape: "برنص عروس",
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
