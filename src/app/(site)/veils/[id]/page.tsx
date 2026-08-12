import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RelatedShopProducts } from "@/components/shop/RelatedShopProducts";
import { ProductDetailLayout } from "@/components/product/ProductDetailLayout";
import { ProductPrimaryCta } from "@/components/product/ProductPrimaryCta";
import { WishlistButton } from "@/components/auth/WishlistButton";
import { TrackRecentlyViewed } from "@/components/shop/TrackRecentlyViewed";
import { Button } from "@/components/ui/Button";
import { getVeilById, getRelatedVeils } from "@/lib/data/shop-queries";
import { featuredImage } from "@/lib/products/featured-image";
import { isFeatureEnabled } from "@/lib/products/experience-features";
import { shopStockAvailability } from "@/lib/products/storefront-availability";
import { resolveStorefrontProductExperience } from "@/lib/products/resolve-storefront-experience";
import { getStorefrontLocale } from "@/lib/i18n/server";
import {
  getDictionary,
  localizedDescription,
  localizedName,
  resolveCatalogLabel,
} from "@/lib/i18n";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [veil, locale] = await Promise.all([
    getVeilById(id),
    getStorefrontLocale(),
  ]);
  if (!veil) {
    return { title: getDictionary(locale).common.notFound };
  }
  const og = featuredImage(veil.images);
  return {
    title: localizedName(veil, locale, veil.name_ar),
    description: localizedDescription(veil, locale, veil.description_ar ?? ""),
    openGraph: { images: og ? [og] : [] },
  };
}

export default async function VeilDetailPage({ params }: Props) {
  const { id } = await params;
  const [veil, locale] = await Promise.all([
    getVeilById(id),
    getStorefrontLocale(),
  ]);
  if (!veil) notFound();
  const t = getDictionary(locale);
  const displayName = localizedName(veil, locale, veil.name_ar);

  const [relatedRows, experience] = await Promise.all([
    getRelatedVeils(veil.id, 3),
    resolveStorefrontProductExperience({
      productId: veil.id,
      productType: veil.product_type ?? "bridal_accessory",
      fallbackType: "bridal_accessory",
      shopProductType: "veil",
      categoryId: null,
      collectionId: null,
      order_options_config: veil.order_options_config,
      extra_services_config: veil.extra_services_config,
      experience_config: veil.experience_config,
      features_config: veil.features_config,
    }),
  ]);

  const related = relatedRows.map((v) => ({
    id: v.id,
    name_ar: v.name_ar,
    price: v.price,
    sale_price: v.sale_price,
    images: v.images,
    href: `/veils/${v.id}`,
    subtitle: v.category,
    kind: "veil" as const,
    is_featured: v.is_featured,
  }));

  const stock = shopStockAvailability({
    isAvailable: veil.is_available,
    stockQuantity: veil.stock_quantity,
    locale,
  });

  const wishlistProps = {
    variant: "icon" as const,
    productKind: "veil" as const,
    productId: veil.id,
    productSlug: veil.id,
    productTitle: displayName,
    productImageUrl: featuredImage(veil.images),
  };
  const wishlistEnabled = isFeatureEnabled(
    experience.enabledFeatureIds,
    "wishlist"
  );

  return (
    <>
      <TrackRecentlyViewed
        productKind="veil"
        productId={veil.id}
        productSlug={veil.id}
        productTitle={displayName}
        productImageUrl={featuredImage(veil.images)}
      />
      <ProductDetailLayout
        images={veil.images}
        name={displayName}
        categoryLabel={`${t.nav.veils} · ${resolveCatalogLabel(veil.category, locale)}`}
        price={veil.price}
        salePrice={veil.sale_price}
        description={localizedDescription(veil, locale, veil.description_ar ?? "")}
        available={stock.available}
        availabilityLabel={stock.label}
        isFeatured={veil.is_featured}
        galleryWishlist={
          wishlistEnabled ? <WishlistButton {...wishlistProps} /> : null
        }
        metaItems={[
          ...(veil.color ? [{ key: "color", label: veil.color }] : []),
          ...(veil.material
            ? [{ key: "material", label: veil.material }]
            : []),
        ]}
        actions={
          stock.available ? (
            <ProductPrimaryCta
              productType={experience.commerceType}
              fallbackType="bridal_accessory"
              primaryAction={experience.primaryAction}
              enabledFeatureIds={experience.enabledFeatureIds}
              shopProductType="veil"
              productId={veil.id}
              nameAr={veil.name_ar}
              nameEn={veil.name_en}
              nameHe={veil.name_he}
              price={veil.price}
              salePrice={veil.sale_price}
              image={featuredImage(veil.images)}
              extraServices={experience.extraServices}
              experienceConfig={experience.experienceConfig}
              sections={experience.sections}
              featuresConfig={experience.featuresConfig}
              wishlist={
                wishlistEnabled ? <WishlistButton {...wishlistProps} /> : null
              }
            />
          ) : wishlistEnabled ? (
            <WishlistButton {...wishlistProps} />
          ) : null
        }
        below={
          <div className="mt-6">
            <Link href="/veils" className="inline-block">
              <Button variant="ghost" size="md">
                {t.product.backToVeils}
              </Button>
            </Link>
          </div>
        }
        related={<RelatedShopProducts items={related} />}
      />
    </>
  );
}
