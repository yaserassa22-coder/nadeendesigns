"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCart } from "@/components/shop/CartProvider";
import {
  OrderOptionsFields,
  type OrderOptionValues,
} from "@/components/product/OrderOptionsFields";
import { ExtraServicesFields } from "@/components/product/ExtraServicesFields";
import { ProductExperiencePriceSummary } from "@/components/product/ProductExperiencePriceSummary";
import {
  defaultVeilRobePersonalizationState,
  VeilRobePersonalizationFields,
  type VeilRobePersonalizationState,
} from "@/components/product/VeilRobePersonalizationFields";
import {
  DEFAULT_GIFT_STATE,
  GiftWrappingSection,
  type GiftWrappingState,
} from "@/components/dresses/GiftWrappingSection";
import { PersonalizationFonts } from "@/components/dresses/PersonalizationFonts";
import {
  buildLineExtraServices,
  buildLineOrderOptions,
  validateOrderOptionValues,
  type ExtraServiceConfig,
  type OrderOptionConfig,
} from "@/lib/products/order-experience";
import {
  shopTypeToPersonalizationType,
  validatePersonalization,
} from "@/lib/products/personalization";
import { giftOptionsSchema } from "@/lib/validations/gift";
import type { GiftOptions, ProductPersonalization } from "@/types";
import type { ShopProductType } from "@/types/shop";

export type ProductExperienceIntent = "cart" | "checkout";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Preferred primary action when opening (Buy Now highlights checkout). */
  intent?: ProductExperienceIntent;
  shopProductType: ShopProductType;
  productId: string;
  nameAr: string;
  unitPrice: number;
  compareAtPrice?: number | null;
  image?: string | null;
  orderOptions?: OrderOptionConfig[];
  extraServices?: ExtraServiceConfig[];
  /** Veil/robe embroidery — wraps existing personalization UI. */
  enablePersonalization?: boolean;
  /** Keep gift wrapping section (veil/robe legacy flow). */
  enableGiftWrapping?: boolean;
  requiresShipping?: boolean;
  /** Called after successful add (parent may show toast). */
  onSuccess?: (intent: ProductExperienceIntent) => void;
};

/**
 * Single reusable Product Experience Modal:
 * Personalization + Order Options + Extra Services + Live Price Summary.
 * Buttons: Cancel | Add to Cart | Buy Now
 */
