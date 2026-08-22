"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useCart } from "@/components/shop/CartProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  type WishlistItem,
  wishlistItemCanAddToCart,
  wishlistItemUnitPrice,
  wishlistKindToShopProductType,
  wishlistProductHref,
  wishlistRequiresShipping,
} from "@/lib/shop/wishlist";

export function WishlistAddToCartButton({ item }: { item: WishlistItem }) {
  const { addItem } = useCart();
  const { t } = useLocale();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const canAdd = wishlistItemCanAddToCart(item);
  const label = t.wishlist.moveToCart;

  function handleClick() {
    setMessage("");
    const productType = wishlistKindToShopProductType(item.product_kind);
    const priced = wishlistItemUnitPrice(item);
    if (!canAdd || !productType || !priced) {
      router.push(
        wishlistProductHref(item.product_kind, item.product_id, item.product_slug)
      );
      return;
    }
    addItem({
      product_type: productType,
      product_id: item.product_id,
      name_ar: item.name_ar || item.product_title || t.wishlist.piece,
      name_en: item.name_en,
      name_he: item.name_he,
      unit_price: priced.unit,
      compare_at_price: priced.compareAt,
      image: item.product_image_url || undefined,
      requires_shipping: wishlistRequiresShipping(item.product_kind),
    });
    setMessage(t.product.addedToCart);
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        title={label}
        aria-label={`${label}: ${item.product_title || t.wishlist.piece}`}
        onClick={handleClick}
        className="inline-flex h-8 w-8 items-center justify-center rounded-none bg-black text-white transition hover:bg-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
      >
        <Plus className="h-4 w-4" />
      </button>
      {message ? (
        <p className="text-xs text-gold" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
