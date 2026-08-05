"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/shop/CartProvider";
import { PurchaseCtaGroup } from "@/components/ui/experience";
import {
  ProductExperienceModal,
  type ProductExperienceIntent,
} from "@/components/product/ProductExperienceModal";
import {
  productNeedsExperienceModal,
  type ExtraServiceConfig,
} from "@/lib/products/order-experience";
import type {
  ExperienceSectionConfig,
  ProductExperienceConfig,
} from "@/lib/products/experience-designer";
import { resolveProductPricing } from "@/lib/products/pricing";
import { getProductPrimaryAction } from "@/lib/products/primary-action";
import {
  shopProductSupportsPersonalization,
} from "@/lib/products/personalization";
import type { ShopProductType } from "@/types/shop";

type Props = {
  shopProductType?: ShopProductType;
  productId: string;
  nameAr: string;
  price?: number | null;
  salePrice?: number | null;
  image?: string | null;
  extraServices?: ExtraServiceConfig[];
  experienceConfig?: ProductExperienceConfig | null;
  sections?: ExperienceSectionConfig[];
  /** Compact wishlist slot — aligned with Add to Cart / Buy Now. */
  wishlist?: ReactNode;
  /** Open modal with veil/robe personalization (wraps existing UI). */
  enablePersonalization?: boolean;
  enableGiftWrapping?: boolean;
  requiresShipping?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * Add to Cart + Buy Now CTAs with Product Experience Modal when configurable.
 * - Personalization or extra services → modal first
 * - Otherwise → direct cart add; Buy Now → checkout
 * - After Add to Cart from modal: stay on storefront
 * - Order options / delivery / notes are never collected here (checkout only)
 */
export function ProductExperienceBuy({
  shopProductType = "dress",
  productId,
  nameAr,
  price,
  salePrice,
  image,
  extraServices = [],
  experienceConfig = null,
  sections = [],
  wishlist,
  enablePersonalization,
  enableGiftWrapping = false,
  requiresShipping = true,
  disabled = false,
  size = "lg",
  className,
}: Props) {
  const router = useRouter();
  const { addItem } = useCart();
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState<ProductExperienceIntent>("cart");
  const [message, setMessage] = useState("");
  /** Remount modal form fresh each open (avoids reset-in-effect). */
  const [formSession, setFormSession] = useState(0);

  const pricing = resolveProductPricing({ price, salePrice });
  const unit = pricing.currentPrice;
  const canBuy = unit != null && Number.isFinite(unit) && unit >= 0;
  const supportsPersonalization =
    enablePersonalization ??
    shopProductSupportsPersonalization(shopProductType);
  // Modal opens only for personalization or extra services — never for
  // checkout-only order options / delivery / notes.
  const needsModal = productNeedsExperienceModal({
    supportsPersonalization,
    extraServices,
  });
  const addLabel = getProductPrimaryAction("ready_to_buy").label;

  const directAdd = (mode: ProductExperienceIntent) => {
    setMessage("");
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
      order_options: null,
      extra_services: null,
      requires_shipping: requiresShipping,
    });
    if (mode === "checkout") {
      router.push("/checkout");
      return;
    }
    setMessage("تمت الإضافة إلى السلة");
  };

  const openModal = (mode: ProductExperienceIntent) => {
    setMessage("");
    setIntent(mode);
    setFormSession((n) => n + 1);
    setOpen(true);
  };

  const onAddToCart = () => {
    if (!canBuy) return;
    if (needsModal) openModal("cart");
    else directAdd("cart");
  };

  const onBuyNow = () => {
    if (!canBuy) return;
    if (needsModal) openModal("checkout");
    else directAdd("checkout");
  };

  return (
    <div className={className}>
      <PurchaseCtaGroup
        wishlist={wishlist}
        onAddToCart={onAddToCart}
        onBuyNow={onBuyNow}
        addLabel={addLabel}
        disabled={disabled || !canBuy}
        size={size}
        message={message}
      />

      {canBuy && unit != null ? (
        <ProductExperienceModal
          key={formSession}
          open={open}
          onClose={() => setOpen(false)}
          intent={intent}
          shopProductType={shopProductType}
          productId={productId}
          nameAr={nameAr}
          unitPrice={unit}
          compareAtPrice={pricing.onSale ? pricing.regularPrice : null}
          image={image}
          extraServices={extraServices}
          experienceConfig={experienceConfig}
          sections={sections}
          enablePersonalization={supportsPersonalization}
          enableGiftWrapping={
            enableGiftWrapping || supportsPersonalization
          }
          requiresShipping={requiresShipping}
          onSuccess={(mode) => {
            if (mode === "cart") setMessage("تمت الإضافة إلى السلة");
          }}
        />
      ) : null}
    </div>
  );
}
