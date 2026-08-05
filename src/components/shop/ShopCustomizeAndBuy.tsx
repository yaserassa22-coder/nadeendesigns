"use client";

import type { ReactNode } from "react";
import { ProductExperienceBuy } from "@/components/product/ProductExperienceBuy";
import type { ExtraServiceConfig } from "@/lib/products/order-experience";
import type {
  ExperienceSectionConfig,
  ProductExperienceConfig,
} from "@/lib/products/experience-designer";
import type { ShopProductType } from "@/types/shop";
import { cn } from "@/lib/utils";

interface ShopCustomizeAndBuyProps {
  productType: ShopProductType;
  productId: string;
  nameAr: string;
  price: number;
  /** Optional sale — when lower than price, cart charges sale and keeps compare-at. */
  salePrice?: number | null;
  image?: string;
  /** Resolved available extra services (store + product). Empty = none. */
  extraServices?: ExtraServiceConfig[];
  experienceConfig?: ProductExperienceConfig | null;
  sections?: ExperienceSectionConfig[];
  /** Compact wishlist — aligned with Add to Cart / Buy Now. */
  wishlist?: ReactNode;
  /** Drop top margin when nested in PDP actions (vs below slot). */
  flush?: boolean;
  className?: string;
}

/**
 * Veil / robe purchase entry — clean CTAs only (no instructional card).
 * Personalization & services open inside ProductExperienceModal on click.
 */
export function ShopCustomizeAndBuy({
  productType,
  productId,
  nameAr,
  price,
  salePrice,
  image,
  extraServices = [],
  experienceConfig = null,
  sections = [],
  wishlist,
  flush = false,
  className,
}: ShopCustomizeAndBuyProps) {
  return (
    <ProductExperienceBuy
      className={cn(!flush && "mt-10", className)}
      shopProductType={productType}
      productId={productId}
      nameAr={nameAr}
      price={price}
      salePrice={salePrice}
      image={image}
      extraServices={extraServices}
      experienceConfig={experienceConfig}
      sections={sections}
      wishlist={wishlist}
      enablePersonalization
      enableGiftWrapping
      requiresShipping
      size="lg"
    />
  );
}
