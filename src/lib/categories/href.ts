import type { Category } from "@/types/category";

/**
 * Public path for a category.
 * Prefer stored href (seeded/legacy dedicated routes); else `/{slug}`
 * which is served by the dynamic `(site)/[slug]` category page.
 */
export function resolveCategoryHref(
  category: Pick<Category, "href" | "slug">
): string {
  const href = category.href?.trim();
  if (href) return href.startsWith("/") ? href : `/${href}`;
  const slug = category.slug?.trim();
  return slug ? `/${slug}` : "/";
}
