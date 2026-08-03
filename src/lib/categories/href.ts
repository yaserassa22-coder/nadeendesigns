import type { Category } from "@/types/category";

/** Public path for a category: prefer stored href, else `/{slug}`. */
export function resolveCategoryHref(
  category: Pick<Category, "href" | "slug">
): string {
  const href = category.href?.trim();
  if (href) return href.startsWith("/") ? href : `/${href}`;
  const slug = category.slug?.trim();
  return slug ? `/${slug}` : "/";
}
