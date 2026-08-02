import type { Metadata } from "next";
import { DressCatalog, PageHero } from "@/components/dresses/DressCatalog";
import { getDresses } from "@/lib/data/queries";

export const metadata: Metadata = {
  title: "فساتين الزفاف",
  description:
    "اكتشفي مجموعة فساتين الزفاف الفاخرة في Nadeen Designs — تصاميم حصرية من أفخر الأقمشة العالمية.",
};

export default async function WeddingDressesPage() {
  const dresses = await getDresses({ category: "wedding" });

  return (
    <>
      <PageHero
        title="فساتين الزفاف"
        description="مجموعة حصرية من فساتين الزفاف الفاخرة المصممة لتجعل يومكِ لا يُنسى"
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <DressCatalog
            dresses={dresses}
            category="wedding"
            title="فساتين الزفاف"
            description=""
          />
        </div>
      </section>
    </>
  );
}
