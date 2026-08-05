"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/components/shop/CartProvider";
import {
  ProductExperienceModal,
  type ProductExperienceIntent,
} from "@/components/product/ProductExperienceModal";
import {
  productNeedsExperienceModal,
  type ExtraServiceConfig,
  type OrderOptionConfig,
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
  orderOptions?: OrderOptionConfig[];
  extraServices?: ExtraServiceConfig[];
  experienceConfig?: ProductExperienceConfig | null;
  sections?: ExperienceSectionConfig[];
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
  // orderOptions accepted for backward-compatible call sites; never used on PDP.
  orderOptions: _unusedOrderOptions,
  extraServices = [],
  experienceConfig = null,
  sections = [],
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
    <div className={className ? `space-y-3 ${className}` : "space-y-3"}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          size={size}
          disabled={disabled || !canBuy}
          onClick={onAddToCart}
          className="sm:flex-1"
        >
          <ShoppingBag className="h-4 w-4" />
          {addLabel}
        </Button>
        <Button
          size={size}
          variant="outline"
          disabled={disabled || !canBuy}
          onClick={onBuyNow}
          className="sm:flex-1"
        >
          <Zap className="h-4 w-4" />
          شراء الآن
        </Button>
      </div>
      {message ? (
        <p className="text-sm text-gold" role="status">
          {message}
        </p>
      ) : null}

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
