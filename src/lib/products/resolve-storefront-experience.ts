import {
  enabledOrderOptions,
  resolveProductExtraServices,
  type ExtraServiceConfig,
  type OrderOptionConfig,
  type ProductExtraServicesConfig,
  type ProductOrderOptionsConfig,
} from "@/lib/products/order-experience";
import { getStoreSettings } from "@/lib/store/settings";

export type ResolvedProductExperience = {
  orderOptions: OrderOptionConfig[];
  extraServices: ExtraServiceConfig[];
};

/**
 * Resolve storefront order options + extra services for a product page.
 * Serializable — safe to pass Server → Client as props.
 */
export async function resolveStorefrontProductExperience(input?: {
  order_options_config?: ProductOrderOptionsConfig | null;
  extra_services_config?: ProductExtraServicesConfig | null;
}): Promise<ResolvedProductExperience> {
  const store = await getStoreSettings(true);
  return {
    orderOptions: enabledOrderOptions(
      store.order_options,
      input?.order_options_config
    ),
    extraServices: resolveProductExtraServices(
      store.extra_services,
      input?.extra_services_config
    ),
  };
}
