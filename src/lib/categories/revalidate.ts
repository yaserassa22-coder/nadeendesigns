import { revalidatePath } from "next/cache";

/**
 * Invalidate homepage + layout (nav/footer) after category mutations.
 * Also revalidates the category's public path when known.
 */
export function revalidateCategoryPaths(paths: Array<string | null | undefined> = []) {
  revalidatePath("/", "layout");
  revalidatePath("/");

  const seen = new Set<string>(["/", ""]);
  for (const raw of paths) {
    if (!raw) continue;
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    if (seen.has(path)) continue;
    seen.add(path);
    revalidatePath(path);
  }
}
