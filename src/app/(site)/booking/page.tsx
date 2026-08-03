import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/dresses/DressCatalog";
import { BookingForm } from "@/components/forms/BookingForm";
import { getSettings } from "@/lib/data/queries";
import { Calendar, Clock, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "احجزي موعدًا",
  description:
    "احجزي موعدكِ في Nadeen Designs — فساتين زفاف، إيجار، تصميم خاص، طرحة العروس، أو برنس العروس.",
};

export default async function BookingPage() {
  const settings = await getSettings();

  return (
    <>
      <PageHero
        title="احجزي موعدًا"
        description="احجزي موعدكِ الخاص واستمتعي بتجربة فاخرة في بوتيكنا"
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-12 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="sticky top-28 space-y-6 rounded-2xl border border-beige-dark bg-beige/30 p-8">
                <h2 className="text-xl font-semibold text-charcoal">
                  معلومات الحجز
                </h2>
                <div className="space-y-4 text-sm text-muted">
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                    <div>
                      <p className="font-medium text-charcoal">مدة الجلسة</p>
                      <p>60-90 دقيقة</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                    <div>
                      <p className="font-medium text-charcoal">ساعات العمل</p>
                      <p>{settings.working_hours_ar}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                    <div>
                      <p className="font-medium text-charcoal">الموقع</p>
                      <p>{settings.address_ar}</p>
                    </div>
                  </div>
                </div>
                <div className="decorative-line" />
                <p className="text-sm text-muted">
                  يرجى الحضور قبل 10 دقائق من الموعد. للإلغاء أو التعديل،
                  تواصلي معنا قبل 24 ساعة على الأقل.
                </p>
              </div>
            </div>
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-beige-dark bg-white p-8 shadow-sm">
                <Suspense
                  fallback={
                    <p className="py-8 text-center text-muted">
                      جاري تحميل نموذج الحجز...
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
