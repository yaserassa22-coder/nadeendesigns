/**
 * Gallery filter categories — admin-managed, used by storefront GalleryGrid.
 * Slugs are stored on gallery_items.category (never rewrite existing item URLs).
 */

export type GalleryCategory = {
  id: string;
  slug: string;
  label_ar: string;
  label_he: string;
  label_en: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

/** Fallback when the gallery_categories table is missing or empty. */
export const DEFAULT_GALLERY_CATEGORIES: Omit<
  GalleryCategory,
  "id" | "created_at" | "updated_at"
>[] = [
  {
    slug: "wedding",
    label_ar: "زفاف",
    label_he: "חתונה",
    label_en: "Wedding",
    sort_order: 10,
    is_active: true,
  },
  {
    slug: "nouf_dresses",
    label_ar: "فساتين نوف",
    label_he: "שמלות נוף",
    label_en: "Nouf dresses",
    sort_order: 20,
    is_active: true,
  },
  {
    slug: "details",
    label_ar: "تفاصيل",
    label_he: "פרטים",
    label_en: "Details",
    sort_order: 30,
    is_active: true,
  },
  {
    slug: "boutique",
    label_ar: "البوتيك",
    label_he: "הבוטיק",
    label_en: "Boutique",
    sort_order: 40,
    is_active: true,
  },
  {
    slug: "events",
    label_ar: "فعاليات",
    label_he: "אירועים",
    label_en: "Events",
    sort_order: 50,
    is_active: true,
  },
];

export function slugifyGalleryCategory(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

export function resolveGalleryCategoryLabel(
  category: Pick<GalleryCategory, "label_ar" | "label_he" | "label_en" | "slug">,
  locale: string
): string {
  if (locale === "he") {
    return category.label_he.trim() || category.label_en.trim() || category.label_ar.trim() || category.slug;
  }
  if (locale === "en") {
    return category.label_en.trim() || category.label_ar.trim() || category.slug;
  }
  return category.label_ar.trim() || category.label_en.trim() || category.slug;
}

export function withFallbackGalleryIds(
  rows: GalleryCategory[] | null | undefined
): GalleryCategory[] {
  if (rows && rows.length > 0) return rows;
  return DEFAULT_GALLERY_CATEGORIES.map((row, index) => ({
    ...row,
    id: `fallback-${row.slug}-${index}`,
  }));
}

/** Homepage + admin priority: تفاصيل / البوتيك / فعاليات first. */
export const GALLERY_PRIORITY_SLUGS = [
  "details",
  "boutique",
  "events",
] as const;

export function orderGalleryCategories(
  categories: GalleryCategory[]
): GalleryCategory[] {
  const priority = GALLERY_PRIORITY_SLUGS as readonly string[];
  return [...categories].sort((a, b) => {
    const ai = priority.indexOf(a.slug);
    const bi = priority.indexOf(b.slug);
    if (ai >= 0 || bi >= 0) {
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    }
    return a.sort_order - b.sort_order;
  });
}
