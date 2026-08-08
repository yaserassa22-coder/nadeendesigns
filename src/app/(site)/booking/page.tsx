import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/dresses/DressCatalog";
import { BookingForm } from "@/components/forms/BookingForm";
import { getSettings } from "@/lib/data/queries";
import { pickCmsOrUi } from "@/lib/cms/locale-text";
import { getStorefrontLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";
import { Calendar, Clock, MapPin } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getStorefrontLocale();
  const t = getDictionary(locale);
  return {
    title: t.pages.booking.title,
    description: t.pages.booking.metaDescription,
  };
}

export default async function BookingPage() {
  const locale = await getStorefrontLocale();
  const t = getDictionary(locale);
  const settings = await getSettings();
  const arFooter = getDictionary("ar").footer;
  const heFooter = getDictionary("he").footer;
  const enFooter = getDictionary("en").footer;

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
  const location = pickCmsOrUi(
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

  return (
    <>
      <PageHero
        title={t.pages.booking.title}
        description={t.pages.booking.heroDescription}
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-12 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="sticky top-28 space-y-6 rounded-2xl border border-beige-dark bg-beige/30 p-8">
                <h2 className="text-xl font-semibold text-charcoal">
                  {t.pages.booking.infoTitle}
                </h2>
                <div className="space-y-4 text-sm text-muted">
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                    <div>
                      <p className="font-medium text-charcoal">
                        {t.pages.booking.sessionDuration}
                      </p>
                      <p>{t.pages.booking.sessionDurationValue}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                    <div>
                      <p className="font-medium text-charcoal">
                        {t.pages.booking.workingHours}
                      </p>
                      <p>{workingHours}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                    <div>
                      <p className="font-medium text-charcoal">
                        {t.pages.booking.location}
                      </p>
                      <p>{location}</p>
                    </div>
                  </div>
                </div>
                <div className="decorative-line" />
                <p className="text-sm text-muted">{t.pages.booking.policyHint}</p>
              </div>
            </div>
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-beige-dark bg-white p-8 shadow-sm">
                <Suspense
                  fallback={
                    <p className="py-8 text-center text-muted">
                      {t.pages.booking.loadingForm}
                    </p>
                  }
                >
                  <BookingForm />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
