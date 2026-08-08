"use client";

import type { ReactNode } from "react";
import { ProductExperienceBuy } from "@/components/product/ProductExperienceBuy";
import type { ExtraServiceConfig } from "@/lib/products/order-experience";
import {
  isGiftCatalogServiceId,
  resolvePersonalizationFee,
} from "@/lib/products/order-experience";
import type {
  ExperienceSectionConfig,
  ProductExperienceConfig,
} from "@/lib/products/experience-designer";
import { resolveEffectiveGiftUi } from "@/lib/products/experience-designer";
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
  nameEn?: string | null;
  nameHe?: string | null;
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
  nameEn,
  nameHe,
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
  const giftSectionOn =
    allowGift &&
    (sections?.some((s) => s.id === "gift_options" && s.enabled !== false) ??
      experienceConfig?.sections?.some(
        (s) => s.id === "gift_options" && s.enabled !== false
      ) ??
      true);
  const giftUi = resolveEffectiveGiftUi(
    experienceConfig?.gift_ui,
    extraServices
  );
  const personalizationFeeDefault = resolvePersonalizationFee(
    experienceConfig?.personalization_ui,
    extraServices,
    true
  );
  const experienceWithFees = experienceConfig
    ? {
        ...experienceConfig,
        gift_ui: giftUi,
        personalization_ui: {
          ...(experienceConfig.personalization_ui ?? {
            required: false,
            max_characters: 40,
            extra_price: 0,
          }),
          extra_price:
            (experienceConfig.personalization_ui?.extra_price ?? 0) > 0
              ? experienceConfig.personalization_ui!.extra_price
              : personalizationFeeDefault,
        },
      }
    : {
        sections: sections ?? [],
        gift_ui: giftUi,
        personalization_ui: {
          required: false,
          max_characters: 40,
          extra_price: personalizationFeeDefault,
        },
      };
  const gatedServices = extraServices.filter((s) => {
    if (s.id === "writing_personalization") return false;
    if (giftSectionOn && isGiftCatalogServiceId(s.id)) return false;
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
      nameEn={nameEn}
      nameHe={nameHe}
      price={price}
      salePrice={salePrice}
      image={image}
      extraServices={gatedServices}
      experienceConfig={experienceWithFees}
      sections={sections}
      wishlist={showWishlist}
      enablePersonalization={allowPersonalization}
      enableGiftWrapping={giftSectionOn}
      showAddToCart={isFeatureEnabled(enabled, "add_to_cart")}
      showBuyNow={isFeatureEnabled(enabled, "buy_now")}
      requiresShipping
      size="lg"
    />
  );
}
