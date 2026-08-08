import { getDictionary } from "./dictionaries";
import type { Locale } from "./types";
import type { DeliveryMethod, ShopOrderStatus } from "@/types/shop";

/** Locale-aware shop order status label (Arabic-first via getDictionary fallback). */
export function getShopOrderStatusLabel(
  status: ShopOrderStatus,
  locale: Locale = "ar",
  deliveryMethod?: DeliveryMethod | null
): string {
  const labels = getDictionary(locale).orders.status;
  if (status === "delivered" && deliveryMethod === "pickup") {
    return labels.pickedUp;
  }
  return labels[status] ?? String(status);
}

/** Locale-aware delivery method label. */
export function getDeliveryMethodLabel(
  method: DeliveryMethod,
  locale: Locale = "ar"
): string {
  return getDictionary(locale).orders.deliveryMethods[method] ?? String(method);
}

/** Full status label map for the given locale (filters / selects). */
export function shopOrderStatusLabels(
  locale: Locale = "ar"
): Record<ShopOrderStatus, string> {
  const s = getDictionary(locale).orders.status;
  return {
    pending: s.pending,
    under_review: s.under_review,
    confirmed: s.confirmed,
    awaiting_payment: s.awaiting_payment,
    payment_received: s.payment_received,
    in_production: s.in_production,
    ready_for_pickup: s.ready_for_pickup,
    shipped: s.shipped,
    delivered: s.delivered,
    cancelled: s.cancelled,
    completed: s.completed,
  };
}

/** Full delivery method label map for the given locale. */
export function deliveryMethodLabels(
  locale: Locale = "ar"
): Record<DeliveryMethod, string> {
  const d = getDictionary(locale).orders.deliveryMethods;
  return { pickup: d.pickup, delivery: d.delivery };
}

export type OrderWorkflowActionKey =
  | "under_review"
  | "confirm"
  | "request_payment"
  | "payment_received"
  | "start_production"
  | "ready"
  | "ship"
  | "deliver"
  | "cancel";

export type LocalizedWorkflowAction = {
  action: OrderWorkflowActionKey;
  label: string;
  status: ShopOrderStatus;
  tone?: "default" | "danger" | "gold";
};

/** Workflow action buttons with locale-aware labels. */
export function getOrderWorkflowActions(
  locale: Locale = "ar",
  method?: DeliveryMethod | null
): LocalizedWorkflowAction[] {
  const w = getDictionary(locale).admin.ordersUi.workflow;
  const all: LocalizedWorkflowAction[] = [
    { action: "under_review", label: w.underReview, status: "under_review" },
    { action: "confirm", label: w.confirm, status: "confirmed", tone: "gold" },
    {
      action: "request_payment",
      label: w.requestPayment,
      status: "awaiting_payment",
      tone: "gold",
    },
    {
      action: "payment_received",
      label: w.paymentReceived,
      status: "payment_received",
    },
    {
      action: "start_production",
      label: w.startProduction,
      status: "in_production",
    },
    { action: "ready", label: w.ready, status: "ready_for_pickup" },
    { action: "ship", label: w.ship, status: "shipped" },
    {
      action: "deliver",
      label: w.deliver,
      status: "delivered",
      tone: "gold",
    },
    { action: "cancel", label: w.cancel, status: "cancelled", tone: "danger" },
  ];

  if (method === "pickup") {
    return all.filter((a) => a.action !== "ship");
  }
  if (method === "delivery") {
    return all.filter((a) => a.action !== "ready");
  }
  return all;
}
