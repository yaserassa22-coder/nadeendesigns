import { Hero } from "@/components/home/Hero";
import { AccessoriesEditorialSlideshow } from "@/components/home/AccessoriesEditorialSlideshow";
import { ServicesSection } from "@/components/home/ServicesSection";
import { CustomDesignSection } from "@/components/home/CustomDesignSection";
import { WornByYouSection } from "@/components/home/WornByYouSection";
import { InstagramSection } from "@/components/home/InstagramSection";
import { CTASection } from "@/components/home/CTASection";
import { AddToHomeScreenPrompt } from "@/components/home/AddToHomeScreenPrompt";
import { getHomepageCategories, getVisibleCategories } from "@/lib/data/categories";
import {
  getDressById,
  getFeaturedDresses,
  getGalleryItems,
  getSettings,
  getWornByYouItems,
} from "@/lib/data/queries";
import { getAccessoriesEditorialSlides } from "@/lib/home/accessories-editorial";
import {
  getHomepageEditorialTiles,
  parseEditorialCategoryIds,
  parseEditorialDressIds,
} from "@/lib/home/homepage-editorial-gallery";
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

  const cmsCustomUrls = (
    Array.isArray(settings.custom_design_image_urls)
      ? settings.custom_design_image_urls
      : []
  )
    .map((u) => u.trim())
    .filter(Boolean)
    .slice(0, 5);

  const aboutImage = settings.about_image_url?.trim() || "";
  const featuredDressImage = featuredImage(featuredDresses[0]?.images);
  const customCategoryCover =
    categories.find((c) => c.legacy_key === "custom_design")?.cover_image_url ??
    null;

  // Prefer full CMS gallery (up to 5). Fill empty slots only when CMS is empty.
  const customGallery =
    cmsCustomUrls.length > 0
      ? cmsCustomUrls
      : [
          settings.custom_design_image_url?.trim() || "",
          customCategoryCover?.trim() || "",
          aboutImage,
          featuredDressImage || "",
          featuredImage(featuredDresses[1]?.images) || "",
        ]
          .map((u) => u.trim())
          .filter(Boolean)
          .slice(0, 5);

  const customImageUrl = customGallery[0] || null;
  const craftImageUrl = customGallery[2] || customGallery[1] || null;
  const dressImageUrl = customGallery[3] || customGallery[4] || craftImageUrl;

  // Featured dresses fold into the post-hero grid; custom design is its own band.
  // Manual mode: editorial_order is the sole membership list (add/remove from Admin).
  const explicitOrder = hp.editorial_order;
  const manual = hp.editorial_manual;
  let editorialCategorySource = hp.featured_categories ? categories : [];
  let editorialDressSource = hp.featured_products ? featuredDresses : [];

  if (manual) {
    const wantedCatIds = new Set(parseEditorialCategoryIds(explicitOrder));
    const wantedDressIds = parseEditorialDressIds(explicitOrder);
    const visible = await getVisibleCategories();
    editorialCategorySource = visible.filter((c) => wantedCatIds.has(c.id));

    const byId = new Map(featuredDresses.map((d) => [d.id, d]));
    const missing = wantedDressIds.filter((id) => !byId.has(id));
    if (missing.length) {
      const fetched = await Promise.all(missing.map((id) => getDressById(id)));
      for (const dress of fetched) {
        if (dress) byId.set(dress.id, dress);
      }
    }
    editorialDressSource = wantedDressIds
      .map((id) => byId.get(id))
      .filter((d): d is NonNullable<typeof d> => Boolean(d));
  }

  const editorialTiles =
    manual || hp.featured_categories || hp.featured_products
      ? await getHomepageEditorialTiles(editorialCategorySource, locale, {
          featuredDresses: editorialDressSource,
          customDesign: null,
          editorialOrder: explicitOrder,
          editorialManual: manual,
          editorialColumns: hp.editorial_columns,
          editorialPattern: hp.editorial_pattern,
        })
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
        {hp.collections ? (
          <CustomDesignSection
            imageUrls={customGallery}
            imageUrl={customImageUrl}
            craftImageUrl={craftImageUrl}
            dressImageUrl={dressImageUrl}
          />
        ) : null}
        {editorialTiles.length > 0 ? (
          <ServicesSection
            tiles={editorialTiles}
            columns={hp.editorial_columns}
            gap={hp.editorial_gap}
            tileSize={hp.editorial_tile_size}
          />
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
      <AddToHomeScreenPrompt />
    </>
  );
}
