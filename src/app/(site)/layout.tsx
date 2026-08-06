import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { StorefrontProviders } from "@/components/providers/StorefrontProviders";
import {
  buildFooterNavLinks,
  buildStorefrontNav,
} from "@/lib/categories/nav";
import { getStorefrontCategories } from "@/lib/data/categories";
import { getSettings } from "@/lib/data/queries";
import {
  getStoreDisplayName,
  getStoreSettings,
} from "@/lib/store/settings";

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [settings, categories, store] = await Promise.all([
    getSettings(),
    getStorefrontCategories(),
    getStoreSettings(),
  ]);
  const nav = buildStorefrontNav(categories);
  const storeName = getStoreDisplayName(store);
  const whatsapp = store.contact.whatsapp || settings.whatsapp;
  const phone = store.contact.phone || settings.phone;
  const email = store.contact.email || settings.email;

  return (
    <StorefrontProviders>
      <Header
        items={nav.items}
        storeName={storeName}
        logoUrl={store.general.logo_url || undefined}
      />
      <main className="flex-1">{children}</main>
      <Footer
        settings={{
          ...settings,
          phone,
          email,
          whatsapp,
          address_ar:
            store.contact.location_ar || settings.address_ar,
          working_hours_ar:
            store.general.working_hours_ar || settings.working_hours_ar,
          instagram_url:
            store.social.instagram_url ||
            store.contact.instagram_url ||
            settings.instagram_url,
        }}
        navLinks={buildFooterNavLinks(nav.categoryLinks)}
        storeName={storeName}
        logoUrl={store.general.logo_url || undefined}
        social={{
          instagram:
            store.social.instagram_url || store.contact.instagram_url,
          facebook: store.social.facebook_url || store.contact.facebook_url,
          tiktok: store.social.tiktok_url || store.contact.tiktok_url,
        }}
      />
      <WhatsAppButton whatsapp={whatsapp} />
    </StorefrontProviders>
  );
}
