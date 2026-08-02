import type { Metadata } from "next";
import { PageHero } from "@/components/dresses/DressCatalog";
import { ShopCatalog } from "@/components/shop/ShopCatalog";
import { getVeils } from "@/lib/data/shop-queries";
import { VEIL_CATEGORY_OPTIONS } from "@/types/shop";

export const metadata: Metadata = {
  title: "الطرحات",
  description: "طرحات زفاف فاخرة من Nadeen Designs مع إمكانية التخصيص والشراء.",
};

export default async function VeilsPage() {
  const veils = await getVeils();

  return (
    <>
      <PageHero
        title="الطرحات"
        description="طرحات فاخرة تكمل إطلالتكِ — خصّصي الكتابة واطلبي تغليف هدية أنيق."
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <ShopCatalog
            items={veils}
            basePath="/veils"
            showCategoryFilter
            categoryOptions={[...VEIL_CATEGORY_OPTIONS]}
          />
        </div>
      </section>
    </>
  );
}
