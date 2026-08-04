import type { Metadata } from "next";
import { DressCatalog, PageHero } from "@/components/dresses/DressCatalog";
import { getCategoryBySlug } from "@/lib/data/categories";
import {
  getDresses,
  getDressesForCategory,
} from "@/lib/data/queries";

export const metadata: Metadata = {
  title: "فساتين نوف",
  description:
    "اكتشفي مجموعة فساتين نوف الحصرية، بتصاميم تجمع بين الأناقة، الفخامة، والتفاصيل الراقية لتمنحكِ إطلالة استثنائية.",
};

export default async function NoufDressesPage() {
  const category = await getCategoryBySlug("nouf-dresses");
  const dresses = category
    ? await getDressesForCategory(category)
    : await getDresses({ category: "nouf_dresses" });

  return (
    <>
      <PageHero
        title={category?.name_ar || "فساتين نوف"}
        description={
          category?.description_ar?.trim() ||
          "اكتشفي مجموعة فساتين نوف الحصرية، بتصاميم تجمع بين الأناقة، الفخامة، والتفاصيل الراقية لتمنحكِ إطلالة استثنائية."
        }
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <DressCatalog
            dresses={dresses}
            title={category?.name_ar || "فساتين نوف"}
            description=""
          />
        </div>
      </section>
    </>
  );
}
