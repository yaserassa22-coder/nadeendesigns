import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShopCustomizeAndBuy } from "@/components/shop/ShopCustomizeAndBuy";
import { Button } from "@/components/ui/Button";
import { getBridalRobeById } from "@/lib/data/shop-queries";
import { formatPrice } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const robe = await getBridalRobeById(id);
  if (!robe) return { title: "غير موجود" };
  return { title: robe.name_ar, description: robe.description_ar };
}

export default async function RobeDetailPage({ params }: Props) {
  const { id } = await params;
  const robe = await getBridalRobeById(id);
  if (!robe) notFound();

  return (
    <section className="pt-28 pb-16 md:pt-36 md:pb-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="relative aspect-[3/4] overflow-hidden rounded-3xl">
            {robe.images[0] && (
              <Image
                src={robe.images[0]}
                alt={robe.name_ar}
                fill
                priority
                className="object-cover"
              />
            )}
          </div>
          <div>
            <p className="text-sm text-gold">برنص العروس</p>
            <h1 className="mt-2 text-3xl font-bold text-charcoal md:text-4xl">
              {robe.name_ar}
            </h1>
            <p className="mt-4 text-3xl text-gold" dir="ltr">
              {formatPrice(robe.price)}
            </p>
            <p className="mt-6 leading-relaxed text-muted">
              {robe.description_ar}
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              {robe.color && (
                <span className="rounded-full bg-beige px-4 py-2">{robe.color}</span>
              )}
              {robe.size && (
                <span className="rounded-full bg-beige px-4 py-2">{robe.size}</span>
              )}
              {robe.material && (
                <span className="rounded-full bg-beige px-4 py-2">
                  {robe.material}
                </span>
              )}
              <span className="rounded-full bg-beige px-4 py-2">
                المخزون: {robe.stock_quantity}
              </span>
            </div>
            <div className="mt-8">
              <Link href="/robes">
                <Button variant="outline">العودة لبرنص العروس</Button>
              </Link>
            </div>
          </div>
        </div>

        {robe.is_available && robe.stock_quantity > 0 ? (
          <ShopCustomizeAndBuy
            productType="bridal_robe"
            productId={robe.id}
            nameAr={robe.name_ar}
            price={robe.price}
            image={robe.images[0]}
          />
        ) : (
          <p className="mt-10 rounded-xl bg-red-50 p-4 text-sm text-red-600">
            هذا المنتج غير متوفر حاليًا
          </p>
        )}
      </div>
    </section>
  );
}
