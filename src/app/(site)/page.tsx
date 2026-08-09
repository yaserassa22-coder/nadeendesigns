import { Hero } from "@/components/home/Hero";
import { FeaturedDresses } from "@/components/home/FeaturedDresses";
import { AccessoriesEditorialSlideshow } from "@/components/home/AccessoriesEditorialSlideshow";
import { CustomDesignSection } from "@/components/home/CustomDesignSection";
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
import { pickCmsOrUi } from "@/lib/cms/locale-text";
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
  const editorialTiles = hp.featured_categories
    ? await getHomepageEditorialTiles(categories, locale)
    : [];

  const accessoriesCategory = categories.find((c) =>
    isAccessoriesGroupCategory(c)
  );
  const accessoriesLabel = accessoriesCategory
    ? resolveCategoryLabel(accessoriesCategory, locale)
    : getDictionary(locale).catalog.bridalAccessories;

  const customCategoryCover =
    categories.find((c) => c.legacy_key === "custom_design")?.cover_image_url ??
    null;
  const aboutImage = settings.about_image_url?.trim() || "";
  const featuredDressImage = featuredImage(featuredDresses[0]?.images);
  const customImageUrl =
    aboutImage || customCategoryCover || featuredDressImage || null;
  const customImageAlt = pickCmsOrUi(
    {
      ar: settings.about_image_alt_ar,
      he: settings.about_image_alt_he,
      en: settings.about_image_alt_en,
    },
    locale,
    { ar: SITE_NAME, he: SITE_NAME, en: SITE_NAME }
  );

  const instagramTiles: { src: string; alt: string; href?: string }[] = gallery
    .filter((item) => Boolean(item.image_url?.trim()))
    .slice(0, 9)
    .map((item) => ({
      src: item.image_url,
      alt: item.title_ar || SITE_NAME,
      href: "/gallery",
    }));

  if (instagramTiles.length === 0) {
    for (const dress of featuredDresses) {
      const src = featuredImage(dress.images);
      if (!src) continue;
      instagramTiles.push({
        src,
        alt: dress.name_ar || SITE_NAME,
        href: `/dresses/${dress.id}`,
      });
      if (instagramTiles.length >= 9) break;
    }
  }

  return (
    <>
      {hp.hero ? <Hero settings={settings} /> : null}
      <div className="bg-ivory">
        {hp.featured_categories ? (
          <ServicesSection tiles={editorialTiles} />
        ) : null}
        {hp.featured_products ? (
          <FeaturedDresses dresses={featuredDresses} />
        ) : null}
        {hp.accessories_editorial ? (
          <AccessoriesEditorialSlideshow
            slides={accessoriesSlides}
            categoryLabel={accessoriesLabel}
          />
        ) : null}
        {hp.collections ? (
          <CustomDesignSection
            imageUrl={customImageUrl}
            imageAlt={customImageAlt}
          />
        ) : null}
        {hp.worn_by_you ? <WornByYouSection items={wornByYou} /> : null}
        {hp.instagram ? <InstagramSection images={instagramTiles} /> : null}
      </div>
      <CTASection />
    </>
  );
}
