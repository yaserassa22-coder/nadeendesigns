import type { Metadata } from "next";
import Link from "next/link";
import { HomeHeroCmsForm } from "@/components/admin/cms/HomeHeroCmsForm";
import { HomeCustomDesignCmsForm } from "@/components/admin/cms/HomeCustomDesignCmsForm";
import {
  HomepageEditorialOrderManager,
  type EditorialOrderTile,
} from "@/components/admin/HomepageEditorialOrderManager";
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

function toOrderTiles(
  tiles: Awaited<ReturnType<typeof getHomepageEditorialTiles>>
): EditorialOrderTile[] {
  return tiles
    .filter((tile) => tile.variant !== "custom")
    .map((tile) => ({
      id: tile.id,
      title: tile.title,
      imageUrl: tile.imageUrl,
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

  const autoTiles = toOrderTiles(autoTilesRaw);
  const availableTiles = toOrderTiles(availableRaw);

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

      <HomepageEditorialOrderManager
        availableTiles={availableTiles}
        autoTiles={autoTiles}
        initialOrder={hp.editorial_order}
        initialManual={hp.editorial_manual}
        initialLayout={{
          columns: hp.editorial_columns,
          gap: hp.editorial_gap,
          tileSize: hp.editorial_tile_size,
          pattern: hp.editorial_pattern,
        }}
      />

      <HomeCustomDesignCmsForm initialSettings={settings} />
    </div>
  );
}
