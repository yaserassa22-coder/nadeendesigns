import type { Metadata } from "next";
import { DressCatalog, PageHero } from "@/components/dresses/DressCatalog";
import { getDresses } from "@/lib/data/queries";

export const metadata: Metadata = {
  title: "الأرواب",
  description: "أرواب عروس فاخرة من سatin وlace — مثالية لجلسات التحضير والتصوير.",
};

export default async function RobesPage() {
  const dresses = await getDresses({ category: "robes" });

  return (
    <>
      <PageHero
        title="الأرواب"
        description="أرواب عروس فاخرة لجلسات التحضير — أناقة من أول لحظة"
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <DressCatalog
            dresses={dresses}
            category="robes"
            title="الأرواب"
            description=""
          />
        </div>
      </section>
    </>
  );
}
