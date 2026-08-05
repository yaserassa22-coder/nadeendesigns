"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCart } from "@/components/shop/CartProvider";
import {
  OrderOptionsFields,
  type OrderOptionValues,
} from "@/components/product/OrderOptionsFields";
import { ExtraServicesFields } from "@/components/product/ExtraServicesFields";
import {
  buildLineExtraServices,
  buildLineOrderOptions,
  validateOrderOptionValues,
  type ExtraServiceConfig,
  type OrderOptionConfig,
} from "@/lib/products/order-experience";
import { resolveProductPricing } from "@/lib/products/pricing";
import { getProductPrimaryAction } from "@/lib/products/primary-action";
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
  requiresShipping?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * Add-to-cart panel with dynamic order options + extra services.
 * Used when store/product config enables any option or service.
 * Does not replace veil/robe ShopCustomizeAndBuy personalization.
 */
export function ProductExperienceBuy({
  shopProductType = "dress",
  productId,
  nameAr,
  price,
  salePrice,
  image,
  orderOptions = [],
  extraServices = [],
  requiresShipping = true,
  disabled = false,
  size = "lg",
  className,
}: Props) {
  const router = useRouter();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [orderOptionValues, setOrderOptionValues] = useState<OrderOptionValues>(
    {}
  );
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const pricing = resolveProductPricing({ price, salePrice });
  const unit = pricing.currentPrice;
  const canBuy = unit != null && Number.isFinite(unit) && unit >= 0;
  const label = getProductPrimaryAction("ready_to_buy").label;

  const addToCart = () => {
    setErrors({});
    setMessage("");
    if (!canBuy || unit == null) return;

    const optionErrors = validateOrderOptionValues(
      orderOptions,
      orderOptionValues
    );
    if (Object.keys(optionErrors).length) {
      setErrors(optionErrors);
      return;
    }

    const lineOrderOptions = buildLineOrderOptions(
      orderOptions,
      orderOptionValues
    );
    const lineExtraServices = buildLineExtraServices(
      extraServices,
      selectedExtraIds
    );

    addItem({
      product_type: shopProductType,
      product_id: productId,
      name_ar: nameAr,
      unit_price: unit,
      compare_at_price: pricing.onSale ? pricing.regularPrice : null,
      quantity,
      image: image ?? undefined,
      personalization: null,
      gift_options: null,
      order_options: lineOrderOptions.length ? lineOrderOptions : null,
      extra_services: lineExtraServices.length ? lineExtraServices : null,
      requires_shipping: requiresShipping,
    });
    setMessage("تمت الإضافة إلى السلة");
    router.push("/cart");
  };

  return (
    <div className={className ? `space-y-4 ${className}` : "space-y-4"}>
      <OrderOptionsFields
        options={orderOptions}
        values={orderOptionValues}
        onChange={setOrderOptionValues}
        errors={errors}
      />
      <ExtraServicesFields
        services={extraServices}
        selectedIds={selectedExtraIds}
        onChange={setSelectedExtraIds}
      />
      <Input
        label="الكمية"
        type="number"
        min={1}
        max={20}
        dir="ltr"
        value={String(quantity)}
        onChange={(e) =>
          setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
        }
      />
      <Button
        size={size}
        disabled={disabled || !canBuy}
        onClick={addToCart}
      >
        <ShoppingBag className="h-4 w-4" />
        {label}
      </Button>
      {message ? (
        <p className="text-sm text-gold" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
