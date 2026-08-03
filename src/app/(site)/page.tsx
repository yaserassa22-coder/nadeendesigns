import { Hero } from "@/components/home/Hero";
import { FeaturedDresses } from "@/components/home/FeaturedDresses";
import { CustomDesignSection } from "@/components/home/CustomDesignSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { InstagramSection } from "@/components/home/InstagramSection";
import { CTASection } from "@/components/home/CTASection";
import { getVisibleCategories } from "@/lib/data/categories";
import { getFeaturedDresses } from "@/lib/data/queries";

export default async function HomePage() {
  const [featuredDresses, categories] = await Promise.all([
    getFeaturedDresses(3),
    getVisibleCategories(),
  ]);

  return (
    <>
      <Hero />
      <FeaturedDresses dresses={featuredDresses} />
      <CustomDesignSection />
      {/* Category cards: src/components/home/ServicesSection.tsx */}
      <ServicesSection categories={categories} />
      <InstagramSection />
      <CTASection />
    </>
  );
}
