import { resolveProductPricing } from "@/lib/products/pricing";
import { cn } from "@/lib/utils";

export type ProductCardBadgeKind =
  | "sale"
  | "new"
  | "best_seller"
  | "featured"
  | "limited";

export type ProductCardBadgeItem = {
  kind: ProductCardBadgeKind;
  label: string;
};

type Tone = "charcoal" | "gold" | "ivory";

const TONE_BY_KIND: Record<ProductCardBadgeKind, Tone> = {
  sale: "charcoal",
  featured: "gold",
  new: "ivory",
  best_seller: "gold",
  limited: "charcoal",
};

const TONE_CLASS: Record<Tone, string> = {
  charcoal:
    "bg-charcoal/90 text-white backdrop-blur-[2px]",
  gold: "bg-gold/95 text-white backdrop-blur-[2px]",
  ivory:
    "border border-white/40 bg-white/95 text-charcoal shadow-sm backdrop-blur-[2px]",
};

/** Display order in the top-left stack. */
const BADGE_ORDER: ProductCardBadgeKind[] = [
  "sale",
  "new",
  "best_seller",
  "featured",
  "limited",
];

function normalizeTag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Map free-form admin tags → known badge kinds.
 * Only returns badges when product data actually supports them.
 */
function badgesFromTags(tags: string[] | null | undefined): ProductCardBadgeKind[] {
  if (!tags?.length) return [];
  const found = new Set<ProductCardBadgeKind>();

  for (const raw of tags) {
    const t = normalizeTag(raw);
    if (!t) continue;

    if (
      t === "new" ||
      t === "جديد" ||
      t === "جديدة" ||
      t === "جديدات"
    ) {
      found.add("new");
      continue;
    }

    if (
      t === "best seller" ||
      t === "bestseller" ||
      t === "best sellers" ||
      t === "الأكثر مبيعا" ||
      t === "الأكثر مبيعاً" ||
      t === "الأكثر مبيعًا" ||
      t === "اكثر مبيعا"
    ) {
      found.add("best_seller");
      continue;
    }

    if (
      t === "limited" ||
      t === "limited edition" ||
      t === "محدود" ||
      t === "كمية محدودة" ||
      t === "إصدار محدود" ||
      t === "اصدار محدود"
    ) {
      found.add("limited");
    }
  }

  return BADGE_ORDER.filter((k) => found.has(k));
}

export function resolveProductCardBadges(input: {
  price?: number | null;
  salePrice?: number | null;
  isFeatured?: boolean | null;
  tags?: string[] | null;
}): ProductCardBadgeItem[] {
  const items: ProductCardBadgeItem[] = [];
  const pricing = resolveProductPricing({
    price: input.price,
    salePrice: input.salePrice,
  });

  if (pricing.onSale) {
    items.push({ kind: "sale", label: "SALE" });
  }

  for (const kind of badgesFromTags(input.tags)) {
    if (kind === "new") items.push({ kind, label: "NEW" });
    if (kind === "best_seller") items.push({ kind, label: "BEST SELLER" });
    if (kind === "limited") items.push({ kind, label: "LIMITED" });
  }

  if (input.isFeatured) {
    items.push({ kind: "featured", label: "FEATURED" });
  }

  return items.sort(
    (a, b) => BADGE_ORDER.indexOf(a.kind) - BADGE_ORDER.indexOf(b.kind)
  );
}

export function ProductCardBadgePill({
  kind,
  label,
  className,
}: {
  kind: ProductCardBadgeKind;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "pointer-events-none inline-flex max-w-full truncate rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase",
        TONE_CLASS[TONE_BY_KIND[kind]],
        className
      )}
    >
      {label}
    </span>
  );
}

/**
 * Top-left badge stack for product cards.
 * Renders nothing when the product has no supporting badge data.
 */
export function ProductCardBadges({
  price,
  salePrice,
  isFeatured,
  tags,
  className,
}: {
  price?: number | null;
  salePrice?: number | null;
  isFeatured?: boolean | null;
  tags?: string[] | null;
  className?: string;
}) {
  const badges = resolveProductCardBadges({
    price,
    salePrice,
    isFeatured,
    tags,
  });

  if (!badges.length) return null;

  return (
    <>
      {badges.map((badge) => (
        <ProductCardBadgePill
          key={badge.kind}
          kind={badge.kind}
          label={badge.label}
          className={className}
        />
      ))}
    </>
  );
}
