import { Hero } from "@/components/home/Hero";
import { FeaturedDresses } from "@/components/home/FeaturedDresses";
import { ServicesSection } from "@/components/home/ServicesSection";
import { InstagramSection } from "@/components/home/InstagramSection";
import { CTASection } from "@/components/home/CTASection";
import { getFeaturedDresses, getSettings } from "@/lib/data/queries";

export default async function HomePage() {
  const [settings, featuredDresses] = await Promise.all([
    getSettings(),
    getFeaturedDresses(3),
  ]);

  return (
    <>
      <Hero settings={settings} />
      <FeaturedDresses dresses={featuredDresses} />
      <ServicesSection />
      <InstagramSection
        instagramUrl={settings.instagram_url}
        handle={settings.instagram_handle}
      />
      <CTASection />
    </>
  );
}
