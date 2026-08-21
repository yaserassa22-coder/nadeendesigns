import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RelatedShopProducts } from "@/components/shop/RelatedShopProducts";
import { ProductDetailLayout } from "@/components/product/ProductDetailLayout";
import { ProductPrimaryCta } from "@/components/product/ProductPrimaryCta";
import { WishlistButton } from "@/components/auth/WishlistButton";
import { TrackRecentlyViewed } from "@/components/shop/TrackRecentlyViewed";
import { Button } from "@/components/ui/Button";
import {
  getAccessoryItemById,
  getRelatedAccessoryItems,
} from "@/lib/data/shop-queries";
import { getCategoryById } from "@/lib/data/categories";
import { featuredImage } from "@/lib/products/featured-image";
import { isFeatureEnabled } from "@/lib/products/experience-features";
import { shopStockAvailability } from "@/lib/products/storefront-availability";
import { resolveStorefrontProductExperience } from "@/lib/products/resolve-storefront-experience";
import { resolveCategoryHref } from "@/lib/categories/href";
import { getStorefrontLocale } from "@/lib/i18n/server";
import { getDictionary, localizedDescription, localizedName } from "@/lib/i18n";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [item, locale] = await Promise.all([
    getAccessoryItemById(id),
    getStorefrontLocale(),
  ]);
  if (!item) {
    return { title: getDictionary(locale).common.notFound };
  }
  const og = featuredImage(item.images);
  return {
    title: localizedName(item, locale, item.name_ar),
    description: localizedDescription(item, locale, item.description_ar ?? ""),
    openGraph: { images: og ? [og] : [] },
  };
}

/** Generic bridal-accessory product detail — any custom sub-category (migration 056). */
export default async function AccessoryItemDetailPage({ params }: Props) {
  const { id } = await params;
  const [item, locale] = await Promise.all([
    getAccessoryItemById(id),
    getStorefrontLocale(),
  ]);
  if (!item) notFound();
  const t = getDictionary(locale);
  const displayName = localizedName(item, locale, item.name_ar);
  const category = await getCategoryById(item.category_id);
  const categoryLabel = category
    ? localizedName(category, locale, category.name_ar)
    : "";
  const backHref = category ? resolveCategoryHref(category) : "/";

  const [relatedRows, experience] = await Promise.all([
    getRelatedAccessoryItems(item.category_id, item.id, 3),
    resolveStorefrontProductExperience({
      productId: item.id,
      productType: item.product_type ?? "bridal_accessory",
      fallbackType: "bridal_accessory",
      shopProductType: "accessory_item",
      categoryId: item.category_id,
      collectionId: null,
      order_options_config: item.order_options_config,
      extra_services_config: item.extra_services_config,
      experience_config: item.experience_config,
      features_config: item.features_config,
    }),
  ]);

  const related = relatedRows.map((r) => ({
    id: r.id,
    name_ar: r.name_ar,
    price: r.price,
    sale_price: r.sale_price,
    images: r.images,
    href: `/accessories/${r.id}`,
    subtitle: categoryLabel,
    kind: "accessory_item" as const,
    is_featured: r.is_featured,
  }));

  const stock = shopStockAvailability({
    isAvailable: item.is_available,
    stockQuantity: item.stock_quantity,
    locale,
  });

  const wishlistProps = {
    variant: "icon" as const,
    productKind: "accessory_item" as const,
    productId: item.id,
    productSlug: item.id,
    productTitle: displayName,
    productImageUrl: featuredImage(item.images),
  };
  const wishlistEnabled = isFeatureEnabled(
    experience.enabledFeatureIds,
    "wishlist"
  );

  return (
    <>
      <TrackRecentlyViewed
        productKind="accessory_item"
        productId={item.id}
        productSlug={item.id}
        productTitle={displayName}
        productImageUrl={featuredImage(item.images)}
      />
      <ProductDetailLayout
        images={item.images}
        name={displayName}
        categoryLabel={categoryLabel}
        price={item.price}
        salePrice={item.sale_price}
        description={localizedDescription(item, locale, item.description_ar ?? "")}
        available={stock.available}
        availabilityLabel={stock.label}
        isFeatured={item.is_featured}
        galleryWishlist={
          wishlistEnabled ? <WishlistButton {...wishlistProps} /> : null
        }
        metaItems={[
          ...(item.color ? [{ key: "color", label: item.color }] : []),
          ...(item.material ? [{ key: "material", label: item.material }] : []),
          ...(item.size ? [{ key: "size", label: item.size }] : []),
        ]}
        actions={
          stock.available ? (
            <ProductPrimaryCta
              productType={experience.commerceType}
              fallbackType="bridal_accessory"
              primaryAction={experience.primaryAction}
              enabledFeatureIds={experience.enabledFeatureIds}
              shopProductType="accessory_item"
              productId={item.id}
              nameAr={item.name_ar}
              nameEn={item.name_en}
              nameHe={item.name_he}
              price={item.price}
              salePrice={item.sale_price}
              image={featuredImage(item.images)}
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
            <Link href={backHref} className="inline-block">
              <Button variant="ghost" size="md">
                {t.common.back}
              </Button>
            </Link>
          </div>
        }
        related={<RelatedShopProducts items={related} />}
      />
    </>
  );
}
