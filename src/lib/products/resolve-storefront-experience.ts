import {
  enabledOrderOptions,
  normalizeExtraServices,
  resolvePersonalizationFee,
  resolveProductExtraServices,
  type ExtraServiceConfig,
  type OrderOptionConfig,
  type ProductExtraServicesConfig,
  type ProductOrderOptionsConfig,
  type ServiceOfferContext,
} from "@/lib/products/order-experience";
import {
  defaultProductExperienceConfig,
  normalizeProductExperienceConfig,
  resolveEffectiveGiftUi,
  storefrontExperienceSections,
  type ExperienceSectionConfig,
  type ProductExperienceConfig,
} from "@/lib/products/experience-designer";
import {
  listExperienceFeatures,
  normalizeProductFeaturesConfig,
  resolveEnabledFeatureIds,
  type ProductFeaturesConfig,
} from "@/lib/products/experience-features";
import {
  applyPurchaseFlowOverride,
  getProductPrimaryAction,
  resolveProductCommerceType,
  type ProductCommerceType,
  type ProductPrimaryAction,
} from "@/lib/products/primary-action";
import { getPurchaseFlowForType } from "@/lib/products/purchase-flows";
import { getStoreSettings } from "@/lib/store/settings";
import type { ShopProductType } from "@/types/shop";

export type ResolvedProductExperience = {
  /**
   * Resolved for Admin/checkout pipelines. Never rendered on PDP/modal.
   * Kept for backward-compatible cart/order persistence if checkout uses them later.
   */
  orderOptions: OrderOptionConfig[];
  extraServices: ExtraServiceConfig[];
  experienceConfig: ProductExperienceConfig;
  /** Storefront-safe sections only (no delivery / notes / order options). */
  sections: ExperienceSectionConfig[];
  featuresConfig: ProductFeaturesConfig | null;
  /** After per-product resolution ∩ global library enabled flags. */
  enabledFeatureIds: string[];
  /** Purchase-flow override applied (Admin → storefront sync). */
  primaryAction: ProductPrimaryAction;
  commerceType: ProductCommerceType;
};

/**
 * Resolve storefront experience + purchase flow for the PDP/modal.
 * Serializable — safe to pass Server → Client as props.
 */
export async function resolveStorefrontProductExperience(input?: {
  productId?: string;
  productType?: string | null;
  categoryId?: string | null;
  collectionId?: string | null;
  shopProductType?: ShopProductType | null;
  /** Fallback commerce type when productType missing (veils/robes → bridal_accessory). */
  fallbackType?: ProductCommerceType;
  order_options_config?: ProductOrderOptionsConfig | null;
  extra_services_config?: ProductExtraServicesConfig | null;
  experience_config?: ProductExperienceConfig | null;
  features_config?: ProductFeaturesConfig | null;
}): Promise<ResolvedProductExperience> {
  const store = await getStoreSettings();
  const commerceType = resolveProductCommerceType(
    input?.productType,
    input?.fallbackType ?? "ready_to_buy"
  );
  const ctx: ServiceOfferContext | null = input?.productId
    ? {
        productId: input.productId,
        productType: commerceType,
        categoryId: input.categoryId ?? null,
        collectionId: input.collectionId ?? null,
        channel: "online",
      }
    : null;

  const baseExperience = input?.experience_config
    ? normalizeProductExperienceConfig(input.experience_config)
    : defaultProductExperienceConfig();

  /** Full library — fee lookup must not depend on product extra-service pick lists. */
  const libraryServices = normalizeExtraServices(store.extra_services).services;

  const giftUi = resolveEffectiveGiftUi(baseExperience.gift_ui, libraryServices);
  const persUi = baseExperience.personalization_ui;
  const libraryPersFee = resolvePersonalizationFee(
    persUi,
    libraryServices,
    true
  );
  const experienceConfig: ProductExperienceConfig = {
    ...baseExperience,
    gift_ui: giftUi,
    personalization_ui: {
      ...(persUi ?? {
        required: false,
        max_characters: 40,
        extra_price: 0,
      }),
      extra_price:
        (persUi?.extra_price ?? 0) > 0
          ? (persUi?.extra_price ?? 0)
          : libraryPersFee,
    },
  };

  const featuresConfig = normalizeProductFeaturesConfig(
    input?.features_config
  );
  let enabledFeatureIds = resolveEnabledFeatureIds({
    features_config: featuresConfig,
    productType: commerceType,
    shopProductType: input?.shopProductType,
  });

  // Global Features Library: disabled rows must hide on storefront.
  const [library, flow] = await Promise.all([
    listExperienceFeatures(),
    getPurchaseFlowForType(commerceType),
  ]);
  if (library.length) {
    const globallyOff = new Set(
      library.filter((f) => !f.enabled).map((f) => f.id)
    );
    if (globallyOff.size) {
      enabledFeatureIds = enabledFeatureIds.filter((id) => !globallyOff.has(id));
    }
  }

  const primaryAction = applyPurchaseFlowOverride(
    getProductPrimaryAction(commerceType),
    flow
  );

  return {
    orderOptions: enabledOrderOptions(
      store.order_options,
      input?.order_options_config
    ),
    extraServices: resolveProductExtraServices(
      store.extra_services,
      input?.extra_services_config,
      ctx
    ),
    experienceConfig,
    sections: storefrontExperienceSections(experienceConfig),
    featuresConfig,
    enabledFeatureIds,
    primaryAction,
    commerceType,
  };
}
