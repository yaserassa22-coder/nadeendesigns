export type DressCategory = "wedding" | "rental" | "veils" | "robes";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export type ServiceType = "fitting" | "consultation" | "rental" | "purchase";

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

export interface Booking {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  date: string;
  time: string;
  service_type: ServiceType;
  dress_id: string | null;
  notes: string | null;
  status: BookingStatus;
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

export const DRESS_CATEGORY_LABELS: Record<DressCategory, string> = {
  wedding: "فساتين الزفاف",
  rental: "فساتين للإيجار",
  veils: "الطرحات",
  robes: "الأرواب",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  cancelled: "ملغي",
  completed: "مكتمل",
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  fitting: "تجربة فستان",
  consultation: "استشارة",
  rental: "إيجار",
  purchase: "شراء",
};
