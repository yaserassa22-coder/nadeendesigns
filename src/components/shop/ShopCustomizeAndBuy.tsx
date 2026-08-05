"use client";

import type { ReactNode } from "react";
import { ProductExperienceBuy } from "@/components/product/ProductExperienceBuy";
import type { ExtraServiceConfig } from "@/lib/products/order-experience";
import type {
  ExperienceSectionConfig,
  ProductExperienceConfig,
} from "@/lib/products/experience-designer";
import {
  featuresAllowGiftWrap,
  featuresAllowPersonalization,
  isFeatureEnabled,
  resolveEnabledFeatureIds,
  type ProductFeaturesConfig,
} from "@/lib/products/experience-features";
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
  featuresConfig?: ProductFeaturesConfig | null;
  /** Compact wishlist — aligned with Add to Cart / Buy Now. */
  wishlist?: ReactNode;
  /** Drop top margin when nested in PDP actions (vs below slot). */
  flush?: boolean;
  className?: string;
}

/**
 * Veil / robe purchase entry — clean CTAs only (no instructional card).
 * Personalization & services open inside ProductExperienceModal on click.
 * Feature library gates writing / gift / cart CTAs when configured.
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
  featuresConfig = null,
  wishlist,
  flush = false,
  className,
}: ShopCustomizeAndBuyProps) {
  const enabled = resolveEnabledFeatureIds({
    features_config: featuresConfig,
    productType: "bridal_accessory",
    shopProductType: productType,
  });
  const allowPersonalization = featuresAllowPersonalization(
    enabled,
    productType
  );
  const allowGift = featuresAllowGiftWrap(enabled);
  const gatedServices = extraServices.filter((s) => {
    if (s.id === "gift_wrap") return allowGift;
    if (s.id === "greeting_card")
      return isFeatureEnabled(enabled, "gift_message");
    if (s.id === "luxury_box") return isFeatureEnabled(enabled, "luxury_box");
    if (s.id === "express_delivery")
      return isFeatureEnabled(enabled, "express_delivery");
    return true;
  });
  const showWishlist = isFeatureEnabled(enabled, "wishlist") ? wishlist : null;

  return (
    <ProductExperienceBuy
      className={cn(!flush && "mt-10", className)}
      shopProductType={productType}
      productId={productId}
      nameAr={nameAr}
      price={price}
      salePrice={salePrice}
      image={image}
      extraServices={gatedServices}
      experienceConfig={experienceConfig}
      sections={sections}
      wishlist={showWishlist}
      enablePersonalization={allowPersonalization}
      enableGiftWrapping={allowGift}
      showAddToCart={isFeatureEnabled(enabled, "add_to_cart")}
      showBuyNow={isFeatureEnabled(enabled, "buy_now")}
      requiresShipping
      size="lg"
    />
  );
}
