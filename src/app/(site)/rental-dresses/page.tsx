import type { Metadata } from "next";
import { DressCatalog, PageHero } from "@/components/dresses/DressCatalog";
import { getDresses } from "@/lib/data/queries";

export const metadata: Metadata = {
  title: "فساتين للإيجار",
  description:
    "فساتين زفاف للإيجار بأسعار مناسبة — إطلالة أحلامكِ مع خدمة تنظيف وصيانة مجانية.",
};

export default async function RentalDressesPage() {
  const dresses = await getDresses({ category: "rental" });

  return (
    <>
      <PageHero
        title="فساتين للإيجار"
        description="إطلالة فاخرة بأسعار مناسبة — اختاري من مجموعتنا الحصرية للإيجار"
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <DressCatalog
            dresses={dresses}
            category="rental"
            title="فساتين للإيجار"
            description=""
          />
        </div>
      </section>
    </>
  );
}
