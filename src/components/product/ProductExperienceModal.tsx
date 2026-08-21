"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { PurchaseCtaGroup } from "@/components/ui/experience";
import { useCart } from "@/components/shop/CartProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatMessage, localizedName } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n";
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
  excludeExperienceOwnedServices,
  resolvePersonalizationFee,
  type ExtraServiceConfig,
} from "@/lib/products/order-experience";
import {
  resolveEffectiveGiftUi,
  resolveGiftOptionsFee,
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
  nameEn?: string | null;
  nameHe?: string | null;
  unitPrice: number;
  compareAtPrice?: number | null;
  image?: string | null;
  extraServices?: ExtraServiceConfig[];
  experienceConfig?: ProductExperienceConfig | null;
  sections?: ExperienceSectionConfig[];
  enablePersonalization?: boolean;
  enableGiftWrapping?: boolean;
  requiresShipping?: boolean;
  /** Feature library — font/color UI gates. */
  showFontSelection?: boolean;
  showColorSelection?: boolean;
  onSuccess?: (intent: ProductExperienceIntent) => void;
};

function resolveExperienceSectionTitle(
  section: ExperienceSectionConfig,
  t: Dictionary
): string {
  switch (section.id) {
    case "personalization":
      return t.personalizationUi.formTitle;
    case "gift_options":
      return t.gift.sectionTitle;
    case "extra_services":
      return t.product.extraServices;
    case "summary":
      return t.checkout.orderSummary;
    default:
      return section.title || section.title_ar || section.id;
  }
}

