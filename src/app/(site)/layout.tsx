import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { CartProvider } from "@/components/shop/CartProvider";
import {
  buildFooterNavLinks,
  buildStorefrontNav,
} from "@/lib/categories/nav";
import { getCategories } from "@/lib/data/categories";
import { getSettings } from "@/lib/data/queries";

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [settings, categories] = await Promise.all([
    getSettings(),
    getCategories(),
  ]);
  const nav = buildStorefrontNav(categories);

  return (
    <CartProvider>
      <Header primaryLinks={nav.primary} accessories={nav.accessories} />
      <main className="flex-1">{children}</main>
      <Footer
        settings={settings}
        navLinks={buildFooterNavLinks(nav.categoryLinks)}
      />
      <WhatsAppButton whatsapp={settings.whatsapp} />
    </CartProvider>
  );
}
