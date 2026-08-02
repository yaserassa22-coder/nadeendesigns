import type { Metadata } from "next";
import { DressCatalog, PageHero } from "@/components/dresses/DressCatalog";
import { getDresses } from "@/lib/data/queries";

export const metadata: Metadata = {
  title: "فساتين نوف",
  description:
    "اكتشفي مجموعة فساتين نوف الحصرية، بتصاميم تجمع بين الأناقة، الفخامة، والتفاصيل الراقية لتمنحكِ إطلالة استثنائية.",
};

export default async function NoufDressesPage() {
  const dresses = await getDresses({ category: "nouf_dresses" });

  return (
    <>
      <PageHero
        title="فساتين نوف"
        description="اكتشفي مجموعة فساتين نوف الحصرية، بتصاميم تجمع بين الأناقة، الفخامة، والتفاصيل الراقية لتمنحكِ إطلالة استثنائية."
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <DressCatalog
            dresses={dresses}
            category="nouf_dresses"
            title="فساتين نوف"
            description=""
          />
        </div>
      </section>
    </>
  );
}
