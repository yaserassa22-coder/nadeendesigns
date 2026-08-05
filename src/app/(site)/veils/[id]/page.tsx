import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShopCustomizeAndBuy } from "@/components/shop/ShopCustomizeAndBuy";
import { RelatedShopProducts } from "@/components/shop/RelatedShopProducts";
import { ProductDetailLayout } from "@/components/product/ProductDetailLayout";
import { WishlistButton } from "@/components/auth/WishlistButton";
import { TrackRecentlyViewed } from "@/components/shop/TrackRecentlyViewed";
import { Button } from "@/components/ui/Button";
import { getVeilById, getVeils } from "@/lib/data/shop-queries";
import { featuredImage } from "@/lib/products/featured-image";
import { resolveStorefrontProductExperience } from "@/lib/products/resolve-storefront-experience";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const veil = await getVeilById(id);
  if (!veil) return { title: "غير موجود" };
  const og = featuredImage(veil.images);
  return {
    title: veil.name_ar,
    description: veil.description_ar,
    openGraph: { images: og ? [og] : [] },
  };
}

export default async function VeilDetailPage({ params }: Props) {
  const { id } = await params;
  const veil = await getVeilById(id);
  if (!veil) notFound();

  const related = (await getVeils())
    .filter((v) => v.id !== veil.id && v.is_available)
    .slice(0, 3)
    .map((v) => ({
      id: v.id,
      name_ar: v.name_ar,
      price: v.price,
      images: v.images,
      href: `/veils/${v.id}`,
      subtitle: v.category,
      kind: "veil" as const,
      is_featured: v.is_featured,
    }));

  const inStock = veil.is_available && veil.stock_quantity > 0;
  const experience = await resolveStorefrontProductExperience({
    productId: veil.id,
    productType: veil.product_type ?? "bridal_accessory",
    categoryId: null,
    collectionId: null,
    order_options_config: veil.order_options_config,
    extra_services_config: veil.extra_services_config,
    experience_config: veil.experience_config,
  });

  return (
    <>
    <TrackRecentlyViewed
      productKind="veil"
      productId={veil.id}
      productSlug={veil.id}
      productTitle={veil.name_ar}
      productImageUrl={featuredImage(veil.images)}
    />
    <ProductDetailLayout
      images={veil.images}
      name={veil.name_ar}
      categoryLabel={`طرحة العروس · ${veil.category}`}
      price={veil.price}
      description={veil.description_ar}
      available={inStock}
      meta={
        <>
          {veil.color && (
            <span className="rounded-full bg-beige px-4 py-2 text-sm">
              {veil.color}
            </span>
          )}
          {veil.material && (
            <span className="rounded-full bg-beige px-4 py-2 text-sm">
              {veil.material}
            </span>
          )}
          <span className="rounded-full bg-beige px-4 py-2 text-sm">
            المخزون: {veil.stock_quantity}
          </span>
        </>
      }
      actions={
        <>
          <WishlistButton
            productKind="veil"
            productId={veil.id}
            productSlug={veil.id}
            productTitle={veil.name_ar}
            productImageUrl={featuredImage(veil.images)}
          />
          <Link href="/veils">
            <Button variant="outline" size="lg">
              العودة لطرحة العروس
            </Button>
          </Link>
        </>
      }
      below={
        inStock ? (
          <ShopCustomizeAndBuy
            productType="veil"
            productId={veil.id}
            nameAr={veil.name_ar}
            price={veil.price}
            image={featuredImage(veil.images)}
            extraServices={experience.extraServices}
            experienceConfig={experience.experienceConfig}
            sections={experience.sections}
          />
        ) : null
      }
      related={<RelatedShopProducts items={related} />}
    />
    </>
  );
}