export function ProductExperienceModal({
  open,
  onClose,
  intent = "cart",
  shopProductType,
  productId,
  nameAr,
  unitPrice,
  compareAtPrice = null,
  image,
  orderOptions = [],
  extraServices = [],
  enablePersonalization = false,
  enableGiftWrapping = false,
  requiresShipping = true,
  onSuccess,
}: Props) {
  const router = useRouter();
  const { addItem } = useCart();
  const personalizationType = shopTypeToPersonalizationType(shopProductType);

  const [quantity, setQuantity] = useState(1);
  const [orderOptionValues, setOrderOptionValues] = useState<OrderOptionValues>(
    {}
  );
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [personalization, setPersonalization] =
    useState<VeilRobePersonalizationState>(() =>
      personalizationType
        ? defaultVeilRobePersonalizationState(personalizationType)
        : defaultVeilRobePersonalizationState("veils")
    );
  const [gift, setGift] = useState<GiftWrappingState>(DEFAULT_GIFT_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const selectedServices = useMemo(
    () => extraServices.filter((s) => selectedExtraIds.includes(s.id)),
    [extraServices, selectedExtraIds]
  );

  const buildPersonalizationPayload = ():
    | ProductPersonalization
    | null
    | undefined => {
    if (!enablePersonalization || !personalizationType) return null;
    if (!personalization.enabled) return null;
    const result = validatePersonalization({
      product_type: personalizationType,
      dress_id: productId,
      dress_name_ar: nameAr,
      writing_language: personalization.writingLanguage,
      text_ar: personalization.textAr,
      text_en: personalization.textEn,
      font_ar: personalization.fontAr,
      font_en: personalization.fontEn,
      color: personalization.color,
      position: personalization.position,
    });
    if (!result.ok) {
      setErrors(result.fieldErrors);
      return undefined;
    }
    return result.data;
  };

  const buildGiftPayload = (): GiftOptions | null | undefined => {
    if (!enableGiftWrapping || !gift.enabled) return null;
    const parsed = giftOptionsSchema.safeParse({
      enabled: true as const,
      gift_box: gift.giftBox,
      gift_card: gift.giftCard,
      gift_message: gift.giftMessage,
      sender_name: gift.senderName,
      recipient_name: gift.recipientName,
      hide_price: gift.hidePrice,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors((prev) => ({ ...prev, ...next }));
      return undefined;
    }
    return parsed.data;
  };

  const commit = (mode: ProductExperienceIntent) => {
    setErrors({});
    setSubmitting(true);

    const pers = buildPersonalizationPayload();
    if (pers === undefined) {
      setSubmitting(false);
      return;
    }

    const giftOptions = buildGiftPayload();
    if (giftOptions === undefined) {
      setSubmitting(false);
      return;
    }

    const optionErrors = validateOrderOptionValues(
      orderOptions,
      orderOptionValues
    );
    if (Object.keys(optionErrors).length) {
      setErrors(optionErrors);
      setSubmitting(false);
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
      unit_price: unitPrice,
      compare_at_price: compareAtPrice,
      quantity,
      image: image ?? undefined,
      personalization: pers,
      gift_options: giftOptions,
      order_options: lineOrderOptions.length ? lineOrderOptions : null,
      extra_services: lineExtraServices.length ? lineExtraServices : null,
      requires_shipping: requiresShipping,
    });

    onSuccess?.(mode);
    onClose();
    setSubmitting(false);

    if (mode === "checkout") {
      router.push("/checkout");
    }
    // Add to Cart: stay on storefront (no redirect)
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
      dir="rtl"
    >
      <button
        type="button"
        aria-label="إغلاق"
        className="absolute inset-0 bg-charcoal/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-experience-title"
        className="relative z-10 flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-beige-dark bg-white shadow-[0_24px_80px_rgba(44,36,25,0.2)] sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-beige-dark/70 px-5 py-4 md:px-6">
          <div>
            <p className="text-xs text-gold">تجربة المنتج</p>
            <h2
              id="product-experience-title"
              className="text-lg font-bold text-charcoal md:text-xl"
            >
              {nameAr}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:bg-beige hover:text-charcoal"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <PersonalizationFonts className="flex-1 space-y-5 overflow-y-auto px-5 py-5 md:px-6">
          {enablePersonalization && personalizationType ? (
            <VeilRobePersonalizationFields
              personalizationType={personalizationType}
              value={personalization}
              onChange={setPersonalization}
              errors={errors}
            />
          ) : null}

          {enableGiftWrapping ? (
            <GiftWrappingSection
              value={gift}
              onChange={setGift}
              errors={errors}
            />
          ) : null}

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
              setQuantity(
                Math.max(1, Math.min(20, Number(e.target.value) || 1))
              )
            }
          />

          <ProductExperiencePriceSummary
            baseUnitPrice={unitPrice}
            quantity={quantity}
            selectedServices={selectedServices}
          />

          {errors.form ? (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {errors.form}
            </p>
          ) : null}
        </PersonalizationFonts>

        <div className="flex flex-col gap-2 border-t border-beige-dark/70 bg-ivory/80 px-5 py-4 sm:flex-row sm:items-center md:px-6">
          <Button
            variant="outline"
            size="lg"
            className="sm:order-3"
            onClick={onClose}
            disabled={submitting}
          >
            إلغاء
          </Button>
          <Button
            size="lg"
            className="sm:order-1 sm:flex-1"
            disabled={submitting}
            onClick={() => commit("cart")}
          >
            <ShoppingBag className="h-4 w-4" />
            أضيفي للسلة
          </Button>
          <Button
            size="lg"
            variant={intent === "checkout" ? "primary" : "outline"}
            className="sm:order-2 sm:flex-1"
            disabled={submitting}
            onClick={() => commit("checkout")}
          >
            <Zap className="h-4 w-4" />
            شراء الآن
          </Button>
        </div>
      </div>
    </div>
  );
}
