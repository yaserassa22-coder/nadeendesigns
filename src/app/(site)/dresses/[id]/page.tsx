import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDressById, getDresses } from "@/lib/data/queries";
import { getCategories, getCategoryById } from "@/lib/data/categories";
import { resolveCategoryHref } from "@/lib/categories/href";
import { findCategoryMatch } from "@/lib/dresses/category";
import { featuredImage } from "@/lib/products/featured-image";
import { resolveProductCommerceType } from "@/lib/products/primary-action";
import { isFeatureEnabled } from "@/lib/products/experience-features";
import { dressAvailability } from "@/lib/products/storefront-availability";
import { Button } from "@/components/ui/Button";
import { RelatedProducts } from "@/components/dresses/RelatedProducts";
import { ProductDetailLayout } from "@/components/product/ProductDetailLayout";
import { ProductPrimaryCta } from "@/components/product/ProductPrimaryCta";
import { WishlistButton } from "@/components/auth/WishlistButton";
import { TrackRecentlyViewed } from "@/components/shop/TrackRecentlyViewed";
import { resolveStorefrontProductExperience } from "@/lib/products/resolve-storefront-experience";
import { getStorefrontLocale } from "@/lib/i18n/server";
import { getDictionary, localizedDescription, localizedName } from "@/lib/i18n";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const dress = await getDressById(id);
  if (!dress) {
    const locale = await getStorefrontLocale();
    return { title: getDictionary(locale).common.notFound };
  }
  const locale = await getStorefrontLocale();
  const title = localizedName(dress, locale, dress.name_ar);
  const og = featuredImage(dress.images);
  return {
    title,
    description: localizedDescription(dress, locale, dress.description_ar ?? ""),
    openGraph: { images: og ? [og] : [] },
  };
}

export default async function DressDetailPage({ params }: Props) {
  const { id } = await params;
  const dress = await getDressById(id);
  if (!dress) notFound();

  const locale = await getStorefrontLocale();
  const t = getDictionary(locale);
  const displayName = localizedName(dress, locale, dress.name_ar);

  const categories = await getCategories();
  const category =
    (dress.category_id
      ? await getCategoryById(dress.category_id)
      : null) ??
    findCategoryMatch(categories, dress.category) ??
    null;

  const categoryLabel = category
    ? localizedName(category, locale, category.name_ar)
    : dress.category;
  const categoryHref = category
    ? resolveCategoryHref(category)
    : "/wedding-dresses";

  // CTA from product_type + Admin purchase_flows (never category name/slug)
  const commerceType = resolveProductCommerceType(dress.product_type);
  const experience = await resolveStorefrontProductExperience({
    productId: dress.id,
    productType: commerceType,
    shopProductType: "dress",
    categoryId: dress.category_id ?? category?.id ?? null,
    collectionId: dress.collection_id ?? null,
    order_options_config: dress.order_options_config,
    extra_services_config: dress.extra_services_config,
    experience_config: dress.experience_config,
    features_config: dress.features_config,
  });
  const primaryAction = experience.primaryAction;
  const availability = dressAvailability(dress.is_available, locale);
  const related = (
    await getDresses(
      dress.category_id
        ? { categoryId: dress.category_id }
        : { category: dress.category }
    )
  )
    .filter((d) => d.id !== dress.id)
    .slice(0, 3);

  const wishlistProps = {
    variant: "icon" as const,
    productKind: "dress" as const,
    productId: dress.id,
    productSlug: dress.id,
    productTitle: displayName,
    productImageUrl: featuredImage(dress.images),
  };
  const wishlistEnabled = isFeatureEnabled(
    experience.enabledFeatureIds,
    "wishlist"
  );

  return (
    <>
      <TrackRecentlyViewed
        productKind="dress"
        productId={dress.id}
        productSlug={dress.id}
        productTitle={displayName}
        productImageUrl={featuredImage(dress.images)}
      />
      <ProductDetailLayout
        images={dress.images}
        name={displayName}
        categoryLabel={categoryLabel}
        price={dress.price}
        salePrice={dress.sale_price}
        rentalPrice={dress.rental_price}
        priceSuffix={
          primaryAction.isRentalPresentation && !dress.price
            ? t.product.rentalSuffix
            : undefined
        }
        description={localizedDescription(dress, locale, dress.description_ar ?? "")}
        available={availability.available}
        availabilityLabel={availability.label}
        isFeatured={dress.is_featured}
        galleryWishlist={
          wishlistEnabled ? <WishlistButton {...wishlistProps} /> : null
        }
        metaItems={[
          ...(dress.style
            ? [
                {
                  key: "style",
                  label: dress.style,
                  icon: "palette" as const,
                },
              ]
            : []),
          ...(dress.size
            ? [
                {
                  key: "size",
                  label: dress.size,
                  icon: "ruler" as const,
                },
              ]
            : []),
          ...(dress.color
            ? [
                {
                  key: "color",
                  label: dress.color,
                },
              ]
            : []),
        ]}
        actions={
          <ProductPrimaryCta
            productType={experience.commerceType}
            primaryAction={primaryAction}
            enabledFeatureIds={experience.enabledFeatureIds}
            shopProductType="dress"
            productId={dress.id}
            nameAr={dress.name_ar}
            nameEn={dress.name_en}
            nameHe={dress.name_he}
            price={dress.price}
            salePrice={dress.sale_price}
            rentalPrice={dress.rental_price}
            image={featuredImage(dress.images)}
            extraServices={experience.extraServices}
            experienceConfig={experience.experienceConfig}
            sections={experience.sections}
            featuresConfig={experience.featuresConfig}
            wishlist={
              wishlistEnabled ? <WishlistButton {...wishlistProps} /> : null
            }
            bookingHref={
              primaryAction.kind === "book_now"
                ? "/booking"
                : primaryAction.kind === "request_design"
                  ? `/booking?service=custom_design&dress=${dress.id}`
                  : `/booking?dress=${dress.id}`
            }
          />
        }
        below={
          <div className="mt-6">
            <Link href={categoryHref} className="inline-block">
              <Button variant="ghost" size="md">
                {t.product.backToCollection}
              </Button>
            </Link>
          </div>
        }
        related={<RelatedProducts dresses={related} />}
      />
    </>
  );
}
