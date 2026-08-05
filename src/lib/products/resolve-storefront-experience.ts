import {
  enabledOrderOptions,
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
  storefrontExperienceSections,
  type ExperienceSectionConfig,
  type ProductExperienceConfig,
} from "@/lib/products/experience-designer";
import {
  normalizeProductFeaturesConfig,
  resolveEnabledFeatureIds,
  type ProductFeaturesConfig,
} from "@/lib/products/experience-features";
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
  enabledFeatureIds: string[];
};

/**
 * Resolve storefront extra services + designer sections for the PDP/modal.
 * Order options are resolved for checkout/admin continuity but never shown on PDP.
 * Serializable — safe to pass Server → Client as props.
 */
export async function resolveStorefrontProductExperience(input?: {
  productId?: string;
  productType?: string | null;
  categoryId?: string | null;
  collectionId?: string | null;
  shopProductType?: ShopProductType | null;
  order_options_config?: ProductOrderOptionsConfig | null;
  extra_services_config?: ProductExtraServicesConfig | null;
  experience_config?: ProductExperienceConfig | null;
  features_config?: ProductFeaturesConfig | null;
}): Promise<ResolvedProductExperience> {
  const store = await getStoreSettings(true);
  const ctx: ServiceOfferContext | null = input?.productId
    ? {
        productId: input.productId,
        productType: input.productType ?? null,
        categoryId: input.categoryId ?? null,
        collectionId: input.collectionId ?? null,
        channel: "online",
      }
    : null;

  const experienceConfig = input?.experience_config
    ? normalizeProductExperienceConfig(input.experience_config)
    : defaultProductExperienceConfig();

  const featuresConfig = normalizeProductFeaturesConfig(
    input?.features_config
  );
  const enabledFeatureIds = resolveEnabledFeatureIds({
    features_config: featuresConfig,
    productType: input?.productType,
    shopProductType: input?.shopProductType,
  });

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
  };
}
