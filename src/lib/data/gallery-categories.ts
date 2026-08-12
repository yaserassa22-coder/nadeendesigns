import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  DEFAULT_GALLERY_CATEGORIES,
  withFallbackGalleryIds,
  type GalleryCategory,
} from "@/lib/gallery/categories";

/** Active categories for the public gallery filter bar. */
export async function getGalleryCategories(
  options?: { includeInactive?: boolean }
): Promise<GalleryCategory[]> {
  if (!isSupabaseConfigured()) {
    return withFallbackGalleryIds(undefined).filter(
      (c) => options?.includeInactive || c.is_active
    );
  }

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("gallery_categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (!options?.includeInactive) {
      query = query.eq("is_active", true);
    }
    const { data, error } = await query;
    if (error) {
      // Table missing before migration — keep storefront working.
      if (/gallery_categories|PGRST205|42P01/i.test(error.message)) {
        return withFallbackGalleryIds(undefined).filter(
          (c) => options?.includeInactive || c.is_active
        );
      }
      console.error("[gallery_categories]", error.message);
      return withFallbackGalleryIds(undefined).filter(
        (c) => options?.includeInactive || c.is_active
      );
    }
    if (!data?.length) {
      return withFallbackGalleryIds(
        DEFAULT_GALLERY_CATEGORIES.map((row, i) => ({
          ...row,
          id: `fallback-${row.slug}-${i}`,
        }))
      ).filter((c) => options?.includeInactive || c.is_active);
    }
    return data as GalleryCategory[];
  } catch (e) {
    console.error("[gallery_categories]", e);
    return withFallbackGalleryIds(undefined).filter(
      (c) => options?.includeInactive || c.is_active
    );
  }
}

export async function getAdminGalleryCategories(): Promise<GalleryCategory[]> {
  return getGalleryCategories({ includeInactive: true });
}
