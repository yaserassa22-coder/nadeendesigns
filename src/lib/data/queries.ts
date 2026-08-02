import type { Dress, DressFilters, GalleryItem, SiteSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { SEED_DRESSES, SEED_GALLERY } from "@/lib/data/seed";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function getDresses(filters?: DressFilters): Promise<Dress[]> {
  let dresses: Dress[];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    let query = supabase.from("dresses").select("*").order("created_at", { ascending: false });

    if (filters?.category) query = query.eq("category", filters.category);
    if (filters?.featured) query = query.eq("is_featured", true);
    if (filters?.style) query = query.eq("style", filters.style);
    if (filters?.color) query = query.eq("color", filters.color);
    if (filters?.size) query = query.eq("size", filters.size);

    const { data, error } = await query;
    dresses = error ? SEED_DRESSES : (data as Dress[]);
  } else {
    dresses = SEED_DRESSES;
  }

  if (filters?.category) {
    dresses = dresses.filter((d) => d.category === filters.category);
  }
  if (filters?.featured) {
    dresses = dresses.filter((d) => d.is_featured);
  }
  if (filters?.style) {
    dresses = dresses.filter((d) => d.style === filters.style);
  }
  if (filters?.color) {
    dresses = dresses.filter((d) => d.color === filters.color);
  }
  if (filters?.size) {
    dresses = dresses.filter((d) => d.size === filters.size);
  }
  if (filters?.minPrice) {
    dresses = dresses.filter(
      (d) => (d.price ?? d.rental_price ?? 0) >= filters.minPrice!
    );
  }
  if (filters?.maxPrice) {
    dresses = dresses.filter(
      (d) => (d.price ?? d.rental_price ?? Infinity) <= filters.maxPrice!
    );
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    dresses = dresses.filter(
      (d) =>
        d.name_ar.toLowerCase().includes(q) ||
        d.description_ar.toLowerCase().includes(q) ||
        (d.style?.toLowerCase().includes(q) ?? false)
    );
  }

  return dresses;
}

export async function getDressById(id: string): Promise<Dress | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("dresses")
      .select("*")
      .eq("id", id)
      .single();
    if (!error && data) return data as Dress;
  }
  return SEED_DRESSES.find((d) => d.id === id) ?? null;
}

export async function getGalleryItems(): Promise<GalleryItem[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("gallery_items")
      .select("*")
      .order("sort_order", { ascending: true });
    if (!error && data) return data as GalleryItem[];
  }
  return SEED_GALLERY;
}

export async function getSettings(): Promise<SiteSettings> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "site")
      .single();
    if (!error && data?.value) return data.value as SiteSettings;
  }
  return DEFAULT_SETTINGS;
}

export async function getFeaturedDresses(limit = 3): Promise<Dress[]> {
  const dresses = await getDresses({ featured: true });
  return dresses.slice(0, limit);
}
