import type { Metadata } from "next";
import { DressCatalog, PageHero } from "@/components/dresses/DressCatalog";
import { getCategoryBySlug } from "@/lib/data/categories";
import {
  getDresses,
  getDressesForCategory,
} from "@/lib/data/queries";
import { getStorefrontLocale } from "@/lib/i18n/server";
import { getDictionary, localizedDescription, localizedName } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getStorefrontLocale();
  const t = getDictionary(locale);
  return {
    title: t.pages.rentalDresses.title,
    description: t.pages.rentalDresses.metaDescription,
  };
}

export default async function Page() {
  const locale = await getStorefrontLocale();
  const t = getDictionary(locale);
  const category = await getCategoryBySlug("rental-dresses");
  const dresses = category
    ? await getDressesForCategory(category)
    : await getDresses({ category: "rental" });

  const title = localizedName(category, locale, t.pages.rentalDresses.title);
  const description =
    localizedDescription(category, locale, t.pages.rentalDresses.heroDescription) ||
    t.pages.rentalDresses.heroDescription;

  return (
    <>
      <PageHero title={title} description={description} />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <DressCatalog dresses={dresses} title={title} description="" />
        </div>
      </section>
    </>
  );
}
