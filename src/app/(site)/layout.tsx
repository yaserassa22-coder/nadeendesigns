import { Header } from "@/components/layout/Header";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { CookieConsentBanner } from "@/components/legal/CookieConsentBanner";
import { StorefrontAnalytics } from "@/components/legal/StorefrontAnalytics";
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
import { getStorefrontLocale } from "@/lib/i18n/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Maintenance is gated in middleware. Use the request cache (not force)
  // so product navigations do not wait on a second store-settings roundtrip.
  const store = await getStoreSettings();
  if (store.security.maintenance_mode) {
    redirect("/maintenance");
  }

  const locale = await getStorefrontLocale();
  const [settings, categories] = await Promise.all([
    getSettings(),
    getStorefrontCategories(),
  ]);
  const nav = buildStorefrontNav(categories, locale);
  const storeName = getStoreDisplayName(store);
  const whatsapp = store.contact.whatsapp || settings.whatsapp;
  const phone = store.contact.phone || settings.phone;
  const email = store.contact.email || settings.email;
  const analyticsConfigured =
    (Boolean(store.seo.google_analytics_id.trim()) &&
      store.seo.google_analytics_enabled) ||
    (Boolean(store.seo.meta_pixel_id.trim()) && store.seo.meta_pixel_enabled);

  return (
    <StorefrontProviders>
      <div data-storefront className="min-h-screen">
        <StorefrontAnalytics
          bannerEnabled={store.legal.cookie_banner_enabled}
          googleAnalyticsId={store.seo.google_analytics_id}
          googleAnalyticsEnabled={store.seo.google_analytics_enabled}
          metaPixelId={store.seo.meta_pixel_id}
          metaPixelEnabled={store.seo.meta_pixel_enabled}
        />
        <AnnouncementBar
          announcement={store.announcement}
          locale={locale}
        />
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
            address_he:
              store.general.business_address_he || settings.address_he,
            address_en:
              store.general.business_address || settings.address_en,
            working_hours_ar:
              store.general.working_hours_ar || settings.working_hours_ar,
            working_hours_he:
              store.general.working_hours_he || settings.working_hours_he,
            working_hours_en:
              store.general.working_hours || settings.working_hours_en,
            instagram_url:
              store.social.instagram_url ||
              store.contact.instagram_url ||
              settings.instagram_url,
          }}
          navLinks={buildFooterNavLinks(nav.categoryLinks, locale)}
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
        <CookieConsentBanner
          enabled={store.legal.cookie_banner_enabled}
          analyticsConfigured={analyticsConfigured}
        />
      </div>
    </StorefrontProviders>
  );
}
