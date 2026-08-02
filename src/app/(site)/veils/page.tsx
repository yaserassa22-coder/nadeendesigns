import type { Metadata } from "next";
import { DressCatalog, PageHero } from "@/components/dresses/DressCatalog";
import { getDresses } from "@/lib/data/queries";

export const metadata: Metadata = {
  title: "الطرحات",
  description: "طرحات زفاف فاخرة — cathedral، birdcage، وتصاميم مخصصة.",
};

export default async function VeilsPage() {
  const dresses = await getDresses({ category: "veils" });

  return (
    <>
      <PageHero
        title="الطرحات"
        description="طرحات زفاف أنيقة تكمل إطلالتكِ بلمسة من السحر والأناقة"
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <DressCatalog
            dresses={dresses}
            category="veils"
            title="الطرحات"
            description=""
          />
        </div>
      </section>
    </>
  );
}
