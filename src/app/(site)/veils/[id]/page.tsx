import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShopCustomizeAndBuy } from "@/components/shop/ShopCustomizeAndBuy";
import { Button } from "@/components/ui/Button";
import { getVeilById } from "@/lib/data/shop-queries";
import { formatPrice } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const veil = await getVeilById(id);
  if (!veil) return { title: "غير موجود" };
  return { title: veil.name_ar, description: veil.description_ar };
}

export default async function VeilDetailPage({ params }: Props) {
  const { id } = await params;
  const veil = await getVeilById(id);
  if (!veil) notFound();

  return (
    <section className="pt-28 pb-16 md:pt-36 md:pb-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="relative aspect-[3/4] overflow-hidden rounded-3xl">
            {veil.images[0] && (
              <Image
                src={veil.images[0]}
                alt={veil.name_ar}
                fill
                priority
                className="object-cover"
              />
            )}
          </div>
          <div>
            <p className="text-sm text-gold">الطرحات · {veil.category}</p>
            <h1 className="mt-2 text-3xl font-bold text-charcoal md:text-4xl">
              {veil.name_ar}
            </h1>
            <p className="mt-4 text-3xl text-gold" dir="ltr">
              {formatPrice(veil.price)}
            </p>
            <p className="mt-6 leading-relaxed text-muted">
              {veil.description_ar}
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              {veil.color && (
                <span className="rounded-full bg-beige px-4 py-2">{veil.color}</span>
              )}
              {veil.material && (
                <span className="rounded-full bg-beige px-4 py-2">
                  {veil.material}
                </span>
              )}
              <span className="rounded-full bg-beige px-4 py-2">
                المخزون: {veil.stock_quantity}
              </span>
            </div>
            <div className="mt-8">
              <Link href="/veils">
                <Button variant="outline">العودة للطرحات</Button>
              </Link>
            </div>
          </div>
        </div>

        {veil.is_available && veil.stock_quantity > 0 ? (
          <ShopCustomizeAndBuy
            productType="veil"
            productId={veil.id}
            nameAr={veil.name_ar}
            price={veil.price}
            image={veil.images[0]}
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
