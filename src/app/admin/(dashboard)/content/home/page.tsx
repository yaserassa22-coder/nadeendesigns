import type { Metadata } from "next";
import Link from "next/link";
import { HomeHeroCmsForm } from "@/components/admin/cms/HomeHeroCmsForm";
import { HomeCustomDesignCmsForm } from "@/components/admin/cms/HomeCustomDesignCmsForm";
import {
  HomepageVisualLayoutManager,
  type VisualLayoutTile,
} from "@/components/admin/HomepageVisualLayoutManager";
import { getAdminSettings } from "@/lib/admin/data";
import {
  getHomepageCategories,
  getVisibleCategories,
} from "@/lib/data/categories";
import { getDresses, getFeaturedDresses } from "@/lib/data/queries";
import { getHomepageEditorialTiles } from "@/lib/home/homepage-editorial-gallery";
import { getStoreSettings } from "@/lib/store/settings";
import { getLocale } from "@/lib/i18n/server";
import { isCloudinaryConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "محتوى الرئيسية",
};

function toVisualTiles(
  tiles: Awaited<ReturnType<typeof getHomepageEditorialTiles>>
): VisualLayoutTile[] {
  return tiles
    .filter((tile) => tile.variant !== "custom")
    .map((tile) => ({
      id: tile.id,
      title: tile.title,
      imageUrl: tile.imageUrl,
      href: tile.href,
      eyebrow: tile.eyebrow,
      primaryCtaLabel: tile.primaryCtaLabel,
      secondaryHref: tile.secondaryHref,
      secondaryCtaLabel: tile.secondaryCtaLabel,
      kind: tile.id.startsWith("dress-") ? "product" : "category",
    }));
}

export default async function AdminHomeContentPage() {
  const locale = await getLocale();
  const [
    settings,
    store,
    homepageCategories,
    visibleCategories,
    featuredDresses,
    allDresses,
  ] = await Promise.all([
    getAdminSettings(),
    getStoreSettings(),
    getHomepageCategories(),
    getVisibleCategories(),
    getFeaturedDresses(8),
    getDresses(),
  ]);
  const cloudinaryReady = isCloudinaryConfigured();
  const hp = store.homepage;
  const customDesignImageUrl =
    settings.custom_design_image_urls?.find((url) => url.trim()) ||
    settings.custom_design_image_url ||
    null;

  const autoTilesRaw = await getHomepageEditorialTiles(
    hp.featured_categories ? homepageCategories : [],
    locale,
    {
      featuredDresses: hp.featured_products ? featuredDresses : [],
      customDesign: null,
      editorialOrder: [],
      editorialColumns: hp.editorial_columns,
    }
  );

  const availableRaw = await getHomepageEditorialTiles(
    visibleCategories,
    locale,
    {
      featuredDresses: allDresses.slice(0, 120),
      customDesign: null,
      editorialOrder: [],
      editorialColumns: hp.editorial_columns,
    }
  );

  const autoTiles = toVisualTiles(autoTilesRaw);
  const availableTiles = toVisualTiles(availableRaw);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted">
          <Link href="/admin/settings" className="text-gold hover:underline">
            الإعدادات
          </Link>
          <span className="mx-2">/</span>
          محتوى الموقع
        </p>
        <h1 className="mt-2 text-3xl font-bold text-charcoal">
          محتوى الصفحة الرئيسية
        </h1>
        <p className="mt-2 text-muted">
          تعديل الهيرو، شبكة ما بعد الهيرو (إضافة / حذف / ترتيب / أعمدة)، وبلاطة
          التصميم الخاص.
        </p>
      </div>

      {!cloudinaryReady && (
        <div className="rounded-2xl border border-gold/30 bg-gold/5 px-5 py-4 text-sm text-charcoal">
          Cloudinary غير مُعد بعد. يمكنك لصق روابط الصور يدويًا من حقل الرفع.
        </div>
      )}

      <HomeHeroCmsForm initialSettings={settings} />

      <HomepageVisualLayoutManager
        availableTiles={availableTiles}
        autoTiles={autoTiles}
        initialOrder={hp.editorial_order}
        initialManual={hp.editorial_manual}
        initialVisualEnabled={hp.visual_layout_enabled}
        initialVisualItems={hp.visual_layout_items}
        initialVisualHeight={hp.visual_layout_height}
        initialVisualPadTop={hp.visual_layout_pad_top}
        initialVisualBlockGap={hp.visual_layout_block_gap}
        initialVisualEdgeGap={hp.visual_layout_edge_gap}
        initialVisualRowScales={hp.visual_layout_row_scales}
        initialVisualUnified={hp.visual_layout_unified}
        customDesignImageUrl={customDesignImageUrl}
      />

      <HomeCustomDesignCmsForm initialSettings={settings} />
    </div>
  );
}
