import type { Metadata } from "next";
import { PageHero } from "@/components/dresses/DressCatalog";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { getGalleryItems } from "@/lib/data/queries";

export const metadata: Metadata = {
  title: "معرض الصور",
  description: "معرض صور Nadeen Designs — إطلالات عروسنا، تفاصيل التصاميم، ولحظات من البوتيك.",
};

export default async function GalleryPage() {
  const items = await getGalleryItems();

  return (
    <>
      <PageHero
        title="معرض الصور"
        description="استكشفي لحظات الجمال والأناقة من بوتيكنا وعروسنا السعيدات"
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <GalleryGrid items={items} />
        </div>
      </section>
    </>
  );
}
