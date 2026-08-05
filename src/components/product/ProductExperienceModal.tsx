"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ShoppingBag, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCart } from "@/components/shop/CartProvider";
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
  defaultSelectedServiceIds,
  enforceRequiredServiceIds,
  type ExtraServiceConfig,
} from "@/lib/products/order-experience";
import {
  storefrontExperienceSections,
  type ExperienceSectionConfig,
  type ProductExperienceConfig,
} from "@/lib/products/experience-designer";
import {
  shopTypeToPersonalizationType,
  validatePersonalization,
} from "@/lib/products/personalization";
import { giftOptionsSchema } from "@/lib/validations/gift";
import { cn } from "@/lib/utils";
import type { GiftOptions, ProductPersonalization } from "@/types";
import type { ShopProductType } from "@/types/shop";

export type ProductExperienceIntent = "cart" | "checkout";

type Props = {
  open: boolean;
  onClose: () => void;
  intent?: ProductExperienceIntent;
  shopProductType: ShopProductType;
  productId: string;
  nameAr: string;
  unitPrice: number;
  compareAtPrice?: number | null;
  image?: string | null;
  extraServices?: ExtraServiceConfig[];
  experienceConfig?: ProductExperienceConfig | null;
  sections?: ExperienceSectionConfig[];
  enablePersonalization?: boolean;
  enableGiftWrapping?: boolean;
  requiresShipping?: boolean;
  onSuccess?: (intent: ProductExperienceIntent) => void;
};

function SectionShell({
  section,
  children,
}: {
  section: ExperienceSectionConfig;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!section.collapsed);
  if (!children) return null;
  return (
    <div className="rounded-3xl border border-beige-dark/80 bg-white/60">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-start"
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <h3 className="text-base font-semibold text-charcoal">
            {section.title_ar || section.title || section.id}
          </h3>
          {section.description_ar ? (
            <p className="mt-0.5 text-xs text-muted">{section.description_ar}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted transition-transform",
            open ? "rotate-180" : ""
          )}
        />
      </button>
      {open ? <div className="px-5 pb-5">{children}</div> : null}
    </div>
  );
}

/**
 * Luxury Product Experience Modal (Sprint 2A MASTER — Final).
 * PDP content ONLY: Personalization · Extra Services · Gift · Quantity · sticky Summary · CTAs.
 * Delivery / order notes / order options never render here (checkout only).
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
  extraServices = [],
  experienceConfig = null,
  sections: sectionsProp,
  enablePersonalization = false,
  enableGiftWrapping = false,
  requiresShipping = true,
  onSuccess,
}: Props) {
  const router = useRouter();
  const { addItem } = useCart();
  const personalizationType = shopTypeToPersonalizationType(shopProductType);

  const sections = useMemo(() => {
    const source = sectionsProp?.length
      ? sectionsProp
      : storefrontExperienceSections(experienceConfig);
    // Hard gate — never surface checkout-only sections even from stale props.
    return source.filter((s) =>
      ["personalization", "extra_services", "gift_options", "summary"].includes(
        s.id
      )
    );
  }, [sectionsProp, experienceConfig]);

  const [quantity, setQuantity] = useState(1);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>(() =>
    defaultSelectedServiceIds(extraServices)
  );
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
    () =>
      extraServices.filter(
        (s) => selectedExtraIds.includes(s.id) || s.required
      ),
    [extraServices, selectedExtraIds]
  );

  const summaryEnabled = sections.some(
    (s) => s.id === "summary" && s.enabled
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

    const selected = enforceRequiredServiceIds(
      extraServices,
      selectedExtraIds
    );
    const lineExtraServices = buildLineExtraServices(extraServices, selected);

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
      // Delivery / notes / order options collected at checkout only.
      order_options: null,
      extra_services: lineExtraServices.length ? lineExtraServices : null,
      requires_shipping: requiresShipping,
    });

    onSuccess?.(mode);
    onClose();
    setSubmitting(false);

    if (mode === "checkout") {
      router.push("/checkout");
    }
  };

  const renderSection = (section: ExperienceSectionConfig) => {
    switch (section.id) {
      case "personalization":
        if (!enablePersonalization || !personalizationType) return null;
        return (
          <SectionShell key={section.id} section={section}>
            <VeilRobePersonalizationFields
              personalizationType={personalizationType}
              value={personalization}
              onChange={setPersonalization}
              errors={errors}
            />
          </SectionShell>
        );
      case "gift_options":
        if (!enableGiftWrapping) return null;
        return (
          <SectionShell key={section.id} section={section}>
            <GiftWrappingSection
              value={gift}
              onChange={setGift}
              errors={errors}
            />
          </SectionShell>
        );
      case "extra_services":
        if (!extraServices.length) return null;
        return (
          <SectionShell key={section.id} section={section}>
            <ExtraServicesFields
              services={extraServices}
              selectedIds={selectedExtraIds}
              onChange={setSelectedExtraIds}
              title={section.title_ar || section.title}
              description={section.description_ar || section.description}
            />
          </SectionShell>
        );
      case "summary":
        // Sticky footer owns the live summary — skip accordion duplicate.
        return null;
      default:
        // order_options / delivery / order_notes — never on PDP
        return null;
    }
  };

  if (!open) return null;

  const contentSections = sections.filter((s) => s.id !== "summary");
  const hasDesignerContent = contentSections.some((s) => s.enabled);

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

        <PersonalizationFonts className="flex-1 space-y-4 overflow-y-auto px-5 py-5 md:px-6">
          {hasDesignerContent
            ? contentSections.map((s) => renderSection(s))
            : null}

          {/* Fallback when designer disabled all content sections */}
          {!hasDesignerContent ? (
            <>
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
              {extraServices.length > 0 ? (
                <ExtraServicesFields
                  services={extraServices}
                  selectedIds={selectedExtraIds}
                  onChange={setSelectedExtraIds}
                />
              ) : null}
            </>
          ) : null}

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

          {errors.form ? (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {errors.form}
            </p>
          ) : null}
        </PersonalizationFonts>

        {/* Sticky live summary + purchase actions (mobile + desktop) */}
        <div className="sticky bottom-0 border-t border-beige-dark/70 bg-ivory/95 px-5 py-4 backdrop-blur-sm md:px-6">
          {summaryEnabled || !hasDesignerContent ? (
            <ProductExperiencePriceSummary
              className="mb-3 rounded-2xl border border-gold/30 bg-white/80 p-3 text-sm md:p-4"
              baseUnitPrice={unitPrice}
              quantity={quantity}
              selectedServices={selectedServices}
            />
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
    </div>
  );
}
