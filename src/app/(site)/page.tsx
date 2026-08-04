import { Hero } from "@/components/home/Hero";
import { FeaturedDresses } from "@/components/home/FeaturedDresses";
import { CustomDesignSection } from "@/components/home/CustomDesignSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { InstagramSection } from "@/components/home/InstagramSection";
import { CTASection } from "@/components/home/CTASection";
import { getStorefrontCategories } from "@/lib/data/categories";
import { getFeaturedDresses, getSettings } from "@/lib/data/queries";
import { getBridalAccessoriesProducts } from "@/lib/data/shop-queries";

export default async function HomePage() {
  const [featuredDresses, categories, settings, accessoryProducts] =
    await Promise.all([
      getFeaturedDresses(3),
      getStorefrontCategories(),
      getSettings(),
      getBridalAccessoriesProducts(),
    ]);

  return (
    <>
      <Hero settings={settings} />
      <FeaturedDresses dresses={featuredDresses} />
      <CustomDesignSection />
      {/* Category cards: src/components/home/ServicesSection.tsx */}
      <ServicesSection
        categories={categories}
        accessoryProducts={accessoryProducts}
      />
      <InstagramSection />
      <CTASection />
    </>
  );
}
