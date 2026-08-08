import type { Metadata } from "next";
import { PageHero } from "@/components/dresses/DressCatalog";
import { AccessoriesBrowseSidebar } from "@/components/shop/AccessoriesBrowseSidebar";
import { ShopCatalog } from "@/components/shop/ShopCatalog";
import { getAccessoriesBrowseNav } from "@/lib/categories/accessories-browse";
import { getVeils } from "@/lib/data/shop-queries";
import { VEIL_CATEGORY_OPTIONS } from "@/types/shop";
import { getStorefrontLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getStorefrontLocale();
  const t = getDictionary(locale);
  return {
    title: t.pages.veils.title,
    description: t.pages.veils.metaDescription,
  };
}

export default async function VeilsPage() {
  const locale = await getStorefrontLocale();
  const t = getDictionary(locale);
  const [veils, accessoriesNav] = await Promise.all([
    getVeils(),
    getAccessoriesBrowseNav(locale),
  ]);
  const activeId =
    accessoriesNav?.items.find((i) => i.href === "/veils")?.id ?? null;

  return (
    <>
      <PageHero
        title={t.pages.veils.title}
        description={t.pages.veils.heroDescription}
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-[240px_minmax(0,1fr)] md:gap-12 md:px-8">
          {accessoriesNav ? (
            <AccessoriesBrowseSidebar
              parentLabel={accessoriesNav.parentLabel}
              parentHref={accessoriesNav.parentHref}
              parentActive={false}
              parentCount={accessoriesNav.parentCount}
              items={accessoriesNav.items}
              activeId={activeId}
              navAriaLabel={t.pages.category.accessoriesNavAria}
              className="md:sticky md:top-28 md:self-start"
            />
          ) : null}
          <div>
            <ShopCatalog
              items={veils}
              basePath="/veils"
              showCategoryFilter
              categoryOptions={[...VEIL_CATEGORY_OPTIONS]}
            />
          </div>
        </div>
      </section>
    </>
  );
}
