import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDressById, getDresses } from "@/lib/data/queries";
import { getCategories, getCategoryById } from "@/lib/data/categories";
import { resolveCategoryHref } from "@/lib/categories/href";
import { findCategoryMatch } from "@/lib/dresses/category";
import { featuredImage } from "@/lib/products/featured-image";
import {
  getProductPrimaryAction,
  resolveProductCommerceType,
} from "@/lib/products/primary-action";
import { getDressColorLabel } from "@/lib/colors";
import { getDressStyleLabel } from "@/lib/styles";
import { Button } from "@/components/ui/Button";
import { RelatedProducts } from "@/components/dresses/RelatedProducts";
import { ProductDetailLayout } from "@/components/product/ProductDetailLayout";
import { ProductPrimaryCta } from "@/components/product/ProductPrimaryCta";
import { WishlistButton } from "@/components/auth/WishlistButton";
import { TrackRecentlyViewed } from "@/components/shop/TrackRecentlyViewed";
import { Ruler, Palette } from "lucide-react";
import { resolveStorefrontProductExperience } from "@/lib/products/resolve-storefront-experience";

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

  const categories = await getCategories();
  const category =
    (dress.category_id
      ? await getCategoryById(dress.category_id)
      : null) ??
    findCategoryMatch(categories, dress.category) ??
    null;

  const categoryLabel = category?.name_ar ?? dress.category;
  const categoryHref = category
    ? resolveCategoryHref(category)
    : "/wedding-dresses";

  // CTA + rental presentation from product_type ONLY (never category name/slug)
  const commerceType = resolveProductCommerceType(dress.product_type);
  const primaryAction = getProductPrimaryAction(commerceType);
  const experience = await resolveStorefrontProductExperience({
    productId: dress.id,
    productType: commerceType,
    categoryId: dress.category_id ?? category?.id ?? null,
    collectionId: dress.collection_id ?? null,
    order_options_config: dress.order_options_config,
    extra_services_config: dress.extra_services_config,
    experience_config: dress.experience_config,
  });
  const related = (
    await getDresses(
      dress.category_id
        ? { categoryId: dress.category_id }
        : { category: dress.category }
    )
  )
    .filter((d) => d.id !== dress.id && d.is_available)
    .slice(0, 3);

  return (
    <>
    <TrackRecentlyViewed
      productKind="dress"
      productId={dress.id}
      productSlug={dress.id}
      productTitle={dress.name_ar}
      productImageUrl={featuredImage(dress.images)}
    />
    <ProductDetailLayout
      images={dress.images}
      name={dress.name_ar}
      categoryLabel={categoryLabel}
      price={dress.price}
      salePrice={dress.sale_price}
      rentalPrice={dress.rental_price}
      priceSuffix={
        primaryAction.isRentalPresentation && !dress.price
          ? "/ إيجار"
          : undefined
      }
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
          <WishlistButton
            productKind="dress"
            productId={dress.id}
            productSlug={dress.id}
            productTitle={dress.name_ar}
            productImageUrl={featuredImage(dress.images)}
          />
          {dress.is_available ? (
            <ProductPrimaryCta
              productType={commerceType}
              shopProductType="dress"
              productId={dress.id}
              nameAr={dress.name_ar}
              price={dress.price}
              salePrice={dress.sale_price}
              rentalPrice={dress.rental_price}
              image={featuredImage(dress.images)}
              orderOptions={experience.orderOptions}
              extraServices={experience.extraServices}
              experienceConfig={experience.experienceConfig}
              sections={experience.sections}
              bookingHref={
                primaryAction.kind === "book_now"
                  ? "/booking"
                  : `/booking?dress=${dress.id}`
              }
            />
          ) : null}
          <Link href={categoryHref}>
            <Button variant="outline" size="lg">
              العودة للمجموعة
            </Button>
          </Link>
        </>
      }
      related={<RelatedProducts dresses={related} />}
    />
    </>
  );
}
