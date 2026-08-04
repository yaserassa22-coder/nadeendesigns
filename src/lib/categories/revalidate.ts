import { revalidatePath } from "next/cache";

/**
 * Invalidate homepage + layout (nav/footer) + category/search surfaces
 * after category mutations.
 */
export function revalidateCategoryPaths(paths: Array<string | null | undefined> = []) {
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/dresses");
  revalidatePath("/admin/nouf-dresses");

  const seen = new Set<string>(["/", ""]);
  for (const raw of paths) {
    if (!raw) continue;
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    if (seen.has(path)) continue;
    seen.add(path);
    revalidatePath(path);
    // Alias route /category/<slug>
    const slug = path.replace(/^\//, "");
    if (slug && !path.startsWith("/category/")) {
      const alias = `/category/${slug}`;
      if (!seen.has(alias)) {
        seen.add(alias);
        revalidatePath(alias);
      }
    }
  }
}
