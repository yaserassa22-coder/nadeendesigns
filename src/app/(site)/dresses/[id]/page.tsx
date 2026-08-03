import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDressById, getDresses } from "@/lib/data/queries";
import { featuredImage } from "@/lib/products/featured-image";
import { getDressColorLabel } from "@/lib/colors";
import { getDressStyleLabel } from "@/lib/styles";
import {
  categoryToServiceType,
  supportsPersonalization,
} from "@/lib/personalization";
import { DRESS_CATEGORY_HREFS, DRESS_CATEGORY_LABELS } from "@/types";
import { Button } from "@/components/ui/Button";
import { PersonalizationForm } from "@/components/dresses/PersonalizationForm";
import { RelatedProducts } from "@/components/dresses/RelatedProducts";
import { ProductDetailLayout } from "@/components/product/ProductDetailLayout";
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
  const related = (await getDresses({ category: dress.category }))
    .filter((d) => d.id !== dress.id && d.is_available)
    .slice(0, 3);

  return (
    <ProductDetailLayout
      images={dress.images}
      name={dress.name_ar}
      categoryLabel={DRESS_CATEGORY_LABELS[dress.category]}
      price={price}
      priceSuffix={isRental ? "/ إيجار" : undefined}
      description={dress.description_ar}
      available={dress.is_available}
      meta={
        <>
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
        </>
      }
      actions={
        <>
          {!personalizationType && (
            <>
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
            </>
          )}
          {personalizationType && (
            <Link href={DRESS_CATEGORY_HREFS[dress.category]}>
              <Button variant="outline" size="lg">
                العودة للمجموعة
              </Button>
            </Link>
          )}
        </>
      }
      below={
        personalizationType ? (
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
        ) : null
      }
      related={<RelatedProducts dresses={related} />}
    />
  );
}
