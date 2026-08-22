import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RelatedShopProducts } from "@/components/shop/RelatedShopProducts";
import { ProductDetailLayout } from "@/components/product/ProductDetailLayout";
import { ProductPrimaryCta } from "@/components/product/ProductPrimaryCta";
import { WishlistButton } from "@/components/auth/WishlistButton";
import { TrackRecentlyViewed } from "@/components/shop/TrackRecentlyViewed";
import { Button } from "@/components/ui/Button";
import { getBridalRobeById, getRelatedBridalRobes } from "@/lib/data/shop-queries";
import { featuredImage } from "@/lib/products/featured-image";
import { isFeatureEnabled } from "@/lib/products/experience-features";
import { shopStockAvailability } from "@/lib/products/storefront-availability";
import { resolveStorefrontProductExperience } from "@/lib/products/resolve-storefront-experience";
import { getStorefrontLocale } from "@/lib/i18n/server";
import {
  getDictionary,
  localizedDescription,
  localizedName,
} from "@/lib/i18n";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [robe, locale] = await Promise.all([
    getBridalRobeById(id),
    getStorefrontLocale(),
  ]);
  if (!robe) {
    return { title: getDictionary(locale).common.notFound };
  }
  const og = featuredImage(robe.images);
  return {
    title: localizedName(robe, locale, robe.name_ar),
    description: localizedDescription(robe, locale, robe.description_ar ?? ""),
    openGraph: { images: og ? [og] : [] },
  };
}

export default async function RobeDetailPage({ params }: Props) {
  const { id } = await params;
  const [robe, locale] = await Promise.all([
    getBridalRobeById(id),
    getStorefrontLocale(),
  ]);
  if (!robe) notFound();
  const t = getDictionary(locale);
  const displayName = localizedName(robe, locale, robe.name_ar);

  const [relatedRows, experience] = await Promise.all([
    getRelatedBridalRobes(robe.id, 3),
    resolveStorefrontProductExperience({
      productId: robe.id,
      productType: robe.product_type ?? "bridal_accessory",
      fallbackType: "bridal_accessory",
      shopProductType: "bridal_robe",
      categoryId: null,
      collectionId: null,
      order_options_config: robe.order_options_config,
      extra_services_config: robe.extra_services_config,
      experience_config: robe.experience_config,
      features_config: robe.features_config,
    }),
  ]);

  const related = relatedRows.map((r) => ({
    id: r.id,
    name_ar: r.name_ar,
    name_en: r.name_en,
    name_he: r.name_he,
    price: r.price,
    sale_price: r.sale_price,
    images: r.images,
    href: `/robes/${r.id}`,
    subtitle: r.color || r.size || r.material || undefined,
    kind: "bridal_robe" as const,
    is_featured: r.is_featured,
  }));

  const stock = shopStockAvailability({
    isAvailable: robe.is_available,
    stockQuantity: robe.stock_quantity,
    locale,
  });

  const wishlistProps = {
    variant: "icon" as const,
    productKind: "bridal_robe" as const,
    productId: robe.id,
    productSlug: robe.id,
    productTitle: displayName,
    productImageUrl: featuredImage(robe.images),
    price: robe.price,
    salePrice: robe.sale_price,
    nameAr: robe.name_ar,
    nameEn: robe.name_en,
    nameHe: robe.name_he,
  };
  const wishlistEnabled = isFeatureEnabled(
    experience.enabledFeatureIds,
    "wishlist"
  );

  return (
    <>
      <TrackRecentlyViewed
        productKind="bridal_robe"
        productId={robe.id}
        productSlug={robe.id}
        productTitle={displayName}
        productImageUrl={featuredImage(robe.images)}
      />
      <ProductDetailLayout
        images={robe.images}
        name={displayName}
        categoryLabel={t.nav.robes}
        price={robe.price}
        salePrice={robe.sale_price}
        description={localizedDescription(robe, locale, robe.description_ar ?? "")}
        available={stock.available}
        availabilityLabel={stock.label}
        isFeatured={robe.is_featured}
        galleryWishlist={
          wishlistEnabled ? <WishlistButton {...wishlistProps} /> : null
        }
        metaItems={[
          ...(robe.color ? [{ key: "color", label: robe.color }] : []),
          ...(robe.size ? [{ key: "size", label: robe.size }] : []),
          ...(robe.material
            ? [{ key: "material", label: robe.material }]
            : []),
        ]}
        actions={
          stock.available ? (
            <ProductPrimaryCta
              productType={experience.commerceType}
              fallbackType="bridal_accessory"
              primaryAction={experience.primaryAction}
              enabledFeatureIds={experience.enabledFeatureIds}
              shopProductType="bridal_robe"
              productId={robe.id}
              nameAr={robe.name_ar}
              nameEn={robe.name_en}
              nameHe={robe.name_he}
              price={robe.price}
              salePrice={robe.sale_price}
              image={featuredImage(robe.images)}
              extraServices={experience.extraServices}
              experienceConfig={experience.experienceConfig}
              sections={experience.sections}
              featuresConfig={experience.featuresConfig}
              wishlist={
                wishlistEnabled ? (
                  <WishlistButton key="pdp-cta-wishlist" {...wishlistProps} />
                ) : null
              }
            />
          ) : wishlistEnabled ? (
            <WishlistButton {...wishlistProps} />
          ) : null
        }
        below={
          <div className="mt-6">
            <Link href="/robes" className="inline-block">
              <Button variant="ghost" size="md">
                {t.product.backToRobes}
              </Button>
            </Link>
          </div>
        }
        related={<RelatedShopProducts items={related} />}
      />
    </>
  );
}
