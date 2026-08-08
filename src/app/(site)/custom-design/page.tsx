import type { Metadata } from "next";
import { PageHero } from "@/components/dresses/DressCatalog";
import { CustomDesignQuestionnaire } from "@/components/forms/CustomDesignQuestionnaire";
import { getStorefrontLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getStorefrontLocale();
  const t = getDictionary(locale);
  return {
    title: t.pages.customDesign.title,
    description: t.pages.customDesign.metaDescription,
  };
}

export default async function CustomDesignPage() {
  const locale = await getStorefrontLocale();
  const t = getDictionary(locale);

  return (
    <>
      <PageHero
        title={t.pages.customDesign.title}
        description={t.pages.customDesign.heroDescription}
      />
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 luxury-gradient" />
        <div className="absolute top-20 left-1/4 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute bottom-10 right-1/5 h-72 w-72 rounded-full bg-gold/5 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-4 md:px-8">
          <CustomDesignQuestionnaire />
        </div>
      </section>
    </>
  );
}
