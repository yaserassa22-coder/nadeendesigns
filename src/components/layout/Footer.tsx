"use client";

import Link from "next/link";
import { Camera, Mail, MapPin, Phone } from "lucide-react";
import type { SiteSettings } from "@/types";
import type { NavLink } from "@/lib/categories/nav";
import {
  NAV_LINKS,
  OFFICIAL_INSTAGRAM_HANDLE,
  OFFICIAL_INSTAGRAM_URL,
  SITE_NAME,
} from "@/lib/constants";
import { pickCmsOrUi } from "@/lib/cms/locale-text";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getDictionary } from "@/lib/i18n";

interface FooterProps {
  settings: SiteSettings;
  navLinks?: NavLink[];
  storeName?: string;
  logoUrl?: string;
  social?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
}

const LEGAL_LINKS = [
  { href: "/legal/terms", labelKey: "terms" as const },
  { href: "/legal/privacy", labelKey: "privacy" as const },
  { href: "/legal/returns", labelKey: "returns" as const },
  { href: "/legal/shipping", labelKey: "shipping" as const },
] as const;

export function Footer({
  settings,
  navLinks,
  storeName = SITE_NAME,
  logoUrl,
  social,
}: FooterProps) {
  const { t, locale } = useLocale();
  const ar = getDictionary("ar").footer;
  const he = getDictionary("he").footer;
  const en = getDictionary("en").footer;
  const links = navLinks?.length ? navLinks : [...NAV_LINKS];
  const instagramUrl =
    social?.instagram || settings.instagram_url || OFFICIAL_INSTAGRAM_URL;
  let instagramHandle = OFFICIAL_INSTAGRAM_HANDLE;
  try {
    const path = new URL(instagramUrl).pathname.replace(/\//g, "");
    if (path) instagramHandle = `@${path}`;
  } catch {
    /* keep default */
  }

  const aboutBlurb = pickCmsOrUi(
    {
      ar: settings.about_ar,
      he: settings.about_he,
      en: settings.about_en,
    },
    locale,
    { ar: ar.aboutBlurb, he: he.aboutBlurb, en: en.aboutBlurb }
  );

  const address = pickCmsOrUi(
    {
      ar: settings.address_ar,
      he: settings.address_he,
      en: settings.address_en,
    },
    locale,
    { ar: ar.addressDefault, he: he.addressDefault, en: en.addressDefault }
  );

  const hours = pickCmsOrUi(
    {
      ar: settings.working_hours_ar,
      he: settings.working_hours_he,
      en: settings.working_hours_en,
    },
    locale,
    { ar: ar.hoursDefault, he: he.hoursDefault, en: en.hoursDefault }
  );

  return (
    <footer
      data-storefront-chrome
      className="border-t border-beige-dark bg-charcoal text-ivory"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={storeName}
                  className="h-10 object-contain"
                />
              ) : (
                <span className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold tracking-widest text-gold">
                  {storeName}
                </span>
              )}
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-ivory/70">
              {aboutBlurb.slice(0, 160)}
              {aboutBlurb.length > 160 ? "..." : ""}
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wider text-gold uppercase">
              {t.footer.quickLinks}
            </h3>
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ivory/70 transition-colors hover:text-gold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wider text-gold uppercase">
              {t.footer.legal}
            </h3>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-ivory/70 transition-colors hover:text-gold"
                  >
                    {t.footer[item.labelKey]}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-ivory/70 transition-colors hover:text-gold"
                >
                  {t.footer.contact}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wider text-gold uppercase">
              {t.footer.contactUs}
            </h3>
            <ul className="space-y-3 text-sm text-ivory/70">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-gold" />
                <a href={`tel:${settings.phone}`} dir="ltr">
                  {settings.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-gold" />
                <a href={`mailto:${settings.email}`}>{settings.email}</a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                {address}
              </li>
            </ul>
            <h3 className="mb-3 mt-8 text-sm font-semibold tracking-wider text-gold uppercase">
              {t.footer.workingHours}
            </h3>
            <p className="text-sm text-ivory/70">{hours}</p>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-sm text-gold transition-colors hover:text-gold-light"
            >
              <Camera className="h-5 w-5" />
              <span dir="ltr">{instagramHandle}</span>
            </a>
          </div>
        </div>

        <div className="decorative-line mt-12 opacity-30" />

        <div className="mt-8 flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <p className="text-center text-xs text-ivory/50 md:text-start">
            © {new Date().getFullYear()} {storeName}. {t.common.allRightsReserved}
          </p>
          <nav
            aria-label={t.footer.legalAria}
            className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 text-xs text-ivory/55"
          >
            {LEGAL_LINKS.map((item, i) => (
              <span key={item.href} className="inline-flex items-center">
                {i > 0 ? (
                  <span aria-hidden className="mx-2 text-ivory/25">
                    ·
                  </span>
                ) : null}
                <Link
                  href={item.href}
                  className="transition-colors hover:text-gold"
                >
                  {t.footer[item.labelKey]}
                </Link>
              </span>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
