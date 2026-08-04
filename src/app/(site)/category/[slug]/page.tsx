import { redirect } from "next/navigation";
import { resolveCategoryHref } from "@/lib/categories/href";
import { getCategoryBySlug } from "@/lib/data/categories";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Alias route: /category/<slug> → canonical category href (usually /<slug>).
 * Keeps Admin/product deep-links working without duplicating catalog UI.
 */
export default async function CategoryAliasPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (category) {
    redirect(resolveCategoryHref(category));
  }
  redirect(`/${slug.trim()}`);
}
