"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductExperienceBuy } from "@/components/product/ProductExperienceBuy";
import {
  getProductPrimaryAction,
  resolveProductCommerceType,
  type ProductCommerceType,
} from "@/lib/products/primary-action";
import type { ExtraServiceConfig, OrderOptionConfig } from "@/lib/products/order-experience";
import type {
  ExperienceSectionConfig,
  ProductExperienceConfig,
} from "@/lib/products/experience-designer";
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
  orderOptions?: OrderOptionConfig[];
  extraServices?: ExtraServiceConfig[];
  experienceConfig?: ProductExperienceConfig | null;
  sections?: ExperienceSectionConfig[];
  /** Booking deep-link extras */
  bookingHref?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * Primary product CTA. Action/label come ONLY from product commerce type.
 * Add-to-cart products use ProductExperienceBuy (Add to Cart + Buy Now + modal).
 */
export function ProductPrimaryCta({
  productType,
  fallbackType = "ready_to_buy",
  shopProductType = "dress",
  productId,
  nameAr,
  price,
  salePrice,
  image,
  orderOptions = [],
  extraServices = [],
  experienceConfig = null,
  sections = [],
  bookingHref,
  disabled = false,
  size = "lg",
  className,
}: ProductPrimaryCtaProps) {
  const commerceType = resolveProductCommerceType(productType, fallbackType);
  const action = getProductPrimaryAction(commerceType);

  if (action.kind === "add_to_cart") {
    return (
      <ProductExperienceBuy
        shopProductType={shopProductType}
        productId={productId}
        nameAr={nameAr}
        price={price}
        salePrice={salePrice}
        image={image}
        orderOptions={orderOptions}
        extraServices={extraServices}
        experienceConfig={experienceConfig}
        sections={sections}
        requiresShipping={action.requiresShipping}
        disabled={disabled}
        size={size}
        className={className}
      />
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
