import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/dresses/DressCatalog";
import { Button } from "@/components/ui/Button";
import { resolveAboutIcon } from "@/lib/cms/about-icons";
import { pickCmsOrUi } from "@/lib/cms/locale-text";
import { getSettings } from "@/lib/data/queries";
import { getStorefrontLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getStorefrontLocale();
  const t = getDictionary(locale);
  const settings = await getSettings();
  const title = pickCmsOrUi(
    {
      ar: settings.about_page_title_ar,
      he: settings.about_page_title_he,
      en: settings.about_page_title_en,
    },
    locale,
    {
      ar: t.aboutUi.pageTitle,
      he: t.aboutUi.pageTitle,
      en: t.aboutUi.pageTitle,
    }
  );
  const description = pickCmsOrUi(
    {
      ar: settings.about_page_subtitle_ar,
      he: settings.about_page_subtitle_he,
      en: settings.about_page_subtitle_en,
    },
    locale,
    {
      ar: t.aboutUi.pageSubtitle,
      he: t.aboutUi.pageSubtitle,
      en: t.aboutUi.pageSubtitle,
    }
  );
  return { title, description };
}

export default async function AboutPage() {
  const locale = await getStorefrontLocale();
  const t = getDictionary(locale);
  const settings = await getSettings();
  const imageUrl =
    settings.about_image_url?.trim() ||
    "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80";

  const ui = t.aboutUi;
  const pageTitle = pickCmsOrUi(
    {
      ar: settings.about_page_title_ar,
      he: settings.about_page_title_he,
      en: settings.about_page_title_en,
    },
    locale,
    { ar: ui.pageTitle, he: ui.pageTitle, en: ui.pageTitle }
  );
  const pageSubtitle = pickCmsOrUi(
    {
      ar: settings.about_page_subtitle_ar,
      he: settings.about_page_subtitle_he,
      en: settings.about_page_subtitle_en,
    },
    locale,
    { ar: ui.pageSubtitle, he: ui.pageSubtitle, en: ui.pageSubtitle }
  );
  const eyebrow = pickCmsOrUi(
    {
      ar: settings.about_story_eyebrow_ar,
      he: settings.about_story_eyebrow_he,
      en: settings.about_story_eyebrow_en,
    },
    locale,
    { ar: ui.eyebrow, he: ui.eyebrow, en: ui.eyebrow }
  );
  const heading = pickCmsOrUi(
    {
      ar: settings.about_story_heading_ar,
      he: settings.about_story_heading_he,
      en: settings.about_story_heading_en,
    },
    locale,
    { ar: ui.heading, he: ui.heading, en: ui.heading }
  );
  const aboutBody = pickCmsOrUi(
    {
      ar: settings.about_ar,
      he: settings.about_he,
      en: settings.about_en,
    },
    locale,
    { ar: ui.body, he: ui.body, en: ui.body }
  );
  const aboutSecondary = pickCmsOrUi(
    {
      ar: settings.about_secondary_ar,
      he: (settings as { about_secondary_he?: string }).about_secondary_he,
      en: settings.about_secondary_en,
    },
    locale,
    { ar: ui.secondary, he: ui.secondary, en: ui.secondary }
  );
  const imageAlt = pickCmsOrUi(
    {
      ar: settings.about_image_alt_ar,
      he: settings.about_image_alt_he,
      en: settings.about_image_alt_en,
    },
    locale,
    { ar: pageTitle, he: pageTitle, en: pageTitle }
  );
  const ctaLabel = pickCmsOrUi(
    {
      ar: settings.about_cta_label_ar,
      he: settings.about_cta_label_he,
      en: settings.about_cta_label_en,
    },
    locale,
    { ar: ui.ctaLabel, he: ui.ctaLabel, en: ui.ctaLabel }
  );

  const valueFallbacks = [
    { title: ui.valueTitleQuality, desc: ui.valueDescQuality },
    { title: ui.valueTitlePersonal, desc: ui.valueDescPersonal },
    { title: ui.valueTitleCraft, desc: ui.valueDescCraft },
    { title: ui.valueTitleTrust, desc: ui.valueDescTrust },
  ] as const;

  return (
    <>
      <PageHero title={pageTitle} description={pageSubtitle} />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl">
              <Image
                src={imageUrl}
                alt={imageAlt}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.3em] text-gold uppercase">
                {eyebrow}
              </p>
              <h2 className="mt-4 text-3xl font-bold text-charcoal md:text-4xl">
                {heading}
              </h2>
              <div className="decorative-line mt-4 w-24" />
              <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-muted">
                {aboutBody}
              </p>
              {aboutSecondary ? (
                <p className="mt-4 whitespace-pre-line leading-relaxed text-muted">
                  {aboutSecondary}
                </p>
              ) : null}
              <Link
                href={settings.about_cta_href || "/booking"}
                className="mt-8 inline-block"
              >
                <Button size="lg">{ctaLabel}</Button>
              </Link>
            </div>
          </div>

          <div className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {settings.about_values.map((value, index) => {
              const Icon = resolveAboutIcon(value.icon);
              const fb = valueFallbacks[index % valueFallbacks.length]!;
              const vTitle = pickCmsOrUi(
                {
                  ar: value.title_ar,
                  he: value.title_he,
                  en: value.title_en,
                },
                locale,
                { ar: fb.title, he: fb.title, en: fb.title }
              );
              const vDesc = pickCmsOrUi(
                {
                  ar: value.description_ar,
                  he: value.description_he,
                  en: value.description_en,
                },
                locale,
                { ar: fb.desc, he: fb.desc, en: fb.desc }
              );
              return (
                <div
                  key={`${value.title_ar}-${index}`}
                  className="rounded-2xl border border-beige-dark bg-white p-6 text-center"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 text-gold">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 font-semibold text-charcoal">{vTitle}</h3>
                  <p className="mt-2 text-sm text-muted">{vDesc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
