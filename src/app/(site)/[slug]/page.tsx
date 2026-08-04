import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DressCatalog, PageHero } from "@/components/dresses/DressCatalog";
import { resolveCategoryHref } from "@/lib/categories/href";
import { productKindFromCategory } from "@/lib/categories/kind";
import {
  getCategories,
  getCategoryBySlug,
} from "@/lib/data/categories";
import { getDressesForCategory } from "@/lib/data/queries";
import { getBridalAccessoriesProducts } from "@/lib/data/shop-queries";
import { ShopCatalog } from "@/components/shop/ShopCatalog";
import {
  buildCategoryTree,
  isAccessoriesGroupCategory,
  type Category,
} from "@/types/category";

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
  const title =
    category.seo_title_ar?.trim() || category.name_ar;
  const description =
    category.seo_description_ar?.trim() ||
    category.description_ar?.trim() ||
    `اكتشفي مجموعة ${category.name_ar} من Nadeen Designs.`;
  const canonical = resolveCategoryHref(category);
  const ogImage =
    category.seo_og_image_url?.trim() ||
    category.cover_image_url?.trim() ||
    undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
}

function redirectIfDedicated(category: Category, requestSlug: string) {
  const href = resolveCategoryHref(category);
  const requestPath = `/${requestSlug}`;

  if (href !== requestPath && DEDICATED_CATEGORY_PATHS.has(href)) {
    redirect(href);
  }

  const kind = productKindFromCategory(category);
  if (kind === "veil") redirect("/veils");
  if (kind === "bridal_robe") redirect("/robes");
  if (
    (category.legacy_key === "custom_design" || category.slug === "custom-design") &&
    href === "/custom-design"
  ) {
    redirect("/custom-design");
  }
}

function CategoryJsonLd({
  category,
  description,
}: {
  category: Category;
  description: string;
}) {
  const url = resolveCategoryHref(category);
  const data = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.seo_title_ar?.trim() || category.name_ar,
    description,
    url,
    ...(category.cover_image_url || category.seo_og_image_url
      ? {
          image:
            category.seo_og_image_url?.trim() ||
            category.cover_image_url?.trim(),
        }
      : {}),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function DynamicCategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category || category.is_visible === false) {
    notFound();
  }

  redirectIfDedicated(category, slug);

  if (isAccessoriesGroupCategory(category)) {
    const [allCategories, products] = await Promise.all([
      getCategories(),
      getBridalAccessoriesProducts(),
    ]);
    const tree = buildCategoryTree(allCategories);
    const node = tree.find((n) => n.id === category.id);
    const children = (node?.children ?? []).filter((c) => c.is_visible !== false);
    const description =
      category.description_ar?.trim() || "اختاري من اكسسوارات العروس";
    const categoryOptions = [
      ...new Set(products.map((p) => p.category).filter(Boolean)),
    ];

    return (
      <>
        <CategoryJsonLd category={category} description={description} />
        <PageHero title={category.name_ar} description={description} />
        {children.length > 0 && (
          <section className="border-b border-beige-dark/60 py-8">
            <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-3 px-4 md:px-8">
              {children.map((child) => (
                <Link
                  key={child.id}
                  href={resolveCategoryHref(child)}
                  className="rounded-full border border-beige-dark bg-white px-5 py-2 text-sm font-medium text-charcoal transition-colors hover:border-gold hover:text-gold"
                >
                  {child.name_ar}
                </Link>
              ))}
            </div>
          </section>
        )}
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            {products.length === 0 ? (
              <p className="py-16 text-center text-muted">
                لا توجد منتجات في اكسسوارات العروس حالياً
              </p>
            ) : (
              <ShopCatalog
                items={products}
                showCategoryFilter
                categoryOptions={categoryOptions}
              />
            )}
          </div>
        </section>
      </>
    );
  }

  const dresses = await getDressesForCategory(category);

  const description =
    category.description_ar?.trim() ||
    `اكتشفي مجموعة ${category.name_ar} الحصرية من Nadeen Designs`;

  return (
    <>
      <CategoryJsonLd category={category} description={description} />
      <nav
        aria-label="مسار التنقل"
        className="mx-auto max-w-7xl px-4 pt-6 text-sm text-muted md:px-8"
      >
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-gold">
              الرئيسية
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-charcoal">{category.name_ar}</li>
        </ol>
      </nav>
      <PageHero title={category.name_ar} description={description} />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          {dresses.length === 0 ? (
            <p className="py-16 text-center text-muted">
              لا توجد منتجات في هذا التصنيف حالياً
            </p>
          ) : (
            <DressCatalog
              dresses={dresses}
              title={category.name_ar}
              description=""
            />
          )}
        </div>
      </section>
    </>
  );
}