function SectionShell({
  section,
  children,
}: {
  section: ExperienceSectionConfig;
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(!section.collapsed);
  if (!children) return null;
  const title = resolveExperienceSectionTitle(section, t);
  return (
    <div className="rounded-[var(--xp-card-radius-lg)] border border-[color:var(--xp-border)] bg-[color:var(--xp-surface)]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-start"
        onClick={() => setOpen((v) => !v)}
      >
        <h3 className="text-base font-semibold text-charcoal">{title}</h3>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted transition-transform duration-300",
            open ? "rotate-180" : ""
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-beige-dark/40 px-5 py-5">{children}</div>
      ) : null}
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
  // `intent` retained on Props for callers; Buy Now is always primary gold.
  shopProductType,
  productId,
  nameAr,
  nameEn,
  nameHe,
  unitPrice,
  compareAtPrice = null,
  image,
  extraServices = [],
  experienceConfig = null,
  sections: sectionsProp,
  enablePersonalization = false,
  enableGiftWrapping = false,
  requiresShipping = true,
  showFontSelection = true,
  showColorSelection = true,
  onSuccess,
}: Props) {
  const { t, locale, dir } = useLocale();
  const router = useRouter();
  const { addItem } = useCart();
  const displayName = localizedName(
    { name_ar: nameAr, name_en: nameEn, name_he: nameHe },
    locale,
    nameAr
  );
  const personalizationType = shopTypeToPersonalizationType(shopProductType);
  const persUi = experienceConfig?.personalization_ui;
  const personalizationRequired =
    shopProductType !== "accessory_item" && Boolean(persUi?.required);
  const personalizationMaxChars = Math.max(
    1,
    Math.min(200, Math.floor(persUi?.max_characters ?? 25) || 25)
  );

  /** Deduped list — writing / gift catalog rows belong to their own sections. */
  const displayExtraServices = useMemo(
    () =>
      excludeExperienceOwnedServices(extraServices, {
        giftSectionActive: enableGiftWrapping,
        hideWriting: true,
      }),
    [extraServices, enableGiftWrapping]
  );

  const resolvedPersonalizationFee = useMemo(() => {
    const fromConfig = Math.max(
      0,
      experienceConfig?.personalization_ui?.extra_price ?? 0
    );
    if (fromConfig > 0) return fromConfig;
    return resolvePersonalizationFee(
      experienceConfig?.personalization_ui,
      extraServices,
      true
    );
  }, [experienceConfig?.personalization_ui, extraServices]);

  const giftUi = useMemo(() => {
    const base = experienceConfig?.gift_ui;
    if (base && (base.wrap_price > 0 || base.card_price > 0)) {
      return base;
    }
    return resolveEffectiveGiftUi(base, extraServices);
  }, [experienceConfig?.gift_ui, extraServices]);

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
    defaultSelectedServiceIds(displayExtraServices)
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
    // Fresh opt-in each time — never pre-select personalization / gift wrap.
    setPersonalization(
      defaultVeilRobePersonalizationState(personalizationType ?? "veils")
    );
    setGift(DEFAULT_GIFT_STATE);
    setErrors({});
    setQuantity(1);
    setSelectedExtraIds(defaultSelectedServiceIds(displayExtraServices));
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, personalizationType, displayExtraServices]);

  const selectedServices = useMemo(
    () =>
      displayExtraServices.filter(
        (s) => selectedExtraIds.includes(s.id) || s.required
      ),
    [displayExtraServices, selectedExtraIds]
  );

  const summaryEnabled = sections.some(
    (s) => s.id === "summary" && s.enabled
  );
  const showQuantity =
    experienceConfig?.purchase_ui?.show_quantity !== false;

  const personalizationFee =
    enablePersonalization &&
    (personalizationRequired || personalization.enabled)
      ? resolvedPersonalizationFee
      : 0;

  const giftWrapFee =
    enableGiftWrapping && gift.enabled
      ? Math.max(0, giftUi.wrap_price)
      : 0;
  const giftCardFee =
    enableGiftWrapping && gift.enabled && gift.giftCard
      ? Math.max(0, giftUi.card_price)
      : 0;
  const giftFee = resolveGiftOptionsFee(giftUi, {
    enabled: enableGiftWrapping && gift.enabled,
    gift_card: gift.giftCard,
  });

  /** Legacy fallback only when no designer config was provided at all. */
  const allowLegacyFallback =
    experienceConfig == null &&
    (!sectionsProp || sectionsProp.length === 0);

  const buildPersonalizationPayload = ():
    | ProductPersonalization
    | null
    | undefined => {
    if (!enablePersonalization || !personalizationType) return null;
    const mustPersonalize =
      personalizationRequired || personalization.enabled;
    if (!mustPersonalize) return null;
    const textAr = personalization.textAr.slice(0, personalizationMaxChars);
    const textEn = personalization.textEn.slice(0, personalizationMaxChars);
    if (
      textAr.length > personalizationMaxChars ||
      textEn.length > personalizationMaxChars
    ) {
      setErrors({
        form: formatMessage(t.product.personalizationMaxChars, {
          max: personalizationMaxChars,
        }),
      });
      return undefined;
    }
    const result = validatePersonalization({
      product_type: personalizationType,
      dress_id: productId,
      dress_name_ar: nameAr,
      writing_language: personalization.writingLanguage,
      text_ar: textAr,
      text_en: textEn,
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
      displayExtraServices,
      selectedExtraIds
    );
    const lineExtraServices = buildLineExtraServices(
      displayExtraServices,
      selected
    );

    addItem({
      product_type: shopProductType,
      product_id: productId,
      name_ar: nameAr,
      name_en: nameEn ?? null,
      name_he: nameHe ?? null,
      unit_price: unitPrice,
      compare_at_price: compareAtPrice,
      quantity,
      image: image ?? undefined,
      personalization: pers,
      gift_options: giftOptions,
      // Delivery / notes / order options collected at checkout only.
      order_options: null,
      extra_services: lineExtraServices.length ? lineExtraServices : null,
      personalization_fee:
        pers && personalizationFee > 0 ? personalizationFee : null,
      gift_fee: giftOptions && giftFee > 0 ? giftFee : null,
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
              maxCharacters={personalizationMaxChars}
              required={personalizationRequired}
              extraPrice={Math.max(0, resolvedPersonalizationFee)}
              showFontSelection={showFontSelection}
              showColorSelection={showColorSelection}
              hideTitle
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
              wrapPrice={Math.max(0, giftUi.wrap_price)}
              cardPrice={Math.max(0, giftUi.card_price)}
            />
          </SectionShell>
        );
      case "extra_services":
        if (!displayExtraServices.length) return null;
        return (
          <SectionShell key={section.id} section={section}>
            <ExtraServicesFields
              services={displayExtraServices}
              selectedIds={selectedExtraIds}
              onChange={setSelectedExtraIds}
              title=""
              description=""
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

  // Portal to body — modal must escape the PDP sticky column stacking context
  // so gallery nav arrows cannot paint over the dialog.
  const dialog = (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4"
      dir={dir}
    >
      <button
        type="button"
        aria-label={t.common.close}
        className="absolute inset-0 bg-charcoal/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-experience-title"
        className="relative z-10 flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.75rem] border border-beige-dark/60 bg-white shadow-[0_28px_90px_rgba(44,36,25,0.18)] sm:rounded-[1.75rem]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-beige-dark/50 px-6 py-5">
          <h2
            id="product-experience-title"
            className="font-[family-name:var(--font-cormorant)] text-2xl tracking-wide text-charcoal"
          >
            {displayName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:bg-beige hover:text-charcoal"
            aria-label={t.common.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <PersonalizationFonts className="flex-1 space-y-4 overflow-y-auto px-5 py-5 md:px-6">
          {hasDesignerContent
            ? contentSections.map((s) => renderSection(s))
            : null}

          {/* Legacy products only — never re-enable sections Admin turned off */}
          {!hasDesignerContent && allowLegacyFallback ? (
            <>
              {enablePersonalization && personalizationType ? (
                <VeilRobePersonalizationFields
                  personalizationType={personalizationType}
                  value={personalization}
                  onChange={setPersonalization}
                  errors={errors}
                  maxCharacters={personalizationMaxChars}
                  required={personalizationRequired}
                  extraPrice={Math.max(0, resolvedPersonalizationFee)}
                  showFontSelection={showFontSelection}
                  showColorSelection={showColorSelection}
                />
              ) : null}
              {enableGiftWrapping ? (
                <GiftWrappingSection
                  value={gift}
                  onChange={setGift}
                  errors={errors}
                  wrapPrice={Math.max(0, giftUi.wrap_price)}
                  cardPrice={Math.max(0, giftUi.card_price)}
                />
              ) : null}
              {displayExtraServices.length > 0 ? (
                <ExtraServicesFields
                  services={displayExtraServices}
                  selectedIds={selectedExtraIds}
                  onChange={setSelectedExtraIds}
                />
              ) : null}
            </>
          ) : null}

          <div className="max-w-[8rem]">
            {showQuantity ? (
              <Input
                label={t.common.quantity}
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
            ) : null}
          </div>

          {errors.form ? (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {errors.form}
            </p>
          ) : null}
        </PersonalizationFonts>

        {/* Sticky live summary + purchase actions (mobile + desktop) */}
        <div className="sticky bottom-0 border-t border-beige-dark/70 bg-ivory/95 px-5 py-4 backdrop-blur-sm md:px-6">
          {summaryEnabled || (!hasDesignerContent && allowLegacyFallback) ? (
            <ProductExperiencePriceSummary
              className="mb-3"
              baseUnitPrice={unitPrice}
              quantity={quantity}
              selectedServices={selectedServices}
              personalizationFee={personalizationFee}
              giftWrapFee={giftWrapFee}
              giftCardFee={giftCardFee}
            />
          ) : null}
          <PurchaseCtaGroup
            onAddToCart={() => commit("cart")}
            onBuyNow={() => commit("checkout")}
            disabled={submitting}
            size="lg"
            secondaryAction={
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="text-sm text-muted underline-offset-4 hover:text-charcoal hover:underline disabled:opacity-50"
              >
                {t.common.cancel}
              </button>
            }
          />
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return dialog;
  return createPortal(dialog, document.body);
}
