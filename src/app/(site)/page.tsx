import { Hero } from "@/components/home/Hero";
import { AccessoriesEditorialSlideshow } from "@/components/home/AccessoriesEditorialSlideshow";
import { ServicesSection } from "@/components/home/ServicesSection";
import { WornByYouSection } from "@/components/home/WornByYouSection";
import { InstagramSection } from "@/components/home/InstagramSection";
import { CTASection } from "@/components/home/CTASection";
import { getHomepageCategories } from "@/lib/data/categories";
import {
  getFeaturedDresses,
  getGalleryItems,
  getSettings,
  getWornByYouItems,
} from "@/lib/data/queries";
import { getAccessoriesEditorialSlides } from "@/lib/home/accessories-editorial";
import { getHomepageEditorialTiles } from "@/lib/home/homepage-editorial-gallery";
import { featuredImage } from "@/lib/products/featured-image";
import { getStoreSettings } from "@/lib/store/settings";
import { getStorefrontLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";
import { resolveCategoryLabel } from "@/lib/i18n/category-labels";
import { isAccessoriesGroupCategory } from "@/types/category";
import { SITE_NAME } from "@/lib/constants";

export default async function HomePage() {
  const locale = await getStorefrontLocale();
  const [
    featuredDresses,
    categories,
    settings,
    store,
    gallery,
    wornByYou,
    accessoriesSlides,
  ] = await Promise.all([
    getFeaturedDresses(8),
    getHomepageCategories(),
    getSettings(),
    getStoreSettings(),
    getGalleryItems(),
    getWornByYouItems(),
    getAccessoriesEditorialSlides(locale),
  ]);

  const hp = store.homepage;

  const customCategoryCover =
    categories.find((c) => c.legacy_key === "custom_design")?.cover_image_url ??
    null;
  const aboutImage = settings.about_image_url?.trim() || "";
  const featuredDressImage = featuredImage(featuredDresses[0]?.images);
  const dedicatedCustomImage = settings.custom_design_image_url?.trim() || "";
  const customImageUrl =
    dedicatedCustomImage ||
    customCategoryCover ||
    aboutImage ||
    featuredDressImage ||
    null;

  // Featured dresses + custom design fold into the post-hero grid (no separate blocks).
  const editorialTiles =
    hp.featured_categories || hp.featured_products || hp.collections
      ? await getHomepageEditorialTiles(
          hp.featured_categories ? categories : [],
          locale,
          {
            featuredDresses: hp.featured_products ? featuredDresses : [],
            customDesign: hp.collections
              ? { imageUrl: customImageUrl }
              : null,
          }
        )
      : [];

  const accessoriesCategory = categories.find((c) =>
    isAccessoriesGroupCategory(c)
  );
  const accessoriesLabel = accessoriesCategory
    ? resolveCategoryLabel(accessoriesCategory, locale)
    : getDictionary(locale).catalog.bridalAccessories;

  const instagramTiles: { src: string; alt: string; href?: string }[] = [];
  const usedIgUrls = new Set<string>();
  for (const item of gallery) {
    const src = item.image_url?.trim();
    if (!src || usedIgUrls.has(src)) continue;
    usedIgUrls.add(src);
    instagramTiles.push({
      src,
      alt: item.title_ar || SITE_NAME,
      href: "/gallery",
    });
    if (instagramTiles.length >= 9) break;
  }

  return (
    <>
      {hp.hero ? <Hero settings={settings} /> : null}
      <div className="bg-ivory">
        {editorialTiles.length > 0 ? (
          <ServicesSection tiles={editorialTiles} />
        ) : null}
        {hp.worn_by_you ? <WornByYouSection items={wornByYou} /> : null}
        {hp.accessories_editorial ? (
          <AccessoriesEditorialSlideshow
            slides={accessoriesSlides}
            categoryLabel={accessoriesLabel}
          />
        ) : null}
        {hp.instagram ? <InstagramSection images={instagramTiles} /> : null}
      </div>
      <CTASection />
    </>
  );
}
