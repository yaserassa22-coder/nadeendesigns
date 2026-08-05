import { Hero } from "@/components/home/Hero";
import { FeaturedDresses } from "@/components/home/FeaturedDresses";
import { CustomDesignSection } from "@/components/home/CustomDesignSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { InstagramSection } from "@/components/home/InstagramSection";
import { CTASection } from "@/components/home/CTASection";
import { getHomepageCategories } from "@/lib/data/categories";
import { getFeaturedDresses, getSettings } from "@/lib/data/queries";
import { getBridalAccessoriesProducts } from "@/lib/data/shop-queries";
import { getStoreSettings } from "@/lib/store/settings";

export default async function HomePage() {
  const [featuredDresses, categories, settings, accessoryProducts, store] =
    await Promise.all([
      getFeaturedDresses(3),
      getHomepageCategories(),
      getSettings(),
      getBridalAccessoriesProducts(),
      getStoreSettings(),
    ]);

  const hp = store.homepage;

  return (
    <>
      {hp.hero ? <Hero settings={settings} /> : null}
      {hp.featured_products ? (
        <FeaturedDresses dresses={featuredDresses} />
      ) : null}
      {hp.collections ? <CustomDesignSection /> : null}
      {hp.featured_categories ? (
        <ServicesSection
          categories={categories}
          accessoryProducts={accessoryProducts}
        />
      ) : null}
      {hp.instagram ? <InstagramSection /> : null}
      <CTASection />
    </>
  );
}
