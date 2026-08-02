import type { Metadata } from "next";
import { PageHero } from "@/components/dresses/DressCatalog";
import { ContactForm } from "@/components/forms/ContactForm";
import { getSettings } from "@/lib/data/queries";
import {
  OFFICIAL_INSTAGRAM_HANDLE,
  OFFICIAL_INSTAGRAM_URL,
} from "@/lib/constants";
import { Camera, Mail, MapPin, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "اتصل بنا",
  description: "تواصلي مع Nadeen Designs — نحن هنا لمساعدتكِ في كل استفسار.",
};

export default async function ContactPage() {
  const settings = await getSettings();

  return (
    <>
      <PageHero
        title="اتصل بنا"
        description="نحن هنا لمساعدتكِ — لا تترددي في التواصل"
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-12 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-beige-dark bg-beige/30 p-8">
                <h2 className="text-xl font-semibold text-charcoal">
                  معلومات التواصل
                </h2>
                <ul className="mt-6 space-y-5">
                  <li className="flex items-start gap-4">
                    <Phone className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                    <div>
                      <p className="font-medium text-charcoal">الهاتف</p>
                      <a href={`tel:${settings.phone}`} className="text-muted" dir="ltr">
                        {settings.phone}
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                    <div>
                      <p className="font-medium text-charcoal">البريد</p>
                      <a href={`mailto:${settings.email}`} className="text-muted">
                        {settings.email}
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                    <div>
                      <p className="font-medium text-charcoal">العنوان</p>
                      <p className="text-muted">{settings.address_ar}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <Camera className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                    <div>
                      <p className="font-medium text-charcoal">إنستغرام</p>
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
                <h3 className="font-semibold text-charcoal">ساعات العمل</h3>
                <p className="mt-2 text-muted">{settings.working_hours_ar}</p>
              </div>
            </div>
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-beige-dark bg-white p-8 shadow-sm">
                <h2 className="mb-6 text-xl font-semibold text-charcoal">
                  أرسلي رسالة
                </h2>
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
