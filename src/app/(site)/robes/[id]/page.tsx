import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShopCustomizeAndBuy } from "@/components/shop/ShopCustomizeAndBuy";
import { RelatedShopProducts } from "@/components/shop/RelatedShopProducts";
import { ProductDetailLayout } from "@/components/product/ProductDetailLayout";
import { WishlistButton } from "@/components/auth/WishlistButton";
import { TrackRecentlyViewed } from "@/components/shop/TrackRecentlyViewed";
import { Button } from "@/components/ui/Button";
import { getBridalRobeById, getBridalRobes } from "@/lib/data/shop-queries";
import { featuredImage } from "@/lib/products/featured-image";
import { shopStockAvailability } from "@/lib/products/storefront-availability";
import { resolveStorefrontProductExperience } from "@/lib/products/resolve-storefront-experience";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const robe = await getBridalRobeById(id);
  if (!robe) return { title: "غير موجود" };
  const og = featuredImage(robe.images);
  return {
    title: robe.name_ar,
    description: robe.description_ar,
    openGraph: { images: og ? [og] : [] },
  };
}

export default async function RobeDetailPage({ params }: Props) {
  const { id } = await params;
  const robe = await getBridalRobeById(id);
  if (!robe) notFound();

  const related = (await getBridalRobes())
    .filter((r) => r.id !== robe.id && r.is_available)
    .slice(0, 3)
    .map((r) => ({
      id: r.id,
      name_ar: r.name_ar,
      price: r.price,
      images: r.images,
      href: `/robes/${r.id}`,
      subtitle: r.size || r.color || undefined,
      kind: "bridal_robe" as const,
      is_featured: r.is_featured,
    }));

  const stock = shopStockAvailability({
    isAvailable: robe.is_available,
    stockQuantity: robe.stock_quantity,
  });
  const experience = await resolveStorefrontProductExperience({
    productId: robe.id,
    productType: robe.product_type ?? "bridal_accessory",
    categoryId: null,
    collectionId: null,
    order_options_config: robe.order_options_config,
    extra_services_config: robe.extra_services_config,
    experience_config: robe.experience_config,
  });

  const wishlistProps = {
    variant: "icon" as const,
    productKind: "bridal_robe" as const,
    productId: robe.id,
    productSlug: robe.id,
    productTitle: robe.name_ar,
    productImageUrl: featuredImage(robe.images),
  };

  return (
    <>
      <TrackRecentlyViewed
        productKind="bridal_robe"
        productId={robe.id}
        productSlug={robe.id}
        productTitle={robe.name_ar}
        productImageUrl={featuredImage(robe.images)}
      />
      <ProductDetailLayout
        images={robe.images}
        name={robe.name_ar}
        categoryLabel="برنص العروس"
        price={robe.price}
        description={robe.description_ar}
        available={stock.available}
        availabilityLabel={stock.label}
        isFeatured={robe.is_featured}
        galleryWishlist={<WishlistButton {...wishlistProps} />}
        meta={
          <>
            {robe.color && (
              <span className="rounded-full bg-beige px-4 py-2 text-sm">
                {robe.color}
              </span>
            )}
            {robe.size && (
              <span className="rounded-full bg-beige px-4 py-2 text-sm">
                {robe.size}
              </span>
            )}
            {robe.material && (
              <span className="rounded-full bg-beige px-4 py-2 text-sm">
                {robe.material}
              </span>
            )}
          </>
        }
        actions={
          stock.available ? (
            <ShopCustomizeAndBuy
              flush
              productType="bridal_robe"
              productId={robe.id}
              nameAr={robe.name_ar}
              price={robe.price}
              image={featuredImage(robe.images)}
              extraServices={experience.extraServices}
              experienceConfig={experience.experienceConfig}
              sections={experience.sections}
              wishlist={<WishlistButton {...wishlistProps} />}
            />
          ) : (
            <WishlistButton {...wishlistProps} />
          )
        }
        below={
          <div className="mt-8">
            <Link href="/robes" className="inline-block">
              <Button variant="ghost" size="md">
                العودة لبرنص العروس
              </Button>
            </Link>
          </div>
        }
        related={<RelatedShopProducts items={related} />}
      />
    </>
  );
}
