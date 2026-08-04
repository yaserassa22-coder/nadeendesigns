import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DressCatalog, PageHero } from "@/components/dresses/DressCatalog";
import { resolveCategoryHref } from "@/lib/categories/href";
import { productKindFromLegacyKey } from "@/lib/categories/kind";
import {
  getCategories,
  getCategoryBySlug,
} from "@/lib/data/categories";
import { getDressesByCategoryKeys } from "@/lib/data/queries";
import { buildCategoryTree, type Category } from "@/types/category";

/** Allow categories created after build/deploy to resolve at runtime. */
export const dynamicParams = true;

/** On-demand revalidatePath from admin create/update; soft fallback TTL. */
export const revalidate = 60;

/** Paths that already have dedicated App Router pages (static wins over [slug]). */
const DEDICATED_CATEGORY_PATHS = new Set([
  "/wedding-dresses",
  "/rental-dresses",
  "/nouf-dresses",
  "/nouf-dress",
  "/custom-design",
  "/veils",
  "/robes",
]);

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories
    .filter((c) => {
      if (!c.slug?.trim()) return false;
      if (c.is_visible === false) return false;
      const href = resolveCategoryHref(c);
      // Dedicated static routes own these paths — no need to prebuild [slug].
      if (DEDICATED_CATEGORY_PATHS.has(href)) return false;
      return true;
    })
    .map((c) => ({ slug: c.slug.trim() }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category || category.is_visible === false) {
    return { title: "التصنيف غير موجود" };
  }
  const description =
    category.description_ar?.trim() ||
    `اكتشفي مجموعة ${category.name_ar} من Nadeen Designs.`;
  return {
    title: category.name_ar,
    description,
  };
}

function redirectIfDedicated(category: Category, requestSlug: string) {
  const href = resolveCategoryHref(category);
  const requestPath = `/${requestSlug}`;

  // Prefer stored legacy href when it points at a dedicated static page.
  if (href !== requestPath && DEDICATED_CATEGORY_PATHS.has(href)) {
    redirect(href);
  }

  const kind = productKindFromLegacyKey(category.legacy_key);
  if (kind === "veil") redirect("/veils");
  if (kind === "bridal_robe") redirect("/robes");
  if (category.legacy_key === "custom_design" && href === "/custom-design") {
    redirect("/custom-design");
  }
}

export default async function DynamicCategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category || category.is_visible === false) {
    notFound();
  }

  redirectIfDedicated(category, slug);

  // Accessories parent: link to visible children instead of an empty dress grid.
  if (category.legacy_key === "bridal_accessories") {
    const tree = buildCategoryTree(await getCategories());
    const node = tree.find((n) => n.id === category.id);
    const children = (node?.children ?? []).filter((c) => c.is_visible !== false);

    return (
      <>
        <PageHero
          title={category.name_ar}
          description={
            category.description_ar?.trim() ||
            "اختاري من اكسسوارات العروس"
          }
        />
        <section className="py-16 md:py-24">
          <div className="mx-auto grid max-w-3xl gap-4 px-4 md:px-8">
            {children.length === 0 ? (
              <p className="text-center text-muted">لا توجد تصنيفات فرعية حالياً</p>
            ) : (
              children.map((child) => (
                <Link
                  key={child.id}
                  href={resolveCategoryHref(child)}
                  className="rounded-2xl border border-beige-dark bg-white px-6 py-5 text-lg font-medium text-charcoal transition-colors hover:border-gold hover:text-gold"
                >
                  {child.name_ar}
                </Link>
              ))
            )}
          </div>
        </section>
      </>
    );
  }

  const dresses = await getDressesByCategoryKeys([
    category.slug,
    category.legacy_key,
  ]);

  const description =
    category.description_ar?.trim() ||
    `اكتشفي مجموعة ${category.name_ar} الحصرية من Nadeen Designs`;

  return (
    <>
      <PageHero title={category.name_ar} description={description} />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <DressCatalog
            dresses={dresses}
            title={category.name_ar}
            description=""
          />
        </div>
      </section>
    </>
  );
}
