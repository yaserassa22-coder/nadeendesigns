import type { Metadata, Viewport } from "next";
import {
  Amiri,
  Cormorant_Garamond,
  Noto_Sans_Arabic,
  Noto_Sans_Hebrew,
} from "next/font/google";
import { OFFICIAL_INSTAGRAM_URL, SITE_NAME } from "@/lib/constants";
import { getStoreSettings } from "@/lib/store/settings";
import {
  getStorefrontLocale,
  getStorefrontLocales,
} from "@/lib/i18n/server";
import { localeDir, localeHtmlLang, parseLocale } from "@/lib/i18n";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

/** Premium Arabic display — used for hero / editorial headlines */
const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  display: "swap",
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const notoHebrew = Noto_Sans_Hebrew({
  variable: "--font-noto-hebrew",
  subsets: ["hebrew"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const FALLBACK_DESCRIPTION =
  "Nadeen Designs — بوتيك فاخر لفساتين الزفاف والإيجار وطرحة العروس وبرنص العروس وتصميم الفساتين الخاصة. احجزي موعدك اليوم واكتشفي مجموعتنا الحصرية.";

/** Brand gold status bar / chrome; keeps default Next viewport sizing. */
export const viewport: Viewport = {
  themeColor: "#c9a96e",
};

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStoreSettings();
  const seo = store.seo;
  const title =
    seo.title?.trim() || `${SITE_NAME} | بوتيك فساتين الزفاف الفاخرة`;
  const description = seo.description?.trim() || FALLBACK_DESCRIPTION;
  const keywords = seo.keywords
    ? seo.keywords
        .split(/[,،]/)
        .map((k) => k.trim())
        .filter(Boolean)
    : [
        "فساتين زفاف",
        "فساتين للإيجار",
        "بوتيك عروس",
        "Nadeen Designs",
        "طرحة العروس",
        "برنص العروس",
      ];

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://nadeendesigns.com"
    ),
    title: {
      default: title,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    keywords,
    applicationName: "Nadeen Designs",
    appleWebApp: {
      capable: true,
      title: "Nadeen Designs",
      statusBarStyle: "default",
    },
    icons: {
      icon: [
        { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [
        {
          url: "/icons/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
    openGraph: {
      type: "website",
      locale: "ar_SA",
      siteName: SITE_NAME,
      title,
      description,
      ...(seo.og_image_url
        ? { images: [{ url: seo.og_image_url }] }
        : {}),
    },
    alternates: {
      canonical: "/",
    },
    other: {
      "instagram:profile": OFFICIAL_INSTAGRAM_URL,
      "mobile-web-app-capable": "yes",
    },
    robots: {
      index: seo.robots_index !== false,
      follow: seo.robots_follow !== false,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [locale, storefrontLocales, store] = await Promise.all([
    getStorefrontLocale(),
    getStorefrontLocales(),
    getStoreSettings(),
  ]);
  const storeDefault = parseLocale(store.general.language);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BridalShop",
    name: SITE_NAME,
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://nadeendesigns.com",
    sameAs: [OFFICIAL_INSTAGRAM_URL],
  };

  return (
    <html
      lang={localeHtmlLang(locale)}
      dir={localeDir(locale)}
      data-locale={locale}
      className={`${cormorant.variable} ${amiri.variable} ${notoArabic.variable} ${notoHebrew.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ivory text-charcoal">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <LocaleProvider
          initialLocale={locale}
          allowedLocales={storefrontLocales}
          storeDefaultLocale={storeDefault}
        >
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
