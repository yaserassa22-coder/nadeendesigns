import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShopCustomizeAndBuy } from "@/components/shop/ShopCustomizeAndBuy";
import { RelatedShopProducts } from "@/components/shop/RelatedShopProducts";
import { ProductDetailLayout } from "@/components/product/ProductDetailLayout";
import { Button } from "@/components/ui/Button";
import { getVeilById, getVeils } from "@/lib/data/shop-queries";
import { featuredImage } from "@/lib/products/featured-image";

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
    }));

  const inStock = veil.is_available && veil.stock_quantity > 0;

  return (
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
        <Link href="/veils">
          <Button variant="outline">العودة للطرحات</Button>
        </Link>
      }
      below={
        inStock ? (
          <ShopCustomizeAndBuy
            productType="veil"
            productId={veil.id}
            nameAr={veil.name_ar}
            price={veil.price}
            image={featuredImage(veil.images)}
          />
        ) : null
      }
      related={<RelatedShopProducts items={related} />}
    />
  );
}
