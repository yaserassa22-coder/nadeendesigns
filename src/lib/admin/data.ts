import { SEED_DRESSES, SEED_GALLERY } from "@/lib/data/seed";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { normalizeDressList } from "@/lib/dresses/category";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import type { Booking, Dress, DressCategory, GalleryItem, SiteSettings } from "@/types";
import { DRESS_CATEGORIES, DRESS_CATEGORY_LABELS } from "@/types";

export async function getAdminDresses(): Promise<Dress[]> {
  if (!isSupabaseConfigured()) return normalizeDressList(SEED_DRESSES);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dresses")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return normalizeDressList(SEED_DRESSES);
  return normalizeDressList(data as Dress[]);
}

export async function getAdminGallery(): Promise<GalleryItem[]> {
  if (!isSupabaseConfigured()) return SEED_GALLERY;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gallery_items")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error || !data) return SEED_GALLERY;
  return data as GalleryItem[];
}

function mapBookingRow(b: Booking): Booking {
  return {
    ...b,
    delivery_required: Boolean(b.delivery_required),
    delivery_region: b.delivery_region ?? null,
    delivery_city: b.delivery_city ?? null,
    delivery_address: b.delivery_address ?? null,
    delivery_phone: b.delivery_phone ?? null,
    delivery_status: b.delivery_status ?? null,
    personalization: b.personalization ?? null,
    gift_options: b.gift_options ?? null,
  };
}

export type AdminBookingsResult = {
  bookings: Booking[];
  error: string | null;
  count: number;
};

/**
 * Fetch all rows from public.bookings — no status/date filters.
 * Uses privileged client (service role OR authenticated admin session)
 * so RLS does not silently return [].
 */
export async function getAdminBookings(): Promise<AdminBookingsResult> {
  if (!isSupabaseConfigured()) {
    return { bookings: [], error: null, count: 0 };
  }

  try {
    const supabase = await createPrivilegedClient();
    const { data, error, count } = await supabase
      .from("bookings")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getAdminBookings] supabase error", error);
      return {
        bookings: [],
        error: error.message || "فشل جلب الحجوزات من Supabase",
        count: 0,
      };
    }

    const bookings = ((data ?? []) as Booking[]).map(mapBookingRow);
    return {
      bookings,
      error: null,
      count: typeof count === "number" ? count : bookings.length,
    };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "خطأ غير متوقع أثناء جلب الحجوزات";
    console.error("[getAdminBookings] unexpected", e);
    return { bookings: [], error: message, count: 0 };
  }
}

export async function getAdminSettings(): Promise<SiteSettings> {
  if (!isSupabaseConfigured()) return DEFAULT_SETTINGS;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "site")
    .single();
  if (error || !data?.value) return DEFAULT_SETTINGS;
  return data.value as SiteSettings;
}

export async function getDashboardStats() {
  const [dresses, gallery, bookingsResult] = await Promise.all([
    getAdminDresses(),
    getAdminGallery(),
    getAdminBookings(),
  ]);

  const bookings = bookingsResult.bookings;

  const byCategory = DRESS_CATEGORIES.map((category) => ({
    category,
    label: DRESS_CATEGORY_LABELS[category],
    count: dresses.filter((d) => d.category === category).length,
  }));

  return {
    dressesCount: dresses.length,
    galleryCount: gallery.length,
    bookingsCount: bookingsResult.count,
    bookingsError: bookingsResult.error,
    pendingBookings: bookings.filter((b) => b.status === "pending").length,
    featuredDresses: dresses.filter((d) => d.is_featured).length,
    deliveryBookings: bookings.filter((b) => b.delivery_required).length,
    byCategory,
    recentBookings: bookings.slice(0, 5),
  };
}

export function countDressesByCategory(
  dresses: Dress[],
  category: DressCategory
) {
  return dresses.filter((d) => d.category === category).length;
}
