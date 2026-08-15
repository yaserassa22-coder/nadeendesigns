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
  Trash2,
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
  type TrashStats,
} from "@/lib/admin/dashboard-analytics";
import { DashboardCharts } from "@/components/admin/dashboard/DashboardCharts";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  BOOKING_STATUS_LABELS,
} from "@/types";
import {
  getOrderStatusLabel,
  type DeliveryMethod,
  type ShopOrderStatus,
} from "@/types/shop";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n";
import { getServiceTypeLabelLocalized } from "@/lib/i18n/service-labels";

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
  trash?: TrashStats;
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
    <div className="admin-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.8125rem] text-muted">{title}</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f4efe6] text-[#8a7048]">
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
        "admin-surface p-5",
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
  const { t, locale, dir } = useLocale();
  const d = t.admin.dashboardUi;
  const rangeLabels: Record<DateRangePreset, string> = {
    today: d.rangeToday,
    yesterday: d.rangeYesterday,
    last_7_days: d.rangeLast7,
    last_30_days: d.rangeLast30,
    this_month: d.rangeThisMonth,
    last_month: d.rangeLastMonth,
    this_year: d.rangeThisYear,
    last_year: d.rangeLastYear,
    custom: d.customRange,
  };
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
          throw new Error(json.error || d.loadFailed);
        }
        startTransition(() => {
          setData(json);
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : d.loadFailed);
      } finally {
        setLoading(false);
      }
    },
    [d.loadFailed]
  );

  const selectPreset = (next: DateRangePreset) => {
    setPreset(next);
    if (next !== "custom") {
      void load(next);
    }
  };

  const busy = loading || isPending;
  const { kpis, revenueBreakdown, charts, recent, topProducts, shipping, bookingAnalytics, customers, alerts, trash } =
    data;

  return (
    <div className="space-y-8" dir={dir}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.18em] text-[#8a7048]">
            {d.eyebrow}
          </p>
          <h1 className="mt-1.5 text-[1.65rem] font-semibold tracking-tight text-foreground md:text-[1.85rem]">
            {d.title}
          </h1>
          <p className="mt-1.5 max-w-xl text-[0.9375rem] leading-relaxed text-muted">
            {d.subtitle}
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
                {rangeLabels[p.value]}
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
              {d.customRange}
            </button>
          </div>
        </div>
      </div>

      {preset === "custom" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-beige-dark bg-background p-4 sm:flex-row sm:items-end">
          <Input
            label={d.fromDate}
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
          />
          <Input
            label={d.toDate}
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
          />
          <Button
            size="sm"
            loading={busy}
            onClick={() => void load("custom", customFrom, customTo)}
          >
            {d.apply}
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

      <section className="rounded-2xl border border-[#e8e2d8] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-charcoal">{t.admin.shellUi.quickActions}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { href: "/admin/dresses", label: t.admin.shellUi.qaAddProduct },
            { href: "/admin/content/home", label: t.admin.shellUi.qaHomepage },
            { href: "/admin/bookings", label: t.admin.shellUi.qaBookings },
            { href: "/admin/orders", label: t.admin.shellUi.qaOrders },
            { href: "/admin/gallery", label: t.admin.shellUi.qaGallery },
            { href: "/admin/settings", label: t.admin.shellUi.qaSettings },
          ].map((action) => (
            <Link
              key={action.href + action.label}
              href={action.href}
              className="rounded-full border border-[#e8e2d8] bg-[#faf8f5] px-3 py-1.5 text-xs font-medium text-charcoal transition hover:border-[#b89a6a]/50 hover:bg-white"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#e8e2d8] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-charcoal">{t.admin.shellUi.needsAttention}</h2>
        {alerts.length === 0 && bookingAnalytics.pending <= 0 ? (
          <p className="mt-3 text-sm text-muted">{t.admin.shellUi.everythingUpToDate}</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {bookingAnalytics.pending > 0 ? (
              <Link
                href="/admin/bookings"
                className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {t.admin.shellUi.pendingBookings}
                </span>
                <span className="font-[family-name:var(--font-cormorant)] text-xl font-semibold">
                  {bookingAnalytics.pending}
                </span>
              </Link>
            ) : null}
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
                  {alert.id === "orders-awaiting-confirmation"
                    ? d.alertOrdersPending
                    : alert.id === "unknown-shipping-regions"
                      ? d.alertUnknownShipping
                      : alert.id === "pending-delivery-fees"
                        ? d.alertPendingFees
                        : alert.id === "failed-notifications"
                          ? d.alertFailedNotifications
                          : alert.id === "out-of-stock"
                            ? d.alertOutOfStock
                            : alert.title}
                </span>
                <span className="font-[family-name:var(--font-cormorant)] text-xl font-semibold">
                  {alert.count}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        {busy ? (
          Array.from({ length: 11 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <KpiCard
              title={d.kpiTotalRevenue}
              value={formatPrice(kpis.totalRevenue)}
              icon={Wallet}
            />
            <KpiCard title={d.kpiTotalOrders} value={kpis.totalOrders} icon={ShoppingBag} />
            <KpiCard
              title={d.kpiBridalBookings}
              value={kpis.bridalBookings}
              icon={CalendarDays}
            />
            <KpiCard title={d.kpiDeliveryOrders} value={kpis.deliveryOrders} icon={Truck} />
            <KpiCard
              title={d.kpiBoutiquePickup}
              value={kpis.boutiquePickup}
              icon={Store}
            />
            <KpiCard title={d.kpiPending} value={kpis.pendingOrders} icon={Clock3} />
            <KpiCard
              title={d.kpiCompleted}
              value={kpis.completedOrders}
              icon={CheckCircle2}
            />
            <KpiCard title={d.kpiCancelled} value={kpis.cancelledOrders} icon={XCircle} />
            <KpiCard title={d.kpiCustomers} value={kpis.totalCustomers} icon={Users} />
            <KpiCard title={d.kpiProducts} value={kpis.totalProducts} icon={Package} />
            <KpiCard title={d.kpiCategories} value={kpis.totalCategories} icon={Layers} />
            <Link href="/admin/trash" className="block">
              <KpiCard
                title={d.kpiTrash}
                value={trash?.totalInTrash ?? 0}
                hint={
                  trash
                    ? formatMessage(d.trashHint, {
                        orders: trash.ordersInTrash,
                        bookings: trash.bookingsInTrash,
                        products: trash.productsInTrash,
                      })
                    : undefined
                }
                icon={Trash2}
              />
            </Link>
          </>
        )}
      </div>

      <Panel title={d.revenueBreakdown}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(
            [
              [d.revToday, revenueBreakdown.today],
              [d.revThisWeek, revenueBreakdown.thisWeek],
              [d.revThisMonth, revenueBreakdown.thisMonth],
              [d.revThisYear, revenueBreakdown.thisYear],
              [d.revLifetime, revenueBreakdown.lifetime],
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
        <Panel title={d.shippingAnalytics}>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between gap-3">
              <span className="text-muted">{d.deliveryOrders}</span>
              <span className="font-medium">{shipping.deliveryCount}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted">{d.boutiquePickup}</span>
              <span className="font-medium">{shipping.pickupCount}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted">{d.avgShippingFee}</span>
              <span className="font-medium" dir="ltr">
                {formatPrice(shipping.avgShippingFee)}
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted">{d.pendingRegions}</span>
              <span className="font-medium">{shipping.pendingShippingRegions}</span>
            </li>
          </ul>
          {shipping.mostUsedRegions.length > 0 ? (
            <div className="mt-4 border-t border-beige-dark pt-4">
              <p className="mb-2 text-xs text-muted">{d.topRegions}</p>
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

        <Panel title={d.bookingAnalytics}>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between">
              <span className="text-muted">{d.pending}</span>
              <span>{bookingAnalytics.pending}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">{d.confirmed}</span>
              <span>{bookingAnalytics.confirmed}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">{d.completed}</span>
              <span>{bookingAnalytics.completed}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">{d.cancelled}</span>
              <span>{bookingAnalytics.cancelled}</span>
            </li>
          </ul>
        </Panel>

        <Panel title={d.customerAnalytics}>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between">
              <span className="text-muted">{d.newCustomers}</span>
              <span>{customers.newCustomers}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">{d.returningCustomers}</span>
              <span>{customers.returningCustomers}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">{d.ordersPerCustomer}</span>
              <span>{customers.ordersPerCustomer}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">{d.aov}</span>
              <span dir="ltr">{formatPrice(customers.aov)}</span>
            </li>
            {customers.totalGuests != null && (
              <>
                <li className="flex justify-between border-t border-beige-dark pt-3">
                  <span className="text-muted">{d.totalGuests}</span>
                  <span>{customers.totalGuests}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted">{d.returningGuests}</span>
                  <span>{customers.returningGuests ?? 0}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted">{d.registeredCustomers}</span>
                  <span>{customers.registeredCustomers ?? 0}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted">{d.guestConversion}</span>
                  <span>{customers.guestConversionRate ?? 0}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted">{d.abandonedGuestCarts}</span>
                  <span>{customers.abandonedGuestCarts ?? 0}</span>
                </li>
                <li>
                  <Link
                    href="/admin/guests"
                    className="text-xs text-gold hover:underline"
                  >
                    {d.manageGuests}
                  </Link>
                </li>
              </>
            )}
          </ul>
        </Panel>
      </div>

      <Panel
        title={d.topProducts}
        action={
          <Link href="/admin/orders">
            <Button variant="ghost" size="sm">
              {d.ordersLink}
            </Button>
          </Link>
        }
      >
        {topProducts.length === 0 ? (
          <EmptyInline text={d.noProductSales} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-beige-dark text-muted">
                  <th className="px-2 py-2 text-start font-medium">{d.colProduct}</th>
                  <th className="px-2 py-2 text-start font-medium">{d.colOrders}</th>
                  <th className="px-2 py-2 text-start font-medium">{d.colQty}</th>
                  <th className="px-2 py-2 text-start font-medium">{d.colRevenue}</th>
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
          title={d.recentOrders}
          action={
            <Link href="/admin/orders">
              <Button variant="ghost" size="sm">
                {d.viewAll}
              </Button>
            </Link>
          }
        >
          {recent.orders.length === 0 ? (
            <EmptyInline text={d.noOrdersYet} />
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
          title={d.recentBookings}
          action={
            <Link href="/admin/bookings">
              <Button variant="ghost" size="sm">
                {d.viewAll}
              </Button>
            </Link>
          }
        >
          {recent.bookings.length === 0 ? (
            <EmptyInline text={d.noBookingsYet} />
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
                      {getServiceTypeLabelLocalized(booking.service_type, locale)} —{" "}
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

        <Panel title={d.statusUpdates}>
          {recent.statusUpdates.length === 0 ? (
            <EmptyInline text={d.noStatusUpdates} />
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
          title={d.customerMessages}
          action={
            <Link href="/admin/messages">
              <Button variant="ghost" size="sm">
                {d.viewAll}
              </Button>
            </Link>
          }
        >
          {recent.messages.length === 0 ? (
            <EmptyInline text={d.noMessages} />
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
          title={d.notifications}
          className="xl:col-span-2"
          action={
            <Link href="/admin/notifications">
              <Button variant="ghost" size="sm">
                {d.settings}
              </Button>
            </Link>
          }
        >
          {recent.notifications.length === 0 ? (
            <EmptyInline text={d.noNotifications} />
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
