import type { Metadata } from "next";
import { PageHero } from "@/components/dresses/DressCatalog";
import { ShopCatalog } from "@/components/shop/ShopCatalog";
import { getBridalRobes } from "@/lib/data/shop-queries";

export const metadata: Metadata = {
  title: "برنس العروس",
  description: "برنس عروس فاخر من Nadeen Designs مع تخصيص الكتابة والشراء.",
};

export default async function RobesPage() {
  const robes = await getBridalRobes();

  return (
    <>
      <PageHero
        title="برنس العروس"
        description="برنس فاخر لجلسات التحضير والتصوير — خصّصي الكتابة واطلبي تغليف هدية."
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <ShopCatalog items={robes} basePath="/robes" />
        </div>
      </section>
    </>
  );
}
