import { Hero } from "@/components/home/Hero";
import { AccessoriesEditorialSlideshow } from "@/components/home/AccessoriesEditorialSlideshow";
import { ServicesSection } from "@/components/home/ServicesSection";
import { HomeVisualLayoutSection } from "@/components/home/HomeVisualLayoutSection";
import { CustomDesignSection } from "@/components/home/CustomDesignSection";
import { WornByYouSection } from "@/components/home/WornByYouSection";
import { InstagramSection } from "@/components/home/InstagramSection";
import { CTASection } from "@/components/home/CTASection";
import { AddToHomeScreenPrompt } from "@/components/home/AddToHomeScreenPrompt";
import { getHomepageCategories, getVisibleCategories } from "@/lib/data/categories";
import { getGalleryCategories } from "@/lib/data/gallery-categories";
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
import { wornByYouStorefrontItems } from "@/lib/home/worn-by-you";
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
    galleryCategories,
  ] = await Promise.all([
    getFeaturedDresses(8),
    getHomepageCategories(),
    getSettings(),
    getStoreSettings(),
    getGalleryItems(),
    getWornByYouItems(),
    getAccessoriesEditorialSlides(locale),
    getGalleryCategories(),
  ]);

  const hp = store.homepage;
  const dict = getDictionary(locale);

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
  const visualLayoutEnabled =
    hp.visual_layout_enabled && hp.visual_layout_items.length > 0;

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
    : dict.catalog.bridalAccessories;

  const visualCustomTile =
    hp.collections && visualLayoutEnabled
      ? {
          id: "custom-design",
          href: "/custom-design",
          title: dict.nav.customDesign,
          eyebrow: dict.home.customEyebrow,
          imageUrl: customImageUrl?.trim() || "",
          mobileSpan: 2 as const,
          desktopSpan: 2 as const,
          emphasize: true,
          variant: "custom" as const,
          primaryCtaLabel: dict.home.customStartCta,
          secondaryHref: "/booking?service=custom_design",
          secondaryCtaLabel: dict.home.customBookCta,
        }
      : null;

  const visualTileMap = new Map(editorialTiles.map((tile) => [tile.id, tile]));
  if (visualCustomTile) {
    visualTileMap.set(visualCustomTile.id, visualCustomTile);
  }
  const visualTiles = hp.visual_layout_items
    .slice()
    .sort((a, b) => a.z - b.z)
    .map((item) => visualTileMap.get(item.id))
    .filter((tile): tile is NonNullable<typeof tile> => Boolean(tile));

  const instagramTiles: {
    src: string;
    alt: string;
    title?: string;
    href?: string;
    category: string;
    videoUrl?: string;
    mediaType?: "image" | "video";
  }[] = [];
  const usedIgKeys = new Set<string>();
  for (const item of gallery) {
    const videoUrl = item.video_url?.trim() || "";
    const isVideo = item.media_type === "video" && Boolean(videoUrl);
    const src = item.image_url?.trim() || "";
    if (!isVideo && !src) continue;
    const key = isVideo ? videoUrl : src;
    if (usedIgKeys.has(key)) continue;
    usedIgKeys.add(key);
    instagramTiles.push({
      src,
      alt: item.title_ar || SITE_NAME,
      title: item.title_ar || "",
      href: "/gallery",
      category: item.category || "details",
      videoUrl: isVideo ? videoUrl : undefined,
      mediaType: isVideo ? "video" : "image",
    });
  }

  return (
    <>
      {hp.hero ? <Hero settings={settings} /> : null}
      <div className="bg-white">
        {visualLayoutEnabled ? (
          <HomeVisualLayoutSection
            tiles={visualTiles}
            layoutItems={hp.visual_layout_items}
            height={hp.visual_layout_height}
            columns={hp.editorial_columns}
            gap={hp.editorial_gap}
            tileSize={hp.editorial_tile_size}
            unified={hp.visual_layout_unified}
            layoutGrid={hp.visual_layout_grid}
          />
        ) : null}
        {/* Custom design band stays on the frontpage even when visual layout is on. */}
        {hp.collections ? (
          <CustomDesignSection
            imageUrls={customGallery}
            imageUrl={customImageUrl}
            craftImageUrl={craftImageUrl}
            dressImageUrl={dressImageUrl}
            imageTransition={settings.custom_design_image_transition !== false}
          />
        ) : null}
        {!visualLayoutEnabled && editorialTiles.length > 0 ? (
          <ServicesSection
            tiles={editorialTiles}
            columns={hp.editorial_columns}
            gap={hp.editorial_gap}
            tileSize={hp.editorial_tile_size}
          />
        ) : null}
        {hp.worn_by_you && wornByYouStorefrontItems(wornByYou).length > 0 ? (
          <WornByYouSection items={wornByYou} />
        ) : null}
        {hp.accessories_editorial ? (
          <AccessoriesEditorialSlideshow
            slides={accessoriesSlides}
            categoryLabel={accessoriesLabel}
            frame={hp.accessories_editorial_frame}
          />
        ) : null}
        {hp.instagram ? (
          <InstagramSection
            images={instagramTiles}
            categories={galleryCategories}
            social={{
              instagram:
                store.social.instagram_url || store.contact.instagram_url,
              facebook:
                store.social.facebook_url || store.contact.facebook_url,
              tiktok: store.social.tiktok_url || store.contact.tiktok_url,
              pinterest: store.social.pinterest_url,
              youtube: store.social.youtube_url,
            }}
          />
        ) : null}
      </div>
      <CTASection />
      <AddToHomeScreenPrompt />
    </>
  );
}
