"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, FileText, MessageSquare, Printer } from "lucide-react";
import type {
  DeliveryMethod,
  OrderWorkflowAction,
  ShopOrder,
  ShopOrderStatus,
} from "@/types/shop";
import {
  orderToShippingDisplay,
  ShippingDetailsBlock,
} from "@/components/shop/ShippingDetailsBlock";
import {
  getOrderStatusLabel,
  getDeliveryMethodLabel,
  shopOrderStatusLabels,
  SHOP_ORDER_STATUSES,
} from "@/types/shop";
import { getOrderWorkflowActions } from "@/lib/i18n/order-labels";
import { resolveOrderLineName } from "@/lib/i18n/order-item-labels";
import type { ListVisibility } from "@/lib/admin/lifecycle-types";
import { filterLifecycleRows } from "@/lib/admin/query-lifecycle";
import type { LifecycleCapabilities } from "@/lib/admin/permissions";
import { formatDate, formatPrice } from "@/lib/utils";
import { featuredImage } from "@/lib/products/featured-image";
import {
  isDeliveryOrderForSlip,
  orderShowsShippingSection,
} from "@/lib/shop/order-query";
import { Select, Textarea, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PersonalizationSummary } from "@/components/dresses/PersonalizationSummary";
import { GiftOptionsSummary } from "@/components/dresses/GiftOptionsSummary";
import { OrderOptionsSummary } from "@/components/product/OrderOptionsSummary";
import { ExtraServicesSummary } from "@/components/product/ExtraServicesSummary";
import { shopLineDisplayTotal } from "@/lib/products/order-experience";
import { RowLifecycleActions } from "@/components/admin/lifecycle/RowLifecycleActions";
import { VisibilityFilter } from "@/components/admin/lifecycle/VisibilityFilter";
import Image from "next/image";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n";

interface OrdersManagerProps {
  initialOrders: ShopOrder[];
  initialError?: string | null;
  initialCount?: number;
}

function normalizeStatus(status: ShopOrderStatus): ShopOrderStatus {
  return status === "completed" ? "delivered" : status;
}

