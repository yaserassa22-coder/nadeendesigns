"use client";

import { Fragment, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import type { OrderWorkflowAction, ShopOrder, ShopOrderStatus } from "@/types/shop";
import {
  orderToShippingDisplay,
  ShippingDetailsBlock,
} from "@/components/shop/ShippingDetailsBlock";
import {
  ORDER_WORKFLOW_ACTIONS,
  SHOP_ORDER_STATUSES,
  SHOP_ORDER_STATUS_LABELS,
} from "@/types/shop";
import { formatDate, formatPrice } from "@/lib/utils";
import { featuredImage } from "@/lib/products/featured-image";
import { Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PersonalizationSummary } from "@/components/dresses/PersonalizationSummary";
import { GiftOptionsSummary } from "@/components/dresses/GiftOptionsSummary";
import Image from "next/image";

interface OrdersManagerProps {
  initialOrders: ShopOrder[];
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

export function OrdersManager({ initialOrders }: OrdersManagerProps) {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");

  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState<ShopOrderStatus | "all">("all");
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

  if (focusId && focusId !== appliedFocus) {
    setAppliedFocus(focusId);
    setExpanded(focusId);
  }

  const filtered = useMemo(
    () =>
      filter === "all"
        ? orders
        : orders.filter((o) => normalizeStatus(o.status) === filter),
    [orders, filter]
  );

  const patchStatus = async (
    id: string,
    payload: {
      status?: ShopOrderStatus;
      action?: OrderWorkflowAction;
      paymentAmount?: number;
    }
  ) => {
    setUpdating(id);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل التحديث");
      if (data.unchanged) return;

      const nextStatus =
        (data.status as ShopOrderStatus | undefined) ||
        payload.status ||
        ORDER_WORKFLOW_ACTIONS.find((a) => a.action === payload.action)
          ?.status;

      if (nextStatus) {
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status: nextStatus } : o))
        );
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setUpdating(null);
      setPaymentOrderId(null);
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
      const ok = window.confirm("هل تريدين إلغاء هذا الطلب؟ سيتم إشعار العميلة.");
      if (!ok) return;
    }
    await patchStatus(order.id, { action });
  };

  const confirmPaymentRequest = async (order: ShopOrder) => {
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("أدخلي مبلغاً صالحاً");
      return;
    }
    await patchStatus(order.id, {
      action: "request_payment",
      paymentAmount: amount,
    });
  };

  const sendCustomMessage = async () => {
    if (!messageOrderId || !messageText.trim()) {
      alert("اكتبي نص الرسالة");
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
      if (!res.ok) throw new Error(data.error ?? "فشل الإرسال");
      alert("تم إرسال الرسالة");
      setMessageOrderId(null);
      setMessageText("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "حدث خطأ");
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
      if (!res.ok) throw new Error(data.error ?? "فشل إعادة المحاولة");
      alert(`تمت إعادة المحاولة لـ ${data.retried ?? 0} إشعار(ات).`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">🛒 الطلبات</h1>
          <p className="mt-1 text-sm text-muted">
            سير عمل الطلب الكامل — كل تغيير حالة يُرسل واتساب وإيميل تلقائياً
          </p>
        </div>
        <Button variant="outline" loading={retrying} onClick={retryNotifications}>
          إعادة إرسال الإشعارات الفاشلة
        </Button>
      </div>

      <Select
        label="تصفية الحالة"
        value={filter}
        onChange={(e) => setFilter(e.target.value as ShopOrderStatus | "all")}
        options={[
          { value: "all", label: "الكل" },
          ...SHOP_ORDER_STATUSES.map((value) => ({
            value,
            label: SHOP_ORDER_STATUS_LABELS[value],
          })),
        ]}
      />

      <div className="overflow-hidden rounded-2xl border border-beige-dark bg-ivory/80 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-beige/60 text-muted">
              <tr>
                <th className="px-4 py-3 text-right font-medium">العميلة</th>
                <th className="px-4 py-3 text-right font-medium">العناصر</th>
                <th className="px-4 py-3 text-right font-medium">المجموع</th>
                <th className="px-4 py-3 text-right font-medium">الحالة</th>
                <th className="px-4 py-3 text-right font-medium">تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    {orders.length === 0
                      ? "لا توجد طلبات بعد"
                      : "لا توجد طلبات مطابقة للتصفية"}
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
                        <td className="px-4 py-3">{order.items?.length ?? 0} منتج</td>
                        <td className="px-4 py-3" dir="ltr">
                          {formatPrice(Number(order.total))}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs text-charcoal">
                            {SHOP_ORDER_STATUS_LABELS[status]}
                          </span>
                          <select
                            value={status}
                            disabled={updating === order.id}
                            aria-label={`تغيير حالة طلب ${orderNumber(order.id)}`}
                            onChange={(e) =>
                              patchStatus(order.id, {
                                status: e.target.value as ShopOrderStatus,
                              })
                            }
                            className="mt-2 w-full max-w-[200px] rounded-lg border border-beige-dark bg-white px-3 py-2 text-xs focus:border-gold focus:ring-2 focus:ring-gold/20"
                          >
                            {SHOP_ORDER_STATUSES.map((value) => (
                              <option key={value} value={value}>
                                {SHOP_ORDER_STATUS_LABELS[value]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded(isOpen ? null : order.id)
                            }
                            className="inline-flex items-center gap-1 text-gold"
                          >
                            تفاصيل
                            {isOpen ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-t border-beige-dark/50 bg-gradient-to-l from-beige/40 to-ivory/60">
                          <td colSpan={5} className="space-y-5 px-4 py-5">
                            <div className="flex flex-wrap gap-2">
                              {ORDER_WORKFLOW_ACTIONS.map((item) => {
                                const active = status === item.status;
                                return (
                                  <button
                                    key={item.action}
                                    type="button"
                                    disabled={
                                      updating === order.id || active
                                    }
                                    onClick={() => runAction(order, item.action)}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 ${actionClass(item.tone)}`}
                                  >
                                    {active ? "✓ " : ""}
                                    {item.label}
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
                                إرسال رسالة
                              </button>
                            </div>

                            {paymentOrderId === order.id && (
                              <div className="rounded-2xl border border-gold/30 bg-white/90 p-4">
                                <p className="mb-3 text-sm font-medium text-charcoal">
                                  طلب الدفعة — المبلغ وتعليمات الدفع تُرسل عبر
                                  الإيميل والواتساب
                                </p>
                                <div className="flex flex-wrap items-end gap-3">
                                  <label className="block text-sm">
                                    <span className="mb-1 block text-muted">
                                      المبلغ
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
                                    إرسال طلب الدفعة
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => setPaymentOrderId(null)}
                                  >
                                    إلغاء
                                  </Button>
                                </div>
                              </div>
                            )}

                            {messageOrderId === order.id && (
                              <div className="rounded-2xl border border-gold/30 bg-white/90 p-4">
                                <p className="mb-3 text-sm font-medium text-charcoal">
                                  إرسال رسالة مخصصة للعميلة
                                </p>
                                <Textarea
                                  label="نص الرسالة"
                                  value={messageText}
                                  onChange={(e) =>
                                    setMessageText(e.target.value)
                                  }
                                  rows={4}
                                  placeholder="اكتبي رسالتكِ هنا..."
                                />
                                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                                  {(
                                    [
                                      ["whatsapp", "واتساب"],
                                      ["email", "إيميل"],
                                      ["both", "كلاهما"],
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
                                    إرسال
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => setMessageOrderId(null)}
                                  >
                                    إغلاق
                                  </Button>
                                </div>
                              </div>
                            )}

                            <div className="grid gap-4 lg:grid-cols-2">
                              <section className="rounded-xl border border-beige-dark bg-white p-4">
                                <h3 className="text-sm font-semibold text-gold">
                                  معلومات الطلب
                                </h3>
                                <p className="mt-2 text-xs text-muted" dir="ltr">
                                  {orderNumber(order.id)}
                                </p>
                                <p className="mt-1 text-sm">
                                  الحالة: {SHOP_ORDER_STATUS_LABELS[status]}
                                </p>
                                <p className="text-sm text-muted">
                                  التاريخ: {formatDate(order.created_at)}
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
                                          {item.name_ar} × {item.quantity}
                                        </p>
                                        <p className="text-xs text-gold" dir="ltr">
                                          {formatPrice(
                                            item.unit_price * item.quantity
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
                                      </div>
                                    </div>
                                  );
                                })}
                                <GiftOptionsSummary
                                  giftOptions={order.gift_options}
                                />
                                {order.notes && (
                                  <p className="mt-3 text-sm text-muted">
                                    ملاحظات: {order.notes}
                                  </p>
                                )}
                              </section>

                              <section className="rounded-xl border border-beige-dark bg-white p-4">
                                <h3 className="text-sm font-semibold text-gold">
                                  معلومات العميلة
                                </h3>
                                <dl className="mt-2 space-y-1 text-sm">
                                  <div>
                                    <dt className="inline text-muted">الاسم: </dt>
                                    <dd className="inline">{order.name}</dd>
                                  </div>
                                  <div>
                                    <dt className="inline text-muted">الهاتف: </dt>
                                    <dd className="inline" dir="ltr">
                                      {order.phone}
                                    </dd>
                                  </div>
                                  {order.email && (
                                    <div>
                                      <dt className="inline text-muted">
                                        البريد:{" "}
                                      </dt>
                                      <dd className="inline">{order.email}</dd>
                                    </div>
                                  )}
                                </dl>
                              </section>

                              <section className="rounded-xl border border-beige-dark bg-white p-4">
                                <h3 className="mb-2 text-sm font-semibold text-gold">
                                  معلومات الشحن
                                </h3>
                                {order.shipping_required ||
                                orderToShippingDisplay(order).address ? (
                                  <ShippingDetailsBlock
                                    shipping={orderToShippingDisplay(order)}
                                    showZeroCost
                                  />
                                ) : (
                                  <p className="text-sm text-muted">
                                    لا يتطلب شحناً (فساتين / بدون اكسسوارات).
                                  </p>
                                )}
                              </section>

                              <section className="rounded-xl border border-beige-dark bg-white p-4">
                                <h3 className="text-sm font-semibold text-gold">
                                  معلومات الدفع
                                </h3>
                                <dl className="mt-2 space-y-1 text-sm">
                                  <div className="flex justify-between gap-2">
                                    <dt className="text-muted">مجموع المنتجات</dt>
                                    <dd dir="ltr">
                                      {formatPrice(
                                        (order.items ?? []).reduce(
                                          (s, i) =>
                                            s + i.unit_price * i.quantity,
                                          0
                                        )
                                      )}
                                    </dd>
                                  </div>
                                  <div className="flex justify-between gap-2">
                                    <dt className="text-muted">رسوم الشحن</dt>
                                    <dd dir="ltr">
                                      {order.shipping_required
                                        ? Number(order.shipping_cost ?? 0) > 0
                                          ? formatPrice(
                                              Number(order.shipping_cost)
                                            )
                                          : "مجاني"
                                        : "—"}
                                    </dd>
                                  </div>
                                  <div className="flex justify-between gap-2 border-t border-beige-dark pt-2 font-semibold">
                                    <dt>الإجمالي</dt>
                                    <dd className="text-gold" dir="ltr">
                                      {formatPrice(Number(order.total))}
                                    </dd>
                                  </div>
                                  <div className="pt-1 text-xs text-muted">
                                    حالة الدفع ضمن سير العمل:{" "}
                                    {SHOP_ORDER_STATUS_LABELS[status]}
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
