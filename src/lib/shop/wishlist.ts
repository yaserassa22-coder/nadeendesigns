/** Shared wishlist helpers — product_kind must match PDP / guest API values. */

export type WishlistProductKind = "dress" | "veil" | "bridal_robe" | string;

export type WishlistItem = {
  id: string;
  product_kind: string;
  product_id: string;
  product_slug?: string | null;
  product_title?: string | null;
  product_image_url?: string | null;
  created_at?: string;
};

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
