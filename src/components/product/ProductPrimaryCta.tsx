"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Calendar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductExperienceBuy } from "@/components/product/ProductExperienceBuy";
import {
  getProductPrimaryAction,
  resolveProductCommerceType,
  type ProductCommerceType,
  type ProductPrimaryAction,
} from "@/lib/products/primary-action";
import type { ExtraServiceConfig } from "@/lib/products/order-experience";
import type {
  ExperienceSectionConfig,
  ProductExperienceConfig,
} from "@/lib/products/experience-designer";
import type { ProductFeaturesConfig } from "@/lib/products/experience-features";
import {
  featuresAllowGiftWrap,
  featuresAllowPersonalization,
  isFeatureEnabled,
  resolveEnabledFeatureIds,
} from "@/lib/products/experience-features";
import type { ShopProductType } from "@/types/shop";

export type ProductPrimaryCtaProps = {
  /** Commerce type — ready_to_buy | bridal_accessory | rental_dress | custom_design | service */
  productType: ProductCommerceType | string | null | undefined;
  /** Fallback when productType missing (veils/robes → bridal_accessory) */
  fallbackType?: ProductCommerceType;
  /**
   * Server-resolved action (purchase_flows override). When provided, wins over
   * client-side ACTIONS fallback so Admin edits sync to the storefront.
   */
  primaryAction?: ProductPrimaryAction;
  /** Server-resolved feature IDs (already ∩ global library). */
  enabledFeatureIds?: string[];
  /** Cart entity kind when action is add_to_cart */
  shopProductType?: ShopProductType;
  productId: string;
  nameAr: string;
  price?: number | null;
  salePrice?: number | null;
  rentalPrice?: number | null;
  image?: string | null;
  extraServices?: ExtraServiceConfig[];
  experienceConfig?: ProductExperienceConfig | null;
  sections?: ExperienceSectionConfig[];
  featuresConfig?: ProductFeaturesConfig | null;
  /** Compact wishlist — aligned with Add to Cart / Buy Now when purchasable. */
  wishlist?: ReactNode;
  /** Booking deep-link extras */
  bookingHref?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * Primary product CTA. Prefer server-resolved purchase flow + feature IDs.
 * Falls back to ACTIONS / local feature defaults when props omitted.
 */
export function ProductPrimaryCta({
  productType,
  fallbackType = "ready_to_buy",
  primaryAction: primaryActionProp,
  enabledFeatureIds: enabledFeatureIdsProp,
  shopProductType = "dress",
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
  bookingHref,
  disabled = false,
  size = "lg",
  className,
}: ProductPrimaryCtaProps) {
  const commerceType = resolveProductCommerceType(productType, fallbackType);
  const action =
    primaryActionProp ?? getProductPrimaryAction(commerceType, fallbackType);
  const enabledFeatures =
    enabledFeatureIdsProp ??
    resolveEnabledFeatureIds({
      features_config: featuresConfig,
      productType: commerceType,
      shopProductType,
    });

  const showWishlist =
    isFeatureEnabled(enabledFeatures, "wishlist") ? wishlist : null;

  if (action.kind === "add_to_cart" && !action.hideCart) {
    const allowPersonalization =
      featuresAllowPersonalization(enabledFeatures, shopProductType);
    const allowGift = featuresAllowGiftWrap(enabledFeatures);
    const gatedServices = extraServices.filter((s) => {
      if (s.id === "gift_wrap") return allowGift;
      if (s.id === "greeting_card")
        return isFeatureEnabled(enabledFeatures, "gift_message");
      if (s.id === "luxury_box")
        return isFeatureEnabled(enabledFeatures, "luxury_box");
      if (s.id === "express_delivery")
        return isFeatureEnabled(enabledFeatures, "express_delivery");
      return true;
    });

    return (
      <ProductExperienceBuy
        shopProductType={shopProductType}
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
        requiresShipping={action.requiresShipping}
        addLabel={action.label}
        showBuyNow={
          !action.hideBuyNow && isFeatureEnabled(enabledFeatures, "buy_now")
        }
        showAddToCart={isFeatureEnabled(enabledFeatures, "add_to_cart")}
        disabled={disabled}
        size={size}
        className={className}
      />
    );
  }

  const bookingFeatureOk =
    action.kind === "request_design"
      ? isFeatureEnabled(enabledFeatures, "request_design")
      : isFeatureEnabled(enabledFeatures, "appointment_booking");

  if (!bookingFeatureOk) {
    return showWishlist ? (
      <div className={className}>{showWishlist}</div>
    ) : null;
  }

  const href =
    bookingHref ??
    (action.kind === "book_now"
      ? "/booking"
      : action.kind === "request_design"
        ? `/booking?service=custom_design&dress=${encodeURIComponent(productId)}`
        : `/booking?dress=${encodeURIComponent(productId)}`);

  const Icon = action.kind === "request_design" ? Sparkles : Calendar;

  return (
    <div
      className={
        className
          ? `flex flex-wrap items-center gap-3 ${className}`
          : "flex w-full flex-wrap items-center gap-3"
      }
    >
      {showWishlist}
      <Link href={href} className="min-w-0 flex-1 sm:flex-none">
        <Button
          size={size}
          disabled={disabled}
          className="h-[var(--xp-cta-height)] w-full rounded-[var(--xp-cta-radius)] px-8 py-0 sm:w-auto"
        >
          <Icon className="h-[var(--xp-cta-icon)] w-[var(--xp-cta-icon)]" />
          {action.label}
        </Button>
      </Link>
    </div>
  );
}