function orderNumber(id: string) {
  return `ND-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function actionClass(tone?: "default" | "danger" | "gold") {
  if (tone === "danger") {
    return "border-red-200 bg-red-50 text-red-700 hover:bg-red-100";
  }
  if (tone === "gold") {
    return "border-gold/40 bg-gold/10 text-charcoal hover:bg-gold/20";
  }
  return "border-beige-dark bg-white text-charcoal hover:bg-beige/40";
}

export function OrdersManager({
  initialOrders,
  initialError = null,
  initialCount,
}: OrdersManagerProps) {
  const { t, locale } = useLocale();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");

  const [orders, setOrders] = useState(initialOrders);
  const [loadError, setLoadError] = useState(initialError);
  const [filter, setFilter] = useState<ShopOrderStatus | "all">("all");
  const [visibility, setVisibility] = useState<ListVisibility>("active");
  const [methodFilter, setMethodFilter] = useState<
    DeliveryMethod | "all"
  >("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(focusId);
  const [appliedFocus, setAppliedFocus] = useState(focusId);
  const [updating, setUpdating] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const [messageOrderId, setMessageOrderId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messageChannels, setMessageChannels] = useState<
    "whatsapp" | "email" | "both"
  >("both");
  const [sendingMessage, setSendingMessage] = useState(false);

  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const [shippingEditId, setShippingEditId] = useState<string | null>(null);
  const [shipFee, setShipFee] = useState("");
  const [shipTracking, setShipTracking] = useState("");
  const [shipTrackingUrl, setShipTrackingUrl] = useState("");
  const [shipInternalNotes, setShipInternalNotes] = useState("");
  const [savingShipping, setSavingShipping] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  const [caps, setCaps] = useState<LifecycleCapabilities | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch("/api/admin/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (d?.capabilities) setCaps(d.capabilities);
        })
        .catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (focusId && focusId !== appliedFocus) {
    setAppliedFocus(focusId);
    setExpanded(focusId);
  }

  const regionOptions = useMemo(() => {
    const names = new Set<string>();
    for (const o of orders) {
      const n =
        o.shipping_region_name_ar ||
        o.shipping_region_custom ||
        o.shipping_region;
      if (n) names.add(n);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "ar"));
  }, [orders]);

  const filtered = useMemo(() => {
    // Default "all" must include pickup, delivery, unknown region, and pending fee.
    const visible = filterLifecycleRows(
      orders as Array<
        ShopOrder & { is_deleted?: boolean | null; archived_at?: string | null }
      >,
      visibility
    );
    return visible.filter((o) => {
      if (filter !== "all" && normalizeStatus(o.status) !== filter) return false;
      if (methodFilter !== "all") {
        const m = o.delivery_method;
        if (methodFilter === "pickup") {
          if (m !== "pickup") return false;
        } else if (methodFilter === "delivery") {
          // Include explicit delivery, legacy shipping_required, and unknown/pending fee.
          if (m === "pickup") return false;
          if (
            m !== "delivery" &&
            !o.shipping_required &&
            !o.shipping_fee_pending &&
            !o.shipping_address &&
            !o.shipping_region_custom
          ) {
            return false;
          }
        }
      }
      if (regionFilter !== "all") {
        const n =
          o.shipping_region_name_ar ||
          o.shipping_region_custom ||
          o.shipping_region ||
          "";
        if (n !== regionFilter) return false;
      }
      return true;
    });
  }, [orders, filter, methodFilter, regionFilter, visibility]);

  const patchStatus = async (
    id: string,
    payload: {
      status?: ShopOrderStatus;
      action?: OrderWorkflowAction;
      paymentAmount?: number;
    }
  ) => {
    const previous = orders.find((o) => o.id === id);
    const optimisticStatus =
      payload.status ||
      getOrderWorkflowActions(locale).find((a) => a.action === payload.action)
        ?.status;

    // Instant UI feedback — status dropdown applies immediately
    if (optimisticStatus) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, status: optimisticStatus } : o
        )
      );
    }

    setUpdating(id);
    setSnack(null);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.admin.ordersUi.updateFailed);

      if (data.unchanged) {
        setSnack(t.admin.ordersUi.statusUpdated);
        return;
      }

      const nextStatus =
        (data.status as ShopOrderStatus | undefined) ||
        payload.status ||
        getOrderWorkflowActions(locale).find(
          (a) => a.action === payload.action
        )?.status;

      if (data.order) {
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, ...data.order } : o))
        );
      } else if (nextStatus) {
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status: nextStatus } : o))
        );
      }

      const notified = Boolean(data.notified ?? nextStatus);
      setSnack(
        t.admin.ordersUi.statusUpdated +
          (notified ? t.admin.ordersUi.statusUpdateNotifyHint : "")
      );
    } catch (e) {
      // Revert optimistic change
      if (previous) {
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status: previous.status } : o))
        );
      }
      alert(e instanceof Error ? e.message : t.admin.ordersUi.genericError);
    } finally {
      setUpdating(null);
      setPaymentOrderId(null);
    }
  };

  const openShippingEdit = (order: ShopOrder) => {
    setShippingEditId(order.id);
    setShipFee(
      order.shipping_fee_pending
        ? ""
        : String(order.shipping_cost ?? 0)
    );
    setShipTracking(order.tracking_number ?? "");
    setShipTrackingUrl(order.tracking_url ?? "");
    setShipInternalNotes(order.internal_shipping_notes ?? "");
  };

  const saveShippingEdit = async (order: ShopOrder) => {
    setSavingShipping(true);
    try {
      const feeNum = shipFee.trim() === "" ? undefined : Number(shipFee);
      const body: Record<string, unknown> = {
        id: order.id,
        tracking_number: shipTracking.trim() || null,
        tracking_url: shipTrackingUrl.trim() || null,
        internal_shipping_notes: shipInternalNotes.trim() || null,
      };
      if (feeNum !== undefined && Number.isFinite(feeNum) && feeNum >= 0) {
        body.shipping_cost = feeNum;
        body.shipping_fee_pending = false;
        body.region_configured = true;
      }
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.admin.ordersUi.shippingSaveFailed);
      if (data.order) {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, ...data.order } : o))
        );
      }
      setShippingEditId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : t.admin.ordersUi.genericError);
    } finally {
      setSavingShipping(false);
    }
  };

  const runAction = async (order: ShopOrder, action: OrderWorkflowAction) => {
    if (action === "request_payment") {
      setPaymentOrderId(order.id);
      setPaymentAmount(String(order.total ?? ""));
      setExpanded(order.id);
      return;
    }
    if (action === "cancel") {
      const ok = window.confirm(t.admin.ordersUi.cancelConfirm);
      if (!ok) return;
    }
    await patchStatus(order.id, { action });
  };

  const confirmPaymentRequest = async (order: ShopOrder) => {
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert(t.admin.ordersUi.invalidAmount);
      return;
    }
    await patchStatus(order.id, {
      action: "request_payment",
      paymentAmount: amount,
    });
  };

  const sendCustomMessage = async () => {
    if (!messageOrderId || !messageText.trim()) {
      alert(t.admin.ordersUi.messageRequired);
      return;
    }
    setSendingMessage(true);
    try {
      const res = await fetch("/api/orders/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: messageOrderId,
          message: messageText.trim(),
          channels: messageChannels,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.admin.ordersUi.sendFailed);
      alert(t.admin.ordersUi.messageSent);
      setMessageOrderId(null);
      setMessageText("");
    } catch (e) {
      alert(e instanceof Error ? e.message : t.admin.ordersUi.genericError);
    } finally {
      setSendingMessage(false);
    }
  };

  const retryNotifications = async () => {
    setRetrying(true);
    try {
      const res = await fetch("/api/notifications/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 20 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.admin.ordersUi.sendFailed);
      alert(formatMessage(t.admin.ordersUi.retryNotifResult, { count: data.retried ?? 0 }));
    } catch (e) {
      alert(e instanceof Error ? e.message : t.admin.ordersUi.genericError);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">{t.admin.ordersUi.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {t.admin.ordersUi.subtitle}{" "}
            {formatMessage(t.admin.ordersUi.orderCount, {
              count: typeof initialCount === "number" ? initialCount : orders.length,
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/admin/export?module=orders"
            className="inline-flex items-center rounded-xl border border-beige-dark px-4 py-2 text-sm hover:bg-beige"
          >
            {t.admin.ordersUi.exportCsv}
          </a>
          <Button variant="outline" loading={retrying} onClick={retryNotifications}>
            {t.admin.ordersUi.retryFailedNotifications}
          </Button>
        </div>
      </div>

      {snack && (
        <div className="rounded-2xl border border-gold/30 bg-gold/10 px-5 py-3 text-sm text-charcoal">
          {snack}
          <button
            type="button"
            className="ms-3 text-xs text-gold underline"
            onClick={() => setSnack(null)}
          >
            {t.common.close}
          </button>
        </div>
      )}

      {loadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <p className="font-medium">{t.admin.ordersUi.loadFailed}</p>
          <p className="mt-1 whitespace-pre-wrap" dir="ltr">
            {loadError}
          </p>
          <button
            type="button"
            className="mt-2 text-sm text-gold underline"
            onClick={() => {
              setLoadError(null);
              void fetch("/api/orders")
                .then((r) => r.json())
                .then((data) => {
                  if (Array.isArray(data)) setOrders(data);
                  else if (data?.error) setLoadError(String(data.error));
                })
                .catch((e) =>
                  setLoadError(
                    e instanceof Error ? e.message : t.admin.ordersUi.reloadFailed
                  )
                );
            }}
          >
            {t.common.retry}
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label={t.admin.ordersUi.filterStatus}
          value={filter}
          onChange={(e) => setFilter(e.target.value as ShopOrderStatus | "all")}
          options={[
            { value: "all", label: t.admin.ordersUi.all },
            ...SHOP_ORDER_STATUSES.map((value) => ({
              value,
              label: shopOrderStatusLabels(locale)[value],
            })),
          ]}
        />
        <div>
          <p className="mb-1.5 text-sm text-muted">{t.admin.ordersUi.visibility}</p>
          <VisibilityFilter value={visibility} onChange={setVisibility} />
        </div>
        <Select
          label={t.admin.ordersUi.deliveryMethod}
          value={methodFilter}
          onChange={(e) =>
            setMethodFilter(e.target.value as DeliveryMethod | "all")
          }
          options={[
            { value: "all", label: t.admin.ordersUi.all },
            { value: "delivery", label: t.admin.ordersUi.delivery },
            { value: "pickup", label: t.admin.ordersUi.pickup },
          ]}
        />
        <Select
          label={t.admin.ordersUi.region}
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          options={[
            { value: "all", label: t.admin.ordersUi.all },
            ...regionOptions.map((name) => ({ value: name, label: name })),
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-beige-dark bg-ivory/80 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-beige/60 text-muted">
              <tr>
                <th className="px-4 py-3 text-right font-medium">{t.admin.ordersUi.colCustomer}</th>
                <th className="px-4 py-3 text-right font-medium">{t.admin.ordersUi.colItems}</th>
                <th className="px-4 py-3 text-right font-medium">{t.admin.ordersUi.colTotal}</th>
                <th className="px-4 py-3 text-right font-medium">{t.admin.ordersUi.colStatus}</th>
                <th className="px-4 py-3 text-right font-medium">{t.admin.ordersUi.colDetails}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    {orders.length === 0
                      ? t.admin.ordersUi.empty
                      : t.admin.ordersUi.emptyFiltered}
                  </td>
                </tr>
              ) : (
                filtered.map((order) => {
                  const isOpen = expanded === order.id;
                  const status = normalizeStatus(order.status);
                  return (
                    <Fragment key={order.id}>
                      <tr className="border-t border-beige-dark/80">
                        <td className="px-4 py-3">
                          <p className="font-medium text-charcoal">{order.name}</p>
                          <p className="text-xs text-gold" dir="ltr">
                            {orderNumber(order.id)}
                          </p>
                          <p className="mt-1">
                            <span
                              className={
                                order.customer_type === "registered"
                                  ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-800"
                                  : "inline-flex rounded-full border border-beige-dark bg-beige/60 px-2 py-0.5 text-[10px] text-muted"
                              }
                            >
                              {order.customer_type === "registered"
                                ? t.admin.ordersUi.customerRegistered
                                        : t.admin.ordersUi.customerGuest}
                            </span>
                          </p>
                          <p className="text-xs text-muted" dir="ltr">
                            {order.phone}
                          </p>
                          {order.email && (
                            <p className="text-xs text-muted">{order.email}</p>
                          )}
                          <p className="text-xs text-muted">
                            {formatDate(order.created_at)}
                          </p>
                        </td>
                        <td className="px-4 py-3">{formatMessage(t.admin.ordersUi.productCount, { count: order.items?.length ?? 0 })}</td>
                        <td className="px-4 py-3" dir="ltr">
                          {formatPrice(Number(order.total))}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs text-charcoal">
                            {getOrderStatusLabel(status, order.delivery_method, locale)}
                          </span>
                          {order.delivery_method && (
                            <p className="mt-1 text-[11px] text-muted">
                              {getDeliveryMethodLabel(order.delivery_method, locale)}
                            </p>
                          )}
                          <select
                            value={status}
                            disabled={updating === order.id}
                            aria-label={formatMessage(t.admin.ordersUi.changeStatusAria, { id: orderNumber(order.id) })}
                            onChange={(e) => {
                              const next = e.target.value as ShopOrderStatus;
                              if (next === status) return;
                              void patchStatus(order.id, { status: next });
                            }}
                            className="mt-2 w-full max-w-[200px] rounded-lg border border-beige-dark bg-white px-3 py-2 text-xs focus:border-gold focus:ring-2 focus:ring-gold/20"
                          >
                            {SHOP_ORDER_STATUSES.map((value) => (
                              <option key={value} value={value}>
                                {getOrderStatusLabel(
                                  value, order.delivery_method
                                , locale)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setExpanded(isOpen ? null : order.id)
                              }
                              className="inline-flex items-center gap-1 text-gold"
                            >
                              {t.admin.ordersUi.details}
                              {isOpen ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                            <RowLifecycleActions
                              module="orders"
                              id={order.id}
                              archived={Boolean(
                                (
                                  order as ShopOrder & {
                                    archived_at?: string | null;
                                  }
                                ).archived_at
                              )}
                              allowArchive={caps?.canArchive ?? false}
                              allowRestore={caps?.canRestore ?? false}
                              allowSoftDelete={caps?.canSoftDelete ?? false}
                              confirmSoftDelete={t.admin.ordersUi.deleteConfirm}
                              onChanged={(kind) => {
                                if (kind === "soft_delete") {
                                  setOrders((prev) =>
                                    prev.filter((o) => o.id !== order.id)
                                  );
                                  setSnack(t.admin.ordersUi.movedToTrash);
                                  return;
                                }
                                setOrders((prev) =>
                                  prev.map((o) =>
                                    o.id === order.id
                                      ? ({
                                          ...o,
                                          archived_at:
                                            kind === "archive"
                                              ? new Date().toISOString()
                                              : null,
                                        } as ShopOrder)
                                      : o
                                  )
                                );
                              }}
                              onError={(msg) => alert(msg)}
                            />
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-t border-beige-dark/50 bg-gradient-to-l from-beige/40 to-ivory/60">
                          <td colSpan={5} className="space-y-5 px-4 py-5">
                            <div className="flex flex-wrap gap-2">
                              {getOrderWorkflowActions(
                                locale,
                                order.delivery_method
                              ).map((item) => {
                                const active = status === item.status;
                                const label =
                                  item.action === "deliver" &&
                                  order.delivery_method === "pickup"
                                    ? t.admin.ordersUi.pickedUpAction
                                    : item.action === "deliver" &&
                                        order.delivery_method === "delivery"
                                      ? t.admin.ordersUi.deliveredAction
                                      : item.label;
                                return (
                                  <button
                                    key={item.action}
                                    type="button"
                                    disabled={
                                      updating === order.id || active
                                    }
                                    onClick={() =>
                                      runAction(
                                        order,
                                        item.action as OrderWorkflowAction
                                      )
                                    }
                                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 ${actionClass(item.tone)}`}
                                  >
                                    {active ? "✓ " : ""}
                                    {label}
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                onClick={() => {
                                  setMessageOrderId(order.id);
                                  setMessageText("");
                                  setMessageChannels("both");
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-white px-3 py-1.5 text-xs font-medium text-charcoal hover:bg-gold/10"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                {t.admin.ordersUi.sendMessage}
                              </button>
                              {isDeliveryOrderForSlip(order) ? (
                                <a
                                  href={`/admin/orders/${order.id}/shipping-slip`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-white px-3 py-1.5 text-xs font-medium text-charcoal hover:bg-gold/10"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  {order.delivery_method === "pickup"
                                    ? t.admin.ordersUi.printPickup
                                    : t.admin.ordersUi.printShipping}
                                </a>
                              ) : null}
                              {order.invoice_number ? (
                                <a
                                  href={`/admin/orders/${order.id}/invoice-print`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-white px-3 py-1.5 text-xs font-medium text-charcoal hover:bg-gold/10"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  {formatMessage(t.admin.ordersUi.documentLabel, { number: order.invoice_number })}
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  disabled={updating === order.id}
                                  onClick={async () => {
                                    setUpdating(order.id);
                                    try {
                                      const res = await fetch(
                                        `/api/orders/${order.id}/invoice`,
                                        { method: "POST" }
                                      );
                                      const data = await res.json();
                                      if (!res.ok) {
                                        throw new Error(
                                          data.error || t.admin.ordersUi.issueFailed
                                        );
                                      }
                                      if (data.order) {
                                        setOrders((prev) =>
                                          prev.map((o) =>
                                            o.id === order.id
                                              ? { ...o, ...data.order }
                                              : o
                                          )
                                        );
                                      }
                                      window.open(
                                        `/admin/orders/${order.id}/invoice-print`,
                                        "_blank"
                                      );
                                    } catch (e) {
                                      setLoadError(
                                        e instanceof Error
                                          ? e.message
                                          : t.admin.ordersUi.issueFailed
                                      );
                                    } finally {
                                      setUpdating(null);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-beige-dark bg-white px-3 py-1.5 text-xs font-medium text-charcoal hover:bg-beige/40 disabled:opacity-40"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  {t.admin.ordersUi.issueInvoice}
                                </button>
                              )}
                            </div>

                            {paymentOrderId === order.id && (
                              <div className="rounded-2xl border border-gold/30 bg-white/90 p-4">
                                <p className="mb-3 text-sm font-medium text-charcoal">
                                  {t.admin.ordersUi.requestPaymentHint}
                                </p>
                                <div className="flex flex-wrap items-end gap-3">
                                  <label className="block text-sm">
                                    <span className="mb-1 block text-muted">
                                      {t.admin.ordersUi.amount}
                                    </span>
                                    <input
                                      type="number"
                                      min={1}
                                      step="0.01"
                                      value={paymentAmount}
                                      onChange={(e) =>
                                        setPaymentAmount(e.target.value)
                                      }
                                      className="w-40 rounded-xl border border-beige-dark px-3 py-2"
                                      dir="ltr"
                                    />
                                  </label>
                                  <Button
                                    loading={updating === order.id}
                                    onClick={() =>
                                      confirmPaymentRequest(order)
                                    }
                                  >
                                    {t.admin.ordersUi.sendPaymentRequest}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => setPaymentOrderId(null)}
                                  >{t.admin.ordersUi.cancel}</Button>
                                </div>
                              </div>
                            )}

                            {messageOrderId === order.id && (
                              <div className="rounded-2xl border border-gold/30 bg-white/90 p-4">
                                <p className="mb-3 text-sm font-medium text-charcoal">
                                  {t.admin.ordersUi.customMessage}
                                </p>
                                <Textarea
                                  label={t.admin.ordersUi.messageBody}
                                  value={messageText}
                                  onChange={(e) =>
                                    setMessageText(e.target.value)
                                  }
                                  rows={4}
                                  placeholder={t.admin.ordersUi.messagePlaceholder}
                                />
                                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                                  {(
                                    [
                                      ["whatsapp", t.admin.ordersUi.channelWhatsapp],
                                      ["email", t.admin.ordersUi.channelEmail],
                                      ["both", t.admin.ordersUi.channelBoth],
                                    ] as const
                                  ).map(([value, label]) => (
                                    <label
                                      key={value}
                                      className="inline-flex items-center gap-2"
                                    >
                                      <input
                                        type="radio"
                                        name={`channels-${order.id}`}
                                        checked={messageChannels === value}
                                        onChange={() =>
                                          setMessageChannels(value)
                                        }
                                      />
                                      {label}
                                    </label>
                                  ))}
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <Button
                                    loading={sendingMessage}
                                    onClick={sendCustomMessage}
                                  >
                                    {t.admin.ordersUi.send}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => setMessageOrderId(null)}
                                  >
                                    {t.admin.ordersUi.close}
                                  </Button>
                                </div>
                              </div>
                            )}

                            <div className="grid gap-4 lg:grid-cols-2">
                              <section className="rounded-xl border border-beige-dark bg-white p-4">
                                <h3 className="text-sm font-semibold text-gold">
                                  {t.admin.ordersUi.orderInfo}
                                </h3>
                                <p className="mt-2 text-xs text-muted" dir="ltr">
                                  {orderNumber(order.id)}
                                </p>
                                <p className="mt-1 text-sm">
                                  {t.admin.ordersUi.statusColon}{" "}
                                  {getOrderStatusLabel(
                                    status, order.delivery_method
                                  , locale)}
                                </p>
                                <p className="text-sm text-muted">
                                  {t.admin.ordersUi.dateColon} {formatDate(order.created_at)}
                                </p>
                                {(order.items ?? []).map((item, idx) => {
                                  const thumb = featuredImage(
                                    item.image ? [item.image] : undefined
                                  );
                                  return (
                                    <div
                                      key={`${order.id}-${idx}`}
                                      className="mt-3 flex gap-3 border-t border-beige-dark/50 pt-3"
                                    >
                                      <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-beige">
                                        {thumb && (
                                          <Image
                                            src={thumb}
                                            alt=""
                                            fill
                                            className="object-cover"
                                            sizes="40px"
                                          />
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium">
                                          {resolveOrderLineName(item, locale)} ×{" "}
                                          {item.quantity}
                                        </p>
                                        <p className="text-xs text-gold" dir="ltr">
                                          {formatPrice(
                                            shopLineDisplayTotal(item)
                                          )}
                                        </p>
                                        {item.personalization && (
                                          <div className="mt-2">
                                            <PersonalizationSummary
                                              personalization={item.personalization}
                                              compact
                                            />
                                          </div>
                                        )}
                                        <div className="mt-2 space-y-2">
                                          <OrderOptionsSummary
                                            options={item.order_options}
                                            compact
                                          />
                                          <ExtraServicesSummary
                                            services={item.extra_services}
                                            compact
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                                <GiftOptionsSummary
                                  giftOptions={order.gift_options}
                                />
                                {order.notes && (
                                  <p className="mt-3 text-sm text-muted">
                                    {t.admin.ordersUi.notesColon} {order.notes}
                                  </p>
                                )}
                              </section>

                              <section className="rounded-xl border border-beige-dark bg-white p-4">
                                <h3 className="text-sm font-semibold text-gold">
                                  {t.admin.ordersUi.customerInfo}
                                </h3>
                                <dl className="mt-2 space-y-1 text-sm">
                                  <div>
                                    <dt className="inline text-muted">{t.admin.ordersUi.customerType} </dt>
                                    <dd className="inline">
                                      {order.customer_type === "registered"
                                        ? t.admin.ordersUi.customerRegistered
                                        : t.admin.ordersUi.customerGuest}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="inline text-muted">{t.admin.ordersUi.nameColon} </dt>
                                    <dd className="inline">{order.name}</dd>
                                  </div>
                                  <div>
                                    <dt className="inline text-muted">{t.admin.ordersUi.phoneColon} </dt>
                                    <dd className="inline" dir="ltr">
                                      {order.phone}
                                    </dd>
                                  </div>
                                  {order.email && (
                                    <div>
                                      <dt className="inline text-muted">
                                        {t.admin.ordersUi.emailColon}{" "}
                                      </dt>
                                      <dd className="inline">{order.email}</dd>
                                    </div>
                                  )}
                                </dl>
                              </section>

                              <section className="rounded-xl border border-beige-dark bg-white p-4">
                                <h3 className="mb-2 text-sm font-semibold text-gold">
                                  {t.admin.ordersUi.shippingInfo}
                                </h3>
                                {order.shipping_fee_pending && (
                                  <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                    ⚠️ {t.admin.ordersUi.newRegionWarning}
                                    {(
                                      order.shipping_region_custom ||
                                      order.shipping_region_name_ar ||
                                      order.shipping_region
                                    )
                                      ? ` («${
                                          order.shipping_region_custom ||
                                          order.shipping_region_name_ar ||
                                          order.shipping_region
                                        }»)`
                                      : ""}
                                  </p>
                                )}
                                {orderShowsShippingSection(order) ? (
                                  <ShippingDetailsBlock
                                    shipping={orderToShippingDisplay(order)}
                                    showZeroCost
                                    showInternalNotes
                                  />
                                ) : (
                                  <p className="text-sm text-muted">
                                    {t.admin.ordersUi.noShippingNeeded}
                                  </p>
                                )}
                                {order.delivery_method === "delivery" && (
                                  <div className="mt-3 border-t border-beige-dark pt-3">
                                    {shippingEditId === order.id ? (
                                      <div className="space-y-3">
                                        <Input
                                          label={
                                            order.shipping_fee_pending
                                              ? t.admin.ordersUi.setShippingFee
                                              : t.admin.ordersUi.shippingFeeLabel
                                          }
                                          type="number"
                                          min={0}
                                          step="1"
                                          value={shipFee}
                                          onChange={(e) =>
                                            setShipFee(e.target.value)
                                          }
                                          dir="ltr"
                                          placeholder={t.admin.ordersUi.feeExamplePlaceholder}
                                        />
                                        <Input
                                          label={t.admin.ordersUi.trackingNumber}
                                          value={shipTracking}
                                          onChange={(e) =>
                                            setShipTracking(e.target.value)
                                          }
                                          dir="ltr"
                                        />
                                        <Input
                                          label={t.admin.ordersUi.trackingUrl}
                                          value={shipTrackingUrl}
                                          onChange={(e) =>
                                            setShipTrackingUrl(e.target.value)
                                          }
                                          dir="ltr"
                                        />
                                        <Textarea
                                          label={t.admin.ordersUi.internalNotes}
                                          rows={2}
                                          value={shipInternalNotes}
                                          onChange={(e) =>
                                            setShipInternalNotes(e.target.value)
                                          }
                                        />
                                        <div className="flex flex-wrap gap-2">
                                          <Button
                                            size="sm"
                                            loading={savingShipping}
                                            onClick={() =>
                                              void saveShippingEdit(order)
                                            }
                                          >
                                            {t.admin.ordersUi.saveShipping}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                              setShippingEditId(null)
                                            }
                                          >{t.admin.ordersUi.cancel}</Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openShippingEdit(order)}
                                      >
                                        {order.shipping_fee_pending
                                          ? t.admin.ordersUi.setFeeTracking
                                          : t.admin.ordersUi.editFeeTracking}
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </section>

                              <section className="rounded-xl border border-beige-dark bg-white p-4">
                                <h3 className="text-sm font-semibold text-gold">
                                  {t.admin.ordersUi.paymentInfo}
                                </h3>
                                <dl className="mt-2 space-y-1 text-sm">
                                  <div className="flex justify-between gap-2">
                                    <dt className="text-muted">{t.admin.ordersUi.productsTotal}</dt>
                                    <dd dir="ltr">
                                      {formatPrice(
                                        (order.items ?? []).reduce(
                                          (s, i) => s + shopLineDisplayTotal(i),
                                          0
                                        )
                                      )}
                                    </dd>
                                  </div>
                                  <div className="flex justify-between gap-2">
                                    <dt className="text-muted">{t.admin.ordersUi.shippingFeeLabel}</dt>
                                    <dd dir="ltr">
                                      {order.delivery_method === "delivery"
                                        ? order.shipping_fee_pending
                                          ? t.admin.ordersUi.feePending
                                          : Number(order.shipping_cost ?? 0) > 0
                                            ? formatPrice(
                                                Number(order.shipping_cost)
                                              )
                                            : t.admin.ordersUi.free
                                        : order.delivery_method === "pickup"
                                          ? t.admin.ordersUi.free
                                          : order.shipping_required
                                            ? order.shipping_fee_pending
                                              ? t.admin.ordersUi.feePending
                                              : Number(order.shipping_cost ?? 0) >
                                                  0
                                                ? formatPrice(
                                                    Number(order.shipping_cost)
                                                  )
                                                : t.admin.ordersUi.free
                                            : "—"}
                                    </dd>
                                  </div>
                                  <div className="flex justify-between gap-2 border-t border-beige-dark pt-2 font-semibold">
                                    <dt>
                                      {order.shipping_fee_pending
                                        ? t.admin.ordersUi.productsTotalAlt
                                        : t.admin.ordersUi.grandTotal}
                                    </dt>
                                    <dd className="text-gold" dir="ltr">
                                      {formatPrice(Number(order.total))}
                                    </dd>
                                  </div>
                                  <div className="pt-1 text-xs text-muted">
                                    {t.admin.ordersUi.paymentWorkflowColon}{" "}
                                    {getOrderStatusLabel(
                                      status, order.delivery_method
                                    , locale)}
                                  </div>
                                </dl>
                              </section>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
