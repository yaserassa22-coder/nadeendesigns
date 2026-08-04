import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { CartProvider } from "@/components/shop/CartProvider";
import { CustomerAuthProvider } from "@/components/auth/CustomerAuthProvider";
import {
  buildFooterNavLinks,
  buildStorefrontNav,
} from "@/lib/categories/nav";
import { getStorefrontCategories } from "@/lib/data/categories";
import { getSettings } from "@/lib/data/queries";

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [settings, categories] = await Promise.all([
    getSettings(),
    getStorefrontCategories(),
  ]);
  const nav = buildStorefrontNav(categories);

  return (
    <CartProvider>
      <CustomerAuthProvider>
        <Header items={nav.items} />
        <main className="flex-1">{children}</main>
        <Footer
          settings={settings}
          navLinks={buildFooterNavLinks(nav.categoryLinks)}
        />
        <WhatsAppButton whatsapp={settings.whatsapp} />
      </CustomerAuthProvider>
    </CartProvider>
  );
}
