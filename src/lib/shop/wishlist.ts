/** Shared wishlist helpers — product_kind must match PDP / guest API values. */

import { resolveProductPricing } from "@/lib/products/pricing";
import { getProductPrimaryAction } from "@/lib/products/primary-action";
import type { ShopProductType } from "@/types/shop";

export type WishlistProductKind = "dress" | "veil" | "bridal_robe" | string;

export type WishlistItem = {
  id: string;
  product_kind: string;
  product_id: string;
  product_slug?: string | null;
  product_title?: string | null;
  product_image_url?: string | null;
  price?: number | null;
  sale_price?: number | null;
  name_ar?: string | null;
  name_en?: string | null;
  name_he?: string | null;
  /** Overlay from live product row — not always stored on wishlist_items. */
  commerce_type?: string | null;
  created_at?: string;
};

export function wishlistKindToShopProductType(
  kind: string
): ShopProductType | null {
  switch (kind) {
    case "veil":
    case "bridal_robe":
    case "dress":
    case "accessory_item":
      return kind;
    default:
      return kind.trim() ? "dress" : null;
  }
}

export function wishlistRequiresShipping(kind: string): boolean {
  return (
    kind === "veil" || kind === "bridal_robe" || kind === "accessory_item"
  );
}

export function wishlistItemUnitPrice(
  item: Pick<WishlistItem, "price" | "sale_price">
): { unit: number; compareAt: number | null } | null {
  const pricing = resolveProductPricing({
    price: item.price,
    salePrice: item.sale_price,
  });
  const unit = pricing.currentPrice;
  if (unit == null || !Number.isFinite(unit) || unit < 0) return null;
  return {
    unit,
    compareAt: pricing.onSale ? pricing.regularPrice : null,
  };
}

export function wishlistItemIsAccessory(kind: string): boolean {
  return (
    kind === "accessory_item" || kind === "veil" || kind === "bridal_robe"
  );
}

export function wishlistItemCanAddToCart(item: WishlistItem): boolean {
  if (!wishlistItemIsAccessory(item.product_kind)) return false;
  if (wishlistKindToShopProductType(item.product_kind) == null) return false;
  if (item.commerce_type) {
    const action = getProductPrimaryAction(item.commerce_type);
    if (action.hideCart || action.kind !== "add_to_cart") return false;
  }
  return wishlistItemUnitPrice(item) != null;
}

export function wishlistItemKey(
  productKind: string,
  productId: string
): string {
  return `${productKind}::${productId}`;
}

export function wishlistProductHref(
  productKind: string,
  productId: string,
  productSlug?: string | null
): string {
  const key = (productSlug || productId).trim();
  switch (productKind) {
    case "veil":
      return `/veils/${key}`;
    case "bridal_robe":
      return `/robes/${key}`;
    case "accessory_item":
      return `/accessories/${key}`;
    default:
      return `/dresses/${key}`;
  }
}

export function wishlistKindLabel(
  productKind: string,
  labels?: {
    productDress: string;
    productVeil: string;
    productRobe: string;
    productGeneric: string;
  }
): string {
  const L = labels ?? {
    productDress: "فستان",
    productVeil: "طرحة العروس",
    productRobe: "برنص العروس",
    productGeneric: "منتج",
  };
  switch (productKind) {
    case "veil":
      return L.productVeil;
    case "bridal_robe":
      return L.productRobe;
    case "dress":
      return L.productDress;
    case "accessory_item":
      return L.productGeneric;
    default:
      return productKind || L.productGeneric;
  }
}

/** Infer product_kind from catalog basePath or product href. */
export function inferWishlistKind(opts: {
  kind?: string | null;
  basePath?: string | null;
  href?: string | null;
}): string {
  if (opts.kind?.trim()) return opts.kind.trim();
  const href = opts.href?.trim() || "";
  if (href.startsWith("/veils")) return "veil";
  if (href.startsWith("/robes")) return "bridal_robe";
  if (href.startsWith("/accessories")) return "accessory_item";
  if (href.startsWith("/dresses")) return "dress";
  if (opts.basePath === "/veils") return "veil";
  if (opts.basePath === "/robes") return "bridal_robe";
  return "dress";
}
