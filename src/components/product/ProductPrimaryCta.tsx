"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Calendar, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/components/shop/CartProvider";
import {
  getProductPrimaryAction,
  resolveProductCommerceType,
  type ProductCommerceType,
} from "@/lib/products/primary-action";
import { resolveProductPricing } from "@/lib/products/pricing";
import type { ShopProductType } from "@/types/shop";

export type ProductPrimaryCtaProps = {
  /** Commerce type — ready_to_buy | bridal_accessory | rental_dress | custom_design | service */
  productType: ProductCommerceType | string | null | undefined;
  /** Fallback when productType missing (veils/robes → bridal_accessory) */
  fallbackType?: ProductCommerceType;
  /** Cart entity kind when action is add_to_cart */
  shopProductType?: ShopProductType;
  productId: string;
  nameAr: string;
  price?: number | null;
  salePrice?: number | null;
  rentalPrice?: number | null;
  image?: string | null;
  /** Booking deep-link extras */
  bookingHref?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * Primary product CTA. Action/label come ONLY from product commerce type.
 */
export function ProductPrimaryCta({
  productType,
  fallbackType = "ready_to_buy",
  shopProductType = "dress",
  productId,
  nameAr,
  price,
  salePrice,
  rentalPrice,
  image,
  bookingHref,
  disabled = false,
  size = "lg",
  className,
}: ProductPrimaryCtaProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [message, setMessage] = useState("");
  const commerceType = resolveProductCommerceType(productType, fallbackType);
  const action = getProductPrimaryAction(commerceType);

  if (action.kind === "add_to_cart") {
    const pricing = resolveProductPricing({
      price,
      salePrice,
      rentalPrice,
      forceRental: false,
    });
    const unit = pricing.currentPrice;
    const canBuy = unit != null && Number.isFinite(unit) && unit >= 0;

    return (
      <div className={className}>
        <Button
          size={size}
          disabled={disabled || !canBuy}
          onClick={() => {
            if (!canBuy || unit == null) return;
            addItem({
              product_type: shopProductType,
              product_id: productId,
              name_ar: nameAr,
              unit_price: unit,
              compare_at_price: pricing.onSale ? pricing.regularPrice : null,
              quantity: 1,
              image: image ?? undefined,
              personalization: null,
              gift_options: null,
              requires_shipping: action.requiresShipping,
            });
            setMessage("تمت الإضافة إلى السلة");
            router.push("/cart");
          }}
        >
          <ShoppingBag className="h-4 w-4" />
          {action.label}
        </Button>
        {message ? (
          <p className="mt-2 text-sm text-gold" role="status">
            {message}
          </p>
        ) : null}
      </div>
    );
  }

  const href =
    bookingHref ??
    (action.kind === "book_now"
      ? "/booking"
      : `/booking?dress=${encodeURIComponent(productId)}`);

  return (
    <Link href={href} className={className}>
      <Button size={size} disabled={disabled}>
        <Calendar className="h-4 w-4" />
        {action.label}
      </Button>
    </Link>
  );
}
