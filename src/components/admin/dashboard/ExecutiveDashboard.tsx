"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Package,
  ShoppingBag,
  Store,
  Truck,
  Users,
  Layers,
  XCircle,
  Clock3,
  Wallet,
} from "lucide-react";
import {
  DATE_RANGE_PRESETS,
  type DashboardAlert,
  type DashboardCharts as ChartsData,
  type DashboardKpis,
  type DateRangePreset,
  type RevenueBreakdown,
  type ShippingAnalytics,
  type BookingAnalytics,
  type CustomerAnalytics,
  type TopProductRow,
  type RecentOrderRow,
  type RecentBookingRow,
  type RecentActivityRow,
} from "@/lib/admin/dashboard-analytics";
import { DashboardCharts } from "@/components/admin/dashboard/DashboardCharts";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  BOOKING_STATUS_LABELS,
  getServiceTypeLabel,
} from "@/types";
import {
  getOrderStatusLabel,
  type DeliveryMethod,
  type ShopOrderStatus,
} from "@/types/shop";
import { cn } from "@/lib/utils";

export type DashboardApiResponse = {
  range: { preset: DateRangePreset; from: string; to: string };
  kpis: DashboardKpis;
  revenueBreakdown: RevenueBreakdown;
  charts: ChartsData;
  recent: {
    orders: RecentOrderRow[];
    bookings: RecentBookingRow[];
    statusUpdates: RecentActivityRow[];
    messages: RecentActivityRow[];
    notifications: RecentActivityRow[];
  };
  topProducts: TopProductRow[];
  shipping: ShippingAnalytics;
  bookingAnalytics: BookingAnalytics;
  customers: CustomerAnalytics;
  alerts: DashboardAlert[];
  errors?: { orders: string | null; bookings: string | null };
  error?: string;
};

function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-beige-dark bg-background p-5 shadow-sm transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">{title}</p>
          <p className="mt-2 font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-foreground sm:text-3xl">
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/10 text-gold">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-beige-dark bg-background p-5">
      <div className="h-3 w-20 rounded bg-beige-dark" />
      <div className="mt-4 h-8 w-24 rounded bg-beige-dark" />
    </div>
  );
}

function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-beige-dark bg-background p-5 shadow-sm",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyInline({ text }: { text: string }) {
  return (
    <p className="py-8 text-center text-sm text-muted">{text}</p>
  );
}

function alertTone(severity: DashboardAlert["severity"]) {
  if (severity === "danger")
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200";
  if (severity === "warning")
    return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-beige-dark bg-beige/40 text-foreground";
}

type Props = {
  initialData: DashboardApiResponse;
};

