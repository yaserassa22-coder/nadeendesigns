"use client";

import { Heart } from "lucide-react";
import { useMemo } from "react";
import { ProductPrimaryCta } from "@/components/product/ProductPrimaryCta";
import { CartContext, type CartContextValue } from "@/components/shop/cart-context";
import {
  EXPERIENCE_SECTION_LABELS_AR,
  storefrontExperienceSections,
  type ProductExperienceConfig,
} from "@/lib/products/experience-designer";
import {
  featuresAllowGiftWrap,
  featuresAllowPersonalization,
  isFeatureEnabled,
  resolveEnabledFeatureIds,
  type ProductFeaturesConfig,
} from "@/lib/products/experience-features";
import type { ExtraServiceConfig } from "@/lib/products/order-experience";
import {
  getProductPrimaryAction,
  resolveProductCommerceType,
  type ProductCommerceType,
} from "@/lib/products/primary-action";
import { cn, formatPrice } from "@/lib/utils";

type Props = {
  productType: ProductCommerceType;
  productNameAr: string;
  unitPrice?: number;
  featuresConfig?: ProductFeaturesConfig | null;
  experienceConfig: ProductExperienceConfig;
  extraServices?: ExtraServiceConfig[];
  /** desktop | mobile frame width */
  compact?: boolean;
  className?: string;
};

/**
 * Admin Live Preview — identical CTA path as the storefront PDP.
 * Non-interactive (pointer-events none) so Admin never triggers cart/booking.
 */
export function ProductExperienceLivePreview({
  productType,
  productNameAr,
  unitPrice = 0,
  featuresConfig = null,
  experienceConfig,
  extraServices = [],
  compact = false,
  className,
}: Props) {
  const commerceType = resolveProductCommerceType(productType);
  const action = getProductPrimaryAction(commerceType);
  const enabledFeatures = resolveEnabledFeatureIds({
    features_config: featuresConfig,
    productType: commerceType,
    shopProductType: "dress",
  });

  const purchasable = action.kind === "add_to_cart" && !action.hideCart;
  const allowPersonalization = featuresAllowPersonalization(
    enabledFeatures,
    "dress"
  );
  const allowGift = featuresAllowGiftWrap(enabledFeatures);

  const sections = storefrontExperienceSections(experienceConfig).filter(
    (s) => {
      if (!purchasable) return false;
      if (s.id === "summary") return s.enabled;
      if (s.id === "personalization")
        return s.enabled && allowPersonalization;
      if (s.id === "gift_options") return s.enabled && allowGift;
      if (s.id === "extra_services")
        return s.enabled && extraServices.length > 0;
      return s.enabled;
    }
  );

  const contentSections = sections.filter((s) => s.id !== "summary");
  const showSummary = sections.some((s) => s.id === "summary");
  const showWishlist = isFeatureEnabled(enabledFeatures, "wishlist");

  const wishlistSlot = showWishlist ? (
    <span
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-beige-dark text-charcoal"
      aria-label="المفضلة"
    >
      <Heart className="h-4 w-4" />
    </span>
  ) : null;

  // Preview is non-interactive/disabled — stub cart context avoids requiring
  // a real CartProvider (and its network hydration) in the Admin tree.
  const stubCart = useMemo<CartContextValue>(
    () => ({
      items: [],
      count: 0,
      subtotal: 0,
      needsShipping: false,
      addItem: () => {},
      updateQuantity: () => {},
      removeItem: () => {},
      clearCart: () => {},
    }),
    []
  );

  return (
    <div
      className={cn(
        "rounded-3xl border border-gold/20 bg-gradient-to-b from-ivory via-white to-white p-5 shadow-inner",
        compact ? "max-w-[340px]" : "max-w-lg",
        className
      )}
    >
      <p className="mb-1 text-[11px] font-medium text-muted">
        معاينة الواجهة · نفس منطق المتجر
      </p>
      <p className="mb-4 font-[family-name:var(--font-cormorant)] text-lg text-charcoal">
        {productNameAr}
      </p>

      {purchasable && contentSections.length > 0 ? (
        <ol className="mb-4 space-y-2.5">
          {contentSections.map((s, i) => (
            <li
              key={s.id}
              className="rounded-2xl border border-beige-dark/40 bg-white px-4 py-3 text-sm shadow-sm"
            >
              <span className="font-medium text-charcoal">
                {i + 1}. {s.title_ar || EXPERIENCE_SECTION_LABELS_AR[s.id]}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      {purchasable && showSummary ? (
        <div className="mb-4 flex items-baseline justify-between border-t border-beige-dark/40 pt-4">
          <span className="text-sm text-muted">الإجمالي</span>
          <span
            className="font-[family-name:var(--font-cormorant)] text-2xl text-gold tabular-nums"
            dir="ltr"
          >
            {formatPrice(Math.max(0, unitPrice))}
          </span>
        </div>
      ) : null}

      {/* Same storefront CTA component — blocked from interaction in Admin */}
      <div className="pointer-events-none select-none" aria-hidden>
        <CartContext.Provider value={stubCart}>
          <ProductPrimaryCta
            productType={commerceType}
            featuresConfig={featuresConfig}
            enabledFeatureIds={enabledFeatures}
            primaryAction={action}
            experienceConfig={experienceConfig}
            sections={sections}
            extraServices={extraServices}
            shopProductType="dress"
            productId="admin-preview"
            nameAr={productNameAr}
            price={purchasable ? unitPrice : null}
            wishlist={wishlistSlot}
            disabled
            size="md"
            className="w-full"
          />
        </CartContext.Provider>
      </div>
    </div>
  );
}
