import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/dresses/DressCatalog";
import { Button } from "@/components/ui/Button";
import { getSettings } from "@/lib/data/queries";
import { Award, Heart, Sparkles, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "من نحن",
  description:
    "تعرفي على Nadeen Designs — بوتيك فاخر متخصص في فساتين الزفاف والإكسسوارات منذ أكثر من 10 سنوات.",
};

const values = [
  {
    icon: Heart,
    title: "شغف بالتفاصيل",
    description: "كل غرزة وكل تطريز يعكس حبنا للجمال والأناقة",
  },
  {
    icon: Sparkles,
    title: "تصاميم حصرية",
    description: "مجموعات فريدة لا تجدينها في أي مكان آخر",
  },
  {
    icon: Users,
    title: "خدمة شخصية",
    description: "فريق متخصص يرافقكِ في كل خطوة من رحلتكِ",
  },
  {
    icon: Award,
    title: "جودة عالمية",
    description: "أقمشة فاخرة من أرقى الموردين العالميين",
  },
];

export default async function AboutPage() {
  const settings = await getSettings();

  return (
    <>
      <PageHero title="من نحن" description="قصة شغف بالجمال والأناقة" />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl">
              <Image
                src="https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80"
                alt="بوتيك Nadeen Designs"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.3em] text-gold uppercase">
                Our Story
              </p>
              <h2 className="mt-4 text-3xl font-bold text-charcoal md:text-4xl">
                Nadeen Designs
              </h2>
              <div className="decorative-line mt-4 w-24" />
              <p className="mt-6 text-lg leading-relaxed text-muted">
                {settings.about_ar}
              </p>
              <p className="mt-4 leading-relaxed text-muted">
                منذ تأسيسنا، ساعدنا أكثر من 500 عروس في العثور على فستان أحلامها.
                نؤمن بأن كل عروس تستحق تجربة فريدة وشخصية تعكس شخصيتها وجمالها
                الداخلي.
              </p>
              <Link href="/booking" className="mt-8 inline-block">
                <Button size="lg">احجزي زيارتكِ</Button>
              </Link>
            </div>
          </div>

          <div className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <div
                key={value.title}
                className="rounded-2xl border border-beige-dark bg-white p-6 text-center"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 text-gold">
                  <value.icon className="h-7 w-7" />
                </div>
                <h3 className="mt-4 font-semibold text-charcoal">{value.title}</h3>
                <p className="mt-2 text-sm text-muted">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
