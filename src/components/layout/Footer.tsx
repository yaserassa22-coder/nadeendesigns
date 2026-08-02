import Link from "next/link";
import { Camera, Mail, MapPin, Phone } from "lucide-react";
import type { SiteSettings } from "@/types";
import { NAV_LINKS, SITE_NAME } from "@/lib/constants";

interface FooterProps {
  settings: SiteSettings;
}

export function Footer({ settings }: FooterProps) {
  return (
    <footer className="border-t border-beige-dark bg-charcoal text-ivory">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/">
              <span className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold tracking-widest text-gold">
                {SITE_NAME}
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-ivory/70">
              {settings.about_ar.slice(0, 120)}...
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wider text-gold uppercase">
              روابط سريعة
            </h3>
            <ul className="space-y-2">
              {NAV_LINKS.map((link) => (
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
              تواصل معنا
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
                {settings.address_ar}
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wider text-gold uppercase">
              ساعات العمل
            </h3>
            <p className="text-sm text-ivory/70">{settings.working_hours_ar}</p>
            <a
              href={settings.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-sm text-gold transition-colors hover:text-gold-light"
            >
              <Camera className="h-5 w-5" />
              {settings.instagram_handle}
            </a>
          </div>
        </div>

        <div className="decorative-line mt-12 opacity-30" />
        <p className="mt-8 text-center text-xs text-ivory/50">
          © {new Date().getFullYear()} {SITE_NAME}. جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  );
}
