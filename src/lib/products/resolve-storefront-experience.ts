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
  enabledExperienceSections,
  normalizeProductExperienceConfig,
  type ExperienceSectionConfig,
  type ProductExperienceConfig,
} from "@/lib/products/experience-designer";
import { getStoreSettings } from "@/lib/store/settings";

export type ResolvedProductExperience = {
  orderOptions: OrderOptionConfig[];
  extraServices: ExtraServiceConfig[];
  experienceConfig: ProductExperienceConfig;
  sections: ExperienceSectionConfig[];
};

/**
 * Resolve storefront order options + extra services + designer sections.
 * Serializable — safe to pass Server → Client as props.
 */
export async function resolveStorefrontProductExperience(input?: {
  productId?: string;
  productType?: string | null;
  categoryId?: string | null;
  collectionId?: string | null;
  order_options_config?: ProductOrderOptionsConfig | null;
  extra_services_config?: ProductExtraServicesConfig | null;
  experience_config?: ProductExperienceConfig | null;
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
    sections: enabledExperienceSections(experienceConfig),
  };
}
