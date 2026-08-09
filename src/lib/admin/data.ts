import { SEED_DRESSES, SEED_GALLERY } from "@/lib/data/seed";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { normalizeDressList } from "@/lib/dresses/category";
import {
  filterLifecycleRows,
  isLifecycleSchemaError,
} from "@/lib/admin/query-lifecycle";
import { normalizeSiteSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import type { Booking, Dress, GalleryItem, SiteSettings, WornByYouItem } from "@/types";
import { getAdminCategories } from "@/lib/admin/categories-data";
import { isDressProductCategory } from "@/types/category";

export async function getAdminDresses(): Promise<Dress[]> {
  if (!isSupabaseConfigured()) return normalizeDressList(SEED_DRESSES);
  const supabase = createAdminClient();
  let query = supabase
    .from("dresses")
    .select("*")
    .order("created_at", { ascending: false });
  query = query.eq("is_deleted", false) as typeof query;
  const { data, error } = await query;
  if (error && isLifecycleSchemaError(error)) {
    const retry = await supabase
      .from("dresses")
      .select("*")
      .order("created_at", { ascending: false });
    if (retry.error || !retry.data) return normalizeDressList(SEED_DRESSES);
    return normalizeDressList(retry.data as Dress[]);
  }
  if (error || !data) return normalizeDressList(SEED_DRESSES);
  return normalizeDressList(filterLifecycleRows(data as Dress[], "all"));
}

export async function getAdminGallery(): Promise<GalleryItem[]> {
  if (!isSupabaseConfigured()) return SEED_GALLERY;
  const supabase = createAdminClient();
  let query = supabase
    .from("gallery_items")
    .select("*")
    .order("sort_order", { ascending: true });
  query = query.eq("is_deleted", false) as typeof query;
  const { data, error } = await query;
  if (error && isLifecycleSchemaError(error)) {
    const retry = await supabase
      .from("gallery_items")
      .select("*")
      .order("sort_order", { ascending: true });
    if (retry.error || !retry.data) return SEED_GALLERY;
    return retry.data as GalleryItem[];
  }
  if (error || !data) return SEED_GALLERY;
  return filterLifecycleRows(data as GalleryItem[], "all");
}

export async function getAdminWornByYouItems(): Promise<WornByYouItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createAdminClient();
  let query = supabase
    .from("worn_by_you_items")
    .select("*")
    .order("sort_order", { ascending: true });
  query = query.eq("is_deleted", false) as typeof query;
  const { data, error } = await query;
  if (error) {
    if (/worn_by_you_items|PGRST205|42P01/i.test(error.message ?? "")) {
      return [];
    }
    if (isLifecycleSchemaError(error)) {
      const retry = await supabase
        .from("worn_by_you_items")
        .select("*")
        .order("sort_order", { ascending: true });
      if (retry.error || !retry.data) return [];
      return retry.data as WornByYouItem[];
    }
    return [];
  }
  if (!data) return [];
  return filterLifecycleRows(data as WornByYouItem[], "all");
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
    let query = supabase
      .from("bookings")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });
    query = query.eq("is_deleted", false) as typeof query;
    let { data, error, count } = await query;

    if (error && isLifecycleSchemaError(error)) {
      const retry = await supabase
        .from("bookings")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      data = retry.data;
      error = retry.error;
      count = retry.count;
    }

    if (error) {
      console.error("[getAdminBookings] supabase error", error);
      return {
        bookings: [],
        error: error.message || "فشل جلب الحجوزات من Supabase",
        count: 0,
      };
    }

    const bookings = filterLifecycleRows(
      ((data ?? []) as Booking[]).map(mapBookingRow),
      "all"
    );
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
  if (!isSupabaseConfigured()) return normalizeSiteSettings(DEFAULT_SETTINGS);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "site")
    .single();
  if (error || !data?.value) return normalizeSiteSettings(DEFAULT_SETTINGS);
  return normalizeSiteSettings(data.value as SiteSettings);
}

export async function getDashboardStats() {
  const [dresses, gallery, bookingsResult, categories] = await Promise.all([
    getAdminDresses(),
    getAdminGallery(),
    getAdminBookings(),
    getAdminCategories(),
  ]);

  const bookings = bookingsResult.bookings;
  const dressCats = categories.filter((c) => isDressProductCategory(c));

  const byCategory = dressCats.map((cat) => ({
    category: cat.legacy_key ?? cat.slug,
    label: cat.name_ar,
    count: dresses.filter(
      (d) =>
        d.category_id === cat.id ||
        d.category === cat.legacy_key ||
        d.category === cat.slug
    ).length,
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
  categoryKey: string
) {
  return dresses.filter(
    (d) =>
      d.category === categoryKey ||
      d.category_id === categoryKey
  ).length;
}
