import { SEED_DRESSES, SEED_GALLERY } from "@/lib/data/seed";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Booking, Dress, GalleryItem, SiteSettings } from "@/types";

export async function getAdminDresses(): Promise<Dress[]> {
  if (!isSupabaseConfigured()) return SEED_DRESSES;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dresses")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return SEED_DRESSES;
  return data as Dress[];
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

export async function getAdminBookings(): Promise<Booking[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as Booking[];
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
  const [dresses, gallery, bookings] = await Promise.all([
    getAdminDresses(),
    getAdminGallery(),
    getAdminBookings(),
  ]);

  return {
    dressesCount: dresses.length,
    galleryCount: gallery.length,
    bookingsCount: bookings.length,
    pendingBookings: bookings.filter((b) => b.status === "pending").length,
    featuredDresses: dresses.filter((d) => d.is_featured).length,
    recentBookings: bookings.slice(0, 5),
  };
}
