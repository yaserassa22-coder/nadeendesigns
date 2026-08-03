import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShopCustomizeAndBuy } from "@/components/shop/ShopCustomizeAndBuy";
import { RelatedShopProducts } from "@/components/shop/RelatedShopProducts";
import { ProductDetailLayout } from "@/components/product/ProductDetailLayout";
import { Button } from "@/components/ui/Button";
import { getBridalRobeById, getBridalRobes } from "@/lib/data/shop-queries";
import { featuredImage } from "@/lib/products/featured-image";

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
    }));

  const inStock = robe.is_available && robe.stock_quantity > 0;

  return (
    <ProductDetailLayout
      images={robe.images}
      name={robe.name_ar}
      categoryLabel="برنص العروس"
      price={robe.price}
      description={robe.description_ar}
      available={inStock}
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
          <span className="rounded-full bg-beige px-4 py-2 text-sm">
            المخزون: {robe.stock_quantity}
          </span>
        </>
      }
      actions={
        <Link href="/robes">
          <Button variant="outline" size="lg">
            العودة لبرنص العروس
          </Button>
        </Link>
      }
      below={
        inStock ? (
          <ShopCustomizeAndBuy
            productType="bridal_robe"
            productId={robe.id}
            nameAr={robe.name_ar}
            price={robe.price}
            image={featuredImage(robe.images)}
          />
        ) : null
      }
      related={<RelatedShopProducts items={related} />}
    />
  );
}
