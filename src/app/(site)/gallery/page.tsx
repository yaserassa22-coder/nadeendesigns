import type { Metadata } from "next";
import { PageHero } from "@/components/dresses/DressCatalog";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { getGalleryCategories } from "@/lib/data/gallery-categories";
import { getGalleryItems } from "@/lib/data/queries";
import { getStorefrontLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getStorefrontLocale();
  const t = getDictionary(locale);
  return {
    title: t.pages.gallery.title,
    description: t.pages.gallery.metaDescription,
  };
}

export default async function GalleryPage() {
  const locale = await getStorefrontLocale();
  const t = getDictionary(locale);
  const [items, categories] = await Promise.all([
    getGalleryItems(),
    getGalleryCategories(),
  ]);

  return (
    <>
      <PageHero
        title={t.pages.gallery.title}
        description={t.pages.gallery.heroDescription}
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <GalleryGrid items={items} categories={categories} />
        </div>
      </section>
    </>
  );
}
