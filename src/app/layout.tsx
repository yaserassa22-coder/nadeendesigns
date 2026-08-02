import type { Metadata } from "next";
import { Cormorant_Garamond, Noto_Sans_Arabic } from "next/font/google";
import { OFFICIAL_INSTAGRAM_URL, SITE_NAME } from "@/lib/constants";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://nadeendesigns.com"
  ),
  title: {
    default: `${SITE_NAME} | بوتيك فساتين الزفاف الفاخرة`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Nadeen Designs — بوتيك فاخر لفساتين الزفاف والإيجار والطرحات وبرنص العروس وتصميم الفساتين الخاصة. احجزي موعدك اليوم واكتشفي مجموعتنا الحصرية.",
  keywords: [
    "فساتين زفاف",
    "فساتين للإيجار",
    "بوتيك عروس",
    "Nadeen Designs",
    "nadeendesign_",
    "إنستغرام Nadeen Designs",
    "طرحات زفاف",
    "برنص عروس",
    "تصميم فستان خاص",
    "فساتين نوف",
  ],
  openGraph: {
    type: "website",
    locale: "ar_SA",
    siteName: SITE_NAME,
    title: `${SITE_NAME} | بوتيك فساتين الزفاف الفاخرة`,
    description:
      "اكتشفي مجموعة فساتين الزفاف الفاخرة المصممة لتجعل يومك أكثر أناقة وتميزًا.",
  },
  alternates: {
    canonical: "/",
  },
  other: {
    "instagram:profile": OFFICIAL_INSTAGRAM_URL,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BridalShop",
    name: SITE_NAME,
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://nadeendesigns.com",
    sameAs: [OFFICIAL_INSTAGRAM_URL],
  };

  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cormorant.variable} ${notoArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ivory text-charcoal">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
