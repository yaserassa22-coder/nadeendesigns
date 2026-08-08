import type { Metadata } from "next";
import { PageHero } from "@/components/dresses/DressCatalog";
import { ContactForm } from "@/components/forms/ContactForm";
import { getSettings } from "@/lib/data/queries";
import {
  OFFICIAL_INSTAGRAM_HANDLE,
  OFFICIAL_INSTAGRAM_URL,
} from "@/lib/constants";
import { pickCmsOrUi } from "@/lib/cms/locale-text";
import { getStorefrontLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";
import { Camera, Mail, MapPin, Phone } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getStorefrontLocale();
  const t = getDictionary(locale);
  return {
    title: t.pages.contact.title,
    description: t.pages.contact.metaDescription,
  };
}

export default async function ContactPage() {
  const locale = await getStorefrontLocale();
  const t = getDictionary(locale);
  const settings = await getSettings();
  const arFooter = getDictionary("ar").footer;
  const heFooter = getDictionary("he").footer;
  const enFooter = getDictionary("en").footer;

  const address = pickCmsOrUi(
    {
      ar: settings.address_ar,
      he: settings.address_he,
      en: settings.address_en,
    },
    locale,
    {
      ar: arFooter.addressDefault,
      he: heFooter.addressDefault,
      en: enFooter.addressDefault,
    }
  );
  const workingHours = pickCmsOrUi(
    {
      ar: settings.working_hours_ar,
      he: settings.working_hours_he,
      en: settings.working_hours_en,
    },
    locale,
    {
      ar: arFooter.hoursDefault,
      he: heFooter.hoursDefault,
      en: enFooter.hoursDefault,
    }
  );

  return (
    <>
      <PageHero
        title={t.pages.contact.title}
        description={t.pages.contact.heroDescription}
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-12 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-beige-dark bg-beige/30 p-8">
                <h2 className="text-xl font-semibold text-charcoal">
                  {t.pages.contact.infoTitle}
                </h2>
                <ul className="mt-6 space-y-5">
                  <li className="flex items-start gap-4">
                    <Phone className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                    <div>
                      <p className="font-medium text-charcoal">{t.pages.contact.phone}</p>
                      <a href={`tel:${settings.phone}`} className="text-muted" dir="ltr">
                        {settings.phone}
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                    <div>
                      <p className="font-medium text-charcoal">{t.pages.contact.email}</p>
                      <a href={`mailto:${settings.email}`} className="text-muted">
                        {settings.email}
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                    <div>
                      <p className="font-medium text-charcoal">{t.pages.contact.address}</p>
                      <p className="text-muted">{address}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <Camera className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                    <div>
                      <p className="font-medium text-charcoal">{t.pages.contact.instagram}</p>
                      <a
                        href={OFFICIAL_INSTAGRAM_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted hover:text-gold"
                        dir="ltr"
                      >
                        {OFFICIAL_INSTAGRAM_HANDLE}
                      </a>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-beige-dark bg-white p-8">
                <h3 className="font-semibold text-charcoal">{t.pages.contact.workingHours}</h3>
                <p className="mt-2 text-muted">{workingHours}</p>
              </div>
            </div>
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-beige-dark bg-white p-8 shadow-sm">
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
