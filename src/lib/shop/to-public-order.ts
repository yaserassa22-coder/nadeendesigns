import { formatEstimatedDelivery } from "@/lib/shop/shipping";
import type { ShopOrder } from "@/types/shop";

/**
 * Strip admin-only fields before returning an order on the public tracking API.
 * Never expose internal notes, admin URLs, or service-role metadata.
 */
export function toPublicShopOrder(
  order: ShopOrder,
  extras?: { estimated_delivery?: string | null }
): ShopOrder {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip admin-only field
  const { internal_shipping_notes, ...safe } = order;

  return {
    ...safe,
    internal_shipping_notes: null,
    estimated_delivery:
      extras?.estimated_delivery ?? order.estimated_delivery ?? null,
  };
}

/** Map a shipping_regions row (or snapshot) into a customer-facing estimate label. */
export function publicEstimatedDeliveryFromRegion(
  region: {
    estimated_delivery_ar?: string | null;
    estimated_days_min?: number | null;
    estimated_days_max?: number | null;
    estimated_days?: number | null;
  } | null
): string | null {
  return formatEstimatedDelivery(region);
}