export function ExecutiveDashboard({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [preset, setPreset] = useState<DateRangePreset>(
    initialData.range.preset || "last_30_days"
  );
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (nextPreset: DateRangePreset, from?: string, to?: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ range: nextPreset });
        if (nextPreset === "custom") {
          if (from) params.set("from", from);
          if (to) params.set("to", to);
        }
        const res = await fetch(`/api/admin/dashboard?${params.toString()}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as DashboardApiResponse;
        if (!res.ok) {
          throw new Error(json.error || "تعذر تحميل اللوحة");
        }
        startTransition(() => {
          setData(json);
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "تعذر تحميل اللوحة");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const selectPreset = (next: DateRangePreset) => {
    setPreset(next);
    if (next !== "custom") {
      void load(next);
    }
  };

  const busy = loading || isPending;
  const { kpis, revenueBreakdown, charts, recent, topProducts, shipping, bookingAnalytics, customers, alerts } =
    data;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.25em] text-gold uppercase">
            Executive
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="mt-2 text-muted">
            مؤشرات الأداء، الإيرادات، والنشاط من بيانات المتجر الفعلية
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-wrap gap-2">
            {DATE_RANGE_PRESETS.filter((p) => p.value !== "custom").map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => selectPreset(p.value)}
                disabled={busy}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  preset === p.value
                    ? "border-gold bg-gold/10 text-gold-dark"
                    : "border-beige-dark bg-background text-muted hover:border-gold/50"
                )}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => selectPreset("custom")}
              disabled={busy}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                preset === "custom"
                  ? "border-gold bg-gold/10 text-gold-dark"
                  : "border-beige-dark bg-background text-muted hover:border-gold/50"
              )}
            >
              نطاق مخصص
            </button>
          </div>
        </div>
      </div>

      {preset === "custom" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-beige-dark bg-background p-4 sm:flex-row sm:items-end">
          <Input
            label="من تاريخ"
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
          />
          <Input
            label="إلى تاريخ"
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
          />
          <Button
            size="sm"
            loading={busy}
            onClick={() => void load("custom", customFrom, customTo)}
          >
            تطبيق
          </Button>
        </div>
      )}

      {(data.errors?.orders || data.errors?.bookings || error) && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error && <p>{error}</p>}
          {data.errors?.orders && (
            <p dir="ltr">Orders: {data.errors.orders}</p>
          )}
          {data.errors?.bookings && (
            <p dir="ltr">Bookings: {data.errors.bookings}</p>
          )}
        </div>
      )}

      {alerts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {alerts.map((alert) => (
            <Link
              key={alert.id}
              href={alert.href || "/admin"}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition-opacity hover:opacity-90",
                alertTone(alert.severity)
              )}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {alert.title}
              </span>
              <span className="font-[family-name:var(--font-cormorant)] text-xl font-semibold">
                {alert.count}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        {busy ? (
          Array.from({ length: 11 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <KpiCard
              title="إجمالي الإيرادات"
              value={formatPrice(kpis.totalRevenue)}
              icon={Wallet}
            />
            <KpiCard title="إجمالي الطلبات" value={kpis.totalOrders} icon={ShoppingBag} />
            <KpiCard
              title="حجوزات العروس"
              value={kpis.bridalBookings}
              icon={CalendarDays}
            />
            <KpiCard title="طلبات توصيل" value={kpis.deliveryOrders} icon={Truck} />
            <KpiCard
              title="استلام من البوتيك"
              value={kpis.boutiquePickup}
              icon={Store}
            />
            <KpiCard title="قيد الانتظار" value={kpis.pendingOrders} icon={Clock3} />
            <KpiCard
              title="مكتملة"
              value={kpis.completedOrders}
              icon={CheckCircle2}
            />
            <KpiCard title="ملغاة" value={kpis.cancelledOrders} icon={XCircle} />
            <KpiCard title="العميلات" value={kpis.totalCustomers} icon={Users} />
            <KpiCard title="المنتجات" value={kpis.totalProducts} icon={Package} />
            <KpiCard title="التصنيفات" value={kpis.totalCategories} icon={Layers} />
          </>
        )}
      </div>

      <Panel title="تفصيل الإيرادات">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(
            [
              ["اليوم", revenueBreakdown.today],
              ["هذا الأسبوع", revenueBreakdown.thisWeek],
              ["هذا الشهر", revenueBreakdown.thisMonth],
              ["هذه السنة", revenueBreakdown.thisYear],
              ["مدى الحياة", revenueBreakdown.lifetime],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-beige-dark bg-beige/30 px-4 py-4"
            >
              <p className="text-sm text-muted">{label}</p>
              <p
                className="mt-2 font-[family-name:var(--font-cormorant)] text-2xl text-foreground"
                dir="ltr"
              >
                {formatPrice(value)}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      {busy ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl border border-beige-dark bg-beige/40"
            />
          ))}
        </div>
      ) : (
        <DashboardCharts charts={charts} />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="تحليل الشحن">
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between gap-3">
              <span className="text-muted">طلبات توصيل</span>
              <span className="font-medium">{shipping.deliveryCount}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted">استلام من البوتيك</span>
              <span className="font-medium">{shipping.pickupCount}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted">متوسط رسوم الشحن</span>
              <span className="font-medium" dir="ltr">
                {formatPrice(shipping.avgShippingFee)}
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted">مناطق بانتظار الرسوم</span>
              <span className="font-medium">{shipping.pendingShippingRegions}</span>
            </li>
          </ul>
          {shipping.mostUsedRegions.length > 0 ? (
            <div className="mt-4 border-t border-beige-dark pt-4">
              <p className="mb-2 text-xs text-muted">أكثر المناطق استخداماً</p>
              <ul className="space-y-2 text-sm">
                {shipping.mostUsedRegions.slice(0, 5).map((r) => (
                  <li key={r.name} className="flex justify-between gap-2">
                    <span>{r.name}</span>
                    <span className="text-muted">{r.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Panel>

        <Panel title="تحليل الحجوزات">
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between">
              <span className="text-muted">قيد الانتظار</span>
              <span>{bookingAnalytics.pending}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">مؤكدة</span>
              <span>{bookingAnalytics.confirmed}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">مكتملة</span>
              <span>{bookingAnalytics.completed}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">ملغاة</span>
              <span>{bookingAnalytics.cancelled}</span>
            </li>
          </ul>
        </Panel>

        <Panel title="تحليل العميلات">
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between">
              <span className="text-muted">جديدات</span>
              <span>{customers.newCustomers}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">عائدات</span>
              <span>{customers.returningCustomers}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">طلبات لكل عميلة</span>
              <span>{customers.ordersPerCustomer}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">متوسط قيمة الطلب</span>
              <span dir="ltr">{formatPrice(customers.aov)}</span>
            </li>
          </ul>
        </Panel>
      </div>

      <Panel
        title="أفضل المنتجات"
        action={
          <Link href="/admin/orders">
            <Button variant="ghost" size="sm">
              الطلبات
            </Button>
          </Link>
        }
      >
        {topProducts.length === 0 ? (
          <EmptyInline text="لا توجد مبيعات منتجات في هذه الفترة" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-beige-dark text-muted">
                  <th className="px-2 py-2 text-right font-medium">المنتج</th>
                  <th className="px-2 py-2 text-right font-medium">الطلبات</th>
                  <th className="px-2 py-2 text-right font-medium">الكمية</th>
                  <th className="px-2 py-2 text-right font-medium">الإيراد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige-dark">
                {topProducts.map((p) => (
                  <tr key={`${p.product_type}:${p.product_id}`}>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-beige">
                          {p.image ? (
                            <Image
                              src={p.image}
                              alt={p.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-muted">
                              —
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-foreground">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3">{p.orders_count}</td>
                    <td className="px-2 py-3">{p.quantity}</td>
                    <td className="px-2 py-3" dir="ltr">
                      {formatPrice(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="أحدث الطلبات"
          action={
            <Link href="/admin/orders">
              <Button variant="ghost" size="sm">
                الكل
              </Button>
            </Link>
          }
        >
          {recent.orders.length === 0 ? (
            <EmptyInline text="لا توجد طلبات بعد" />
          ) : (
            <ul className="divide-y divide-beige-dark">
              {recent.orders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">{order.name}</p>
                    <p className="text-muted">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="text-left" dir="ltr">
                    <p className="font-medium">{formatPrice(order.total)}</p>
                    <p className="text-xs text-muted">
                      {getOrderStatusLabel(
                        order.status as ShopOrderStatus,
                        order.delivery_method as DeliveryMethod | null
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="أحدث الحجوزات"
          action={
            <Link href="/admin/bookings">
              <Button variant="ghost" size="sm">
                الكل
              </Button>
            </Link>
          }
        >
          {recent.bookings.length === 0 ? (
            <EmptyInline text="لا توجد حجوزات بعد" />
          ) : (
            <ul className="divide-y divide-beige-dark">
              {recent.bookings.map((booking) => (
                <li
                  key={booking.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">{booking.name}</p>
                    <p className="text-muted">
                      {getServiceTypeLabel(booking.service_type)} —{" "}
                      {formatDate(booking.date)}
                    </p>
                  </div>
                  <span className="rounded-full bg-beige px-3 py-1 text-xs">
                    {BOOKING_STATUS_LABELS[
                      booking.status as keyof typeof BOOKING_STATUS_LABELS
                    ] ?? booking.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="تحديثات الحالة">
          {recent.statusUpdates.length === 0 ? (
            <EmptyInline text="لا توجد تحديثات حالة مسجّلة" />
          ) : (
            <ul className="divide-y divide-beige-dark">
              {recent.statusUpdates.map((row) => (
                <li key={row.id} className="py-3 text-sm">
                  <p className="font-medium text-foreground">{row.title}</p>
                  <p className="text-muted">{row.subtitle}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(row.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="رسائل العميلات"
          action={
            <Link href="/admin/messages">
              <Button variant="ghost" size="sm">
                الكل
              </Button>
            </Link>
          }
        >
          {recent.messages.length === 0 ? (
            <EmptyInline text="لا توجد رسائل" />
          ) : (
            <ul className="divide-y divide-beige-dark">
              {recent.messages.map((row) => (
                <li key={row.id} className="py-3 text-sm">
                  <p className="font-medium text-foreground">{row.title}</p>
                  <p className="text-muted">{row.subtitle}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(row.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="الإشعارات"
          className="xl:col-span-2"
          action={
            <Link href="/admin/notifications">
              <Button variant="ghost" size="sm">
                الإعدادات
              </Button>
            </Link>
          }
        >
          {recent.notifications.length === 0 ? (
            <EmptyInline text="لا توجد سجلات إشعارات" />
          ) : (
            <ul className="grid gap-0 divide-y divide-beige-dark sm:grid-cols-2 sm:gap-x-6 sm:divide-y-0">
              {recent.notifications.map((row) => (
                <li
                  key={row.id}
                  className="border-b border-beige-dark py-3 text-sm sm:border-b"
                >
                  <p className="font-medium text-foreground">{row.title}</p>
                  <p className="text-muted">{row.subtitle}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(row.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
