import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDressById, getDresses } from "@/lib/data/queries";
import { featuredImage } from "@/lib/products/featured-image";
import { getDressColorLabel } from "@/lib/colors";
import { getDressStyleLabel } from "@/lib/styles";
import { formatPrice } from "@/lib/utils";
import {
  categoryToServiceType,
  supportsPersonalization,
} from "@/lib/personalization";
import { DRESS_CATEGORY_HREFS, DRESS_CATEGORY_LABELS } from "@/types";
import { Button } from "@/components/ui/Button";
import { PersonalizationForm } from "@/components/dresses/PersonalizationForm";
import { RelatedProducts } from "@/components/dresses/RelatedProducts";
import { Calendar, Ruler, Palette } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const dress = await getDressById(id);
  if (!dress) return { title: "غير موجود" };
  const og = featuredImage(dress.images);
  return {
    title: dress.name_ar,
    description: dress.description_ar,
    openGraph: { images: og ? [og] : [] },
  };
}

export default async function DressDetailPage({ params }: Props) {
  const { id } = await params;
  const dress = await getDressById(id);
  if (!dress) notFound();

  const price = dress.price ?? dress.rental_price;
  const isRental =
    dress.category === "rental" || (!dress.price && dress.rental_price);
  const personalizationType = supportsPersonalization(dress.category)
    ? dress.category
    : null;
  const hero = featuredImage(dress.images);
  const related = (await getDresses({ category: dress.category }))
    .filter((d) => d.id !== dress.id && d.is_available)
    .slice(0, 3);

  return (
    <section className="pt-28 pb-16 md:pt-36 md:pb-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="relative aspect-[3/4] overflow-hidden rounded-3xl">
              {hero && (
                <Image
                  src={hero}
                  alt={dress.name_ar}
                  fill
                  priority
                  className="object-cover"
                />
              )}
            </div>
            {dress.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {dress.images.slice(1).map((img) => (
                  <div
                    key={img}
                    className="relative aspect-square overflow-hidden rounded-xl"
                  >
                    <Image src={img} alt="" fill className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-gold">
              {DRESS_CATEGORY_LABELS[dress.category]}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-charcoal md:text-4xl">
              {dress.name_ar}
            </h1>
            {price && (
              <p
                className="mt-4 font-[family-name:var(--font-cormorant)] text-3xl text-gold"
                dir="ltr"
              >
                {formatPrice(price)}
                {isRental && (
                  <span className="ml-2 text-base text-muted" dir="rtl">
                    / إيجار
                  </span>
                )}
              </p>
            )}

            <p className="mt-6 leading-relaxed text-muted">
              {dress.description_ar}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              {dress.style && (
                <span className="inline-flex items-center gap-2 rounded-full bg-beige px-4 py-2 text-sm">
                  <Palette className="h-4 w-4 text-gold" />
                  {getDressStyleLabel(dress.style)}
                </span>
              )}
              {dress.size && (
                <span className="inline-flex items-center gap-2 rounded-full bg-beige px-4 py-2 text-sm">
                  <Ruler className="h-4 w-4 text-gold" />
                  {dress.size}
                </span>
              )}
              {dress.color && (
                <span className="inline-flex items-center gap-2 rounded-full bg-beige px-4 py-2 text-sm">
                  {getDressColorLabel(dress.color)}
                </span>
              )}
            </div>

            {!personalizationType && (
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href={`/booking?dress=${dress.id}`}>
                  <Button size="lg">
                    <Calendar className="h-4 w-4" />
                    احجزي موعدًا
                  </Button>
                </Link>
                <Link href={DRESS_CATEGORY_HREFS[dress.category]}>
                  <Button variant="outline" size="lg">
                    العودة للمجموعة
                  </Button>
                </Link>
              </div>
            )}

            {personalizationType && (
              <div className="mt-10">
                <Link href={DRESS_CATEGORY_HREFS[dress.category]}>
                  <Button variant="outline" size="lg">
                    العودة للمجموعة
                  </Button>
                </Link>
              </div>
            )}

            {!dress.is_available && (
              <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                هذا المنتج غير متوفر حاليًا
              </p>
            )}
          </div>
        </div>

        {personalizationType && (
          <div className="mx-auto mt-4 max-w-3xl lg:mt-8">
            <PersonalizationForm
              dress={dress}
              productType={personalizationType}
            />
            <p className="mt-4 text-center text-xs text-muted">
              أو{" "}
              <Link
                href={`/booking?dress=${dress.id}&service=${categoryToServiceType(personalizationType)}`}
                className="text-gold underline-offset-2 hover:underline"
              >
                انتقلي للحجز مباشرة
              </Link>
            </p>
          </div>
        )}

        <RelatedProducts dresses={related} />
      </div>
    </section>
  );
}
