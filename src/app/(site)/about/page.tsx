import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/dresses/DressCatalog";
import { Button } from "@/components/ui/Button";
import { resolveAboutIcon } from "@/lib/cms/about-icons";
import { getSettings } from "@/lib/data/queries";

export const metadata: Metadata = {
  title: "من نحن",
  description:
    "تعرفي على Nadeen Designs — بوتيك فاخر متخصص في فساتين الزفاف والإكسسوارات منذ أكثر من 10 سنوات.",
};

export default async function AboutPage() {
  const settings = await getSettings();
  const imageUrl =
    settings.about_image_url?.trim() ||
    "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80";

  return (
    <>
      <PageHero
        title={settings.about_page_title_ar}
        description={settings.about_page_subtitle_ar}
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl">
              <Image
                src={imageUrl}
                alt={settings.about_image_alt_ar}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.3em] text-gold uppercase">
                {settings.about_story_eyebrow_ar}
              </p>
              <h2 className="mt-4 text-3xl font-bold text-charcoal md:text-4xl">
                {settings.about_story_heading_ar}
              </h2>
              <div className="decorative-line mt-4 w-24" />
              <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-muted">
                {settings.about_ar}
              </p>
              <p className="mt-4 whitespace-pre-line leading-relaxed text-muted">
                {settings.about_secondary_ar}
              </p>
              <Link
                href={settings.about_cta_href || "/booking"}
                className="mt-8 inline-block"
              >
                <Button size="lg">{settings.about_cta_label_ar}</Button>
              </Link>
            </div>
          </div>

          <div className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {settings.about_values.map((value, index) => {
              const Icon = resolveAboutIcon(value.icon);
              return (
                <div
                  key={`${value.title_ar}-${index}`}
                  className="rounded-2xl border border-beige-dark bg-white p-6 text-center"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 text-gold">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 font-semibold text-charcoal">
                    {value.title_ar}
                  </h3>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted">
                    {value.description_ar}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
