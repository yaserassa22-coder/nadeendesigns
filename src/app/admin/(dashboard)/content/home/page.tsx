import type { Metadata } from "next";
import Link from "next/link";
import { HomeHeroCmsForm } from "@/components/admin/cms/HomeHeroCmsForm";
import { HomeCustomDesignCmsForm } from "@/components/admin/cms/HomeCustomDesignCmsForm";
import { HomeAccessoriesEditorialCmsForm } from "@/components/admin/cms/HomeAccessoriesEditorialCmsForm";
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
import { getAccessoriesEditorialSlides } from "@/lib/home/accessories-editorial";
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
    accessoriesSlides,
  ] = await Promise.all([
    getAdminSettings(),
    getStoreSettings(),
    getHomepageCategories(),
    getVisibleCategories(),
    getFeaturedDresses(8),
    getDresses(),
    getAccessoriesEditorialSlides(locale),
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
        <h1 className="mt-2 text-[1.65rem] font-semibold tracking-tight text-charcoal md:text-[1.85rem]">
          محتوى الصفحة الرئيسية
        </h1>
        <p className="mt-1.5 max-w-3xl text-[0.9375rem] leading-relaxed text-muted">
          تعديل الهيرو، شبكة ما بعد الهيرو (إضافة / حذف / ترتيب / أعمدة)، إطار
          إكسسوارات العروس، التصميم الخاص، ورابط سريع لإدارة معرض الصور (تفاصيل /
          البوتيك / فعاليات).
        </p>
      </div>

      {!cloudinaryReady && (
        <div className="rounded-2xl border border-gold/30 bg-gold/5 px-5 py-4 text-sm text-charcoal">
          Cloudinary غير مُعد بعد. يمكنك لصق روابط الصور يدويًا من حقل الرفع.
        </div>
      )}

      <nav
        aria-label="Homepage sections"
        className="sticky top-[4.25rem] z-20 flex flex-wrap gap-2 rounded-2xl border border-[#e8e2d8] bg-white/95 p-3 shadow-sm backdrop-blur"
      >
        {[
          { href: "#hero", label: "Hero" },
          { href: "#visual-layout", label: "Post Grid" },
          { href: "#accessories", label: "Accessories" },
          { href: "#custom-design", label: "Custom Design" },
          { href: "#gallery", label: "Gallery" },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-full border border-[#e8e2d8] px-3 py-1.5 text-xs font-medium text-charcoal hover:border-[#b89a6a]/50 hover:bg-[#faf8f5]"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div id="hero">
        <HomeHeroCmsForm initialSettings={settings} />
      </div>

      <div id="visual-layout">
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
        initialVisualGrid={hp.visual_layout_grid}
        customDesignImageUrl={customDesignImageUrl}
      />
      </div>

      <div id="accessories">
      <HomeAccessoriesEditorialCmsForm
        initialFrame={hp.accessories_editorial_frame}
        previewImageUrl={accessoriesSlides[0]?.imageUrl}
      />
      </div>

      <div id="custom-design">
      <HomeCustomDesignCmsForm initialSettings={settings} />
      </div>

      <div id="gallery" className="rounded-2xl border border-beige-dark/70 bg-ivory/40 p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-charcoal">
              معرض الصور — تفاصيل / البوتيك / فعاليات
            </p>
            <p className="mt-1 text-sm text-muted">
              أزرار الفلتر في صفحة المعرض تُدار من هنا: ارفعي الصور واختاري
              التصنيف (تفاصيل، البوتيك، فعاليات، فساتين زفاف، فساتين نوف). صور
              المعرض تظهر أيضاً في قسم إنستغرام على الرئيسية.
            </p>
          </div>
          <Link
            href="/admin/gallery"
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-beige-dark bg-white px-5 py-2.5 text-sm font-medium text-charcoal transition hover:border-gold hover:text-gold"
          >
            إدارة المعرض
          </Link>
        </div>
      </div>
    </div>
  );
}
