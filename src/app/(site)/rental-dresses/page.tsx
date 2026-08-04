import type { Metadata } from "next";
import { DressCatalog, PageHero } from "@/components/dresses/DressCatalog";
import { getCategoryBySlug } from "@/lib/data/categories";
import {
  getDresses,
  getDressesForCategory,
} from "@/lib/data/queries";

export const metadata: Metadata = {
  title: "فساتين للإيجار",
  description:
    "فساتين زفاف للإيجار بأسعار مناسبة — إطلالة أحلامكِ مع خدمة تنظيف وصيانة مجانية.",
};

export default async function RentalDressesPage() {
  const category = await getCategoryBySlug("rental-dresses");
  const dresses = category
    ? await getDressesForCategory(category)
    : await getDresses({ category: "rental" });

  return (
    <>
      <PageHero
        title={category?.name_ar || "فساتين للإيجار"}
        description={
          category?.description_ar?.trim() ||
          "إطلالة فاخرة بأسعار مناسبة — اختاري من مجموعتنا الحصرية للإيجار"
        }
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <DressCatalog
            dresses={dresses}
            title={category?.name_ar || "فساتين للإيجار"}
            description=""
          />
        </div>
      </section>
    </>
  );
}
