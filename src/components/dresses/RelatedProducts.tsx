import { DressCard } from "@/components/dresses/DressCard";
import type { Dress } from "@/types";

interface RelatedProductsProps {
  dresses: Dress[];
  title?: string;
}

export function RelatedProducts({
  dresses,
  title = "منتجات ذات صلة",
}: RelatedProductsProps) {
  if (!dresses.length) return null;

  return (
    <section className="mt-16 border-t border-beige-dark pt-16 md:mt-24 md:pt-20">
      <h2 className="mb-8 text-center text-2xl font-semibold text-charcoal md:text-3xl">
        {title}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {dresses.map((dress, i) => (
          <DressCard key={dress.id} dress={dress} index={i} />
        ))}
      </div>
    </section>
  );
}
