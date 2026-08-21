import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DressCatalog, PageHero } from "@/components/dresses/DressCatalog";
import { AccessoriesBrowseSidebar } from "@/components/shop/AccessoriesBrowseSidebar";
import { ShopCatalog } from "@/components/shop/ShopCatalog";
import {
  getAccessoriesBrowseNav,
  isAccessoriesBrowseCategory,
} from "@/lib/categories/accessories-browse";
import { resolveCategoryHref } from "@/lib/categories/href";
import { productKindFromCategory } from "@/lib/categories/kind";
import {
  getCategories,
  getCategoryBySlug,
} from "@/lib/data/categories";
import { getDressesForCategory } from "@/lib/data/queries";
import {
  getAccessoryItemsForCategory,
  getBridalAccessoriesProducts,
} from "@/lib/data/shop-queries";
import {
  isAccessoriesGroupCategory,
  type Category,
} from "@/types/category";
import { getStorefrontLocale } from "@/lib/i18n/server";
import {
  formatMessage,
  getDictionary,
  localizedDescription,
  localizedName,
} from "@/lib/i18n";

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
  const locale = await getStorefrontLocale();
  const t = getDictionary(locale);
  if (!category || category.is_visible === false) {
    return { title: t.pages.category.notFound };
  }
  const name = localizedName(category, locale, category.name_ar);
  const title = category.seo_title_ar?.trim() || name;
  const description =
    category.seo_description_ar?.trim() ||
    localizedDescription(category, locale, "") ||
    formatMessage(t.pages.category.metaFallback, { name });
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

  const locale = await getStorefrontLocale();
  const t = getDictionary(locale);
  const catName = localizedName(category, locale, category.name_ar);
  const accessoriesNav = await getAccessoriesBrowseNav(locale);
  const underAccessories =
    accessoriesNav &&
    isAccessoriesBrowseCategory(category, accessoriesNav.parent.id);

  if (productKindFromCategory(category) === "accessory_item") {
    const items = await getAccessoryItemsForCategory(category.id);
    const description =
      localizedDescription(category, locale, "") ||
      formatMessage(t.pages.category.exclusiveFallback, { name: catName });
    const catalogItems = items.map((item) => ({
      id: item.id,
      name_ar: item.name_ar,
      name_en: item.name_en,
      name_he: item.name_he,
      price: item.price,
      sale_price: item.sale_price ?? null,
      images: item.images ?? [],
      color: item.color,
      material: item.material,
      is_available: item.is_available,
      is_featured: Boolean(item.is_featured),
      size: item.size,
      href: `/accessories/${item.id}`,
      kind: "accessory_item" as const,
    }));

    return (
      <>
        <CategoryJsonLd category={category} description={description} />
        <PageHero title={catName} description={description} />
        <section className="py-16 md:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-[240px_minmax(0,1fr)] md:gap-12 md:px-8">
            {accessoriesNav ? (
              <AccessoriesBrowseSidebar
                parentLabel={accessoriesNav.parentLabel}
                parentHref={accessoriesNav.parentHref}
                parentActive={false}
                parentCount={accessoriesNav.parentCount}
                items={accessoriesNav.items}
                activeId={category.id}
                navAriaLabel={t.pages.category.accessoriesNavAria}
                className="md:sticky md:top-28 md:self-start"
              />
            ) : null}
            <div>
              {catalogItems.length === 0 ? (
                <p className="py-16 text-center text-muted">
                  {t.pages.category.emptyAccessories}
                </p>
              ) : (
                <ShopCatalog items={catalogItems} />
              )}
            </div>
          </div>
        </section>
      </>
    );
  }

  if (isAccessoriesGroupCategory(category)) {
    const products = await getBridalAccessoriesProducts();
    const description =
      localizedDescription(category, locale, t.pages.category.accessoriesFallback) ||
      t.pages.category.accessoriesFallback;
    const categoryOptions = [
      ...new Set(products.map((p) => p.category).filter(Boolean)),
    ];

    return (
      <>
        <CategoryJsonLd category={category} description={description} />
        <PageHero title={catName} description={description} />
        <section className="py-16 md:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-[240px_minmax(0,1fr)] md:gap-12 md:px-8">
            {accessoriesNav ? (
              <AccessoriesBrowseSidebar
                parentLabel={accessoriesNav.parentLabel}
                parentHref={accessoriesNav.parentHref}
                parentActive
                parentCount={accessoriesNav.parentCount}
                items={accessoriesNav.items}
                activeId={null}
                navAriaLabel={t.pages.category.accessoriesNavAria}
                className="md:sticky md:top-28 md:self-start"
              />
            ) : null}
            <div>
              {products.length === 0 ? (
                <p className="py-16 text-center text-muted">
                  {t.pages.category.emptyAccessories}
                </p>
              ) : (
                <ShopCatalog
                  items={products}
                  showCategoryFilter
                  categoryOptions={categoryOptions}
                />
              )}
            </div>
          </div>
        </section>
      </>
    );
  }

  const dresses = await getDressesForCategory(category);

  const description =
    localizedDescription(category, locale, "") ||
    formatMessage(t.pages.category.exclusiveFallback, { name: catName });

  return (
    <>
      <CategoryJsonLd category={category} description={description} />
      <nav
        aria-label={t.pages.category.breadcrumbAria}
        className="mx-auto max-w-7xl px-4 pt-6 text-sm text-muted md:px-8"
      >
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-gold">
              {t.common.home}
            </Link>
          </li>
          {underAccessories && accessoriesNav ? (
            <>
              <li aria-hidden>/</li>
              <li>
                <Link
                  href={accessoriesNav.parentHref}
                  className="hover:text-gold"
                >
                  {accessoriesNav.parentLabel}
                </Link>
              </li>
            </>
          ) : null}
          <li aria-hidden>/</li>
          <li className="text-charcoal">{catName}</li>
        </ol>
      </nav>
      <PageHero title={catName} description={description} />
      <section className="py-16 md:py-24">
        <div
          className={
            underAccessories && accessoriesNav
              ? "mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-[240px_minmax(0,1fr)] md:gap-12 md:px-8"
              : "mx-auto max-w-7xl px-4 md:px-8"
          }
        >
          {underAccessories && accessoriesNav ? (
            <AccessoriesBrowseSidebar
              parentLabel={accessoriesNav.parentLabel}
              parentHref={accessoriesNav.parentHref}
              parentActive={false}
              parentCount={accessoriesNav.parentCount}
              items={accessoriesNav.items}
              activeId={category.id}
              navAriaLabel={t.pages.category.accessoriesNavAria}
              className="md:sticky md:top-28 md:self-start"
            />
          ) : null}
          <div>
            {dresses.length === 0 ? (
              <p className="py-16 text-center text-muted">
                {t.pages.category.emptyCategory}
              </p>
            ) : (
              <DressCatalog
                dresses={dresses}
                title={catName}
                description=""
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
