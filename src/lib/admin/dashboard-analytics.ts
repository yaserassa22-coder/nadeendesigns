/**
 * Pure aggregation helpers for the admin executive dashboard.
 * No I/O — all functions operate on already-fetched rows.
 */

import { DRESS_CATEGORY_LABELS, type Booking, type DressCategory } from "@/types";
import type { ShopOrder, ShopOrderItem, ShopOrderStatus } from "@/types/shop";

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "this_year"
  | "custom";

export type ResolvedDateRange = {
  preset: DateRangePreset;
  from: Date;
  to: Date;
  fromIso: string;
  toIso: string;
};

export type NamedCount = { name: string; count: number; revenue?: number };
export type TimePoint = { label: string; value: number; secondary?: number };

export type TopProductRow = {
  product_id: string;
  product_type: string;
  name: string;
  image: string | null;
  orders_count: number;
  quantity: number;
  revenue: number;
};

export type RecentOrderRow = {
  id: string;
  name: string;
  total: number;
  status: string;
  delivery_method: string | null;
  created_at: string;
};

export type RecentBookingRow = {
  id: string;
  name: string;
  service_type: string;
  status: string;
  date: string;
  created_at: string;
};

export type RecentActivityRow = {
  id: string;
  title: string;
  subtitle: string;
  created_at: string;
  href?: string;
};

export type DashboardAlert = {
  id: string;
  severity: "warning" | "danger" | "info";
  title: string;
  count: number;
  href?: string;
};

export type DashboardKpis = {
  totalRevenue: number;
  totalOrders: number;
  bridalBookings: number;
  deliveryOrders: number;
  boutiquePickup: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalCustomers: number;
  totalProducts: number;
  totalCategories: number;
};

export type RevenueBreakdown = {
  today: number;
  thisWeek: number;
  thisMonth: number;
  thisYear: number;
  lifetime: number;
};

export type ShippingAnalytics = {
  deliveryCount: number;
  pickupCount: number;
  mostUsedRegions: NamedCount[];
  avgShippingFee: number;
  pendingShippingRegions: number;
};

export type BookingAnalytics = {
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
};

export type CustomerAnalytics = {
  newCustomers: number;
  returningCustomers: number;
  ordersPerCustomer: number;
  aov: number;
  totalDistinct: number;
};

export type DashboardCharts = {
  revenuePerMonth: TimePoint[];
  ordersPerDay: TimePoint[];
  bookingsPerMonth: TimePoint[];
  deliveryVsPickup: NamedCount[];
  mostOrderedProducts: NamedCount[];
  mostOrderedCategories: NamedCount[];
  mostRequestedRegions: NamedCount[];
};

export type DashboardPayload = {
  range: ResolvedDateRange;
  kpis: DashboardKpis;
  revenueBreakdown: RevenueBreakdown;
  charts: DashboardCharts;
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
};

export type ProductCatalogEntry = {
  id: string;
  name_ar: string;
  product_type: "dress" | "veil" | "bridal_robe";
  category_key?: string | null;
  category_label?: string | null;
  image?: string | null;
  stock_quantity?: number | null;
  is_available?: boolean | null;
};

const PENDING_ORDER_STATUSES: ShopOrderStatus[] = ["pending", "under_review"];
const COMPLETED_ORDER_STATUSES: ShopOrderStatus[] = ["delivered", "completed"];
const REVENUE_EXCLUDED: ShopOrderStatus[] = ["cancelled"];

const MONTH_LABELS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export const DATE_RANGE_PRESETS: {
  value: DateRangePreset;
  label: string;
}[] = [
  { value: "today", label: "اليوم" },
  { value: "yesterday", label: "أمس" },
  { value: "last_7_days", label: "آخر 7 أيام" },
  { value: "last_30_days", label: "آخر 30 يوماً" },
  { value: "this_month", label: "هذا الشهر" },
  { value: "this_year", label: "هذه السنة" },
  { value: "custom", label: "نطاق مخصص" },
];

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function parseYmd(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isDateRangePreset(value: string): value is DateRangePreset {
  return DATE_RANGE_PRESETS.some((p) => p.value === value);
}

export function resolveDateRange(
  preset: DateRangePreset,
  customFrom?: string | null,
  customTo?: string | null,
  now = new Date()
): ResolvedDateRange {
  const todayStart = startOfLocalDay(now);
  let from = todayStart;
  let to = endOfLocalDay(now);

  switch (preset) {
    case "today":
      from = todayStart;
      to = endOfLocalDay(now);
      break;
    case "yesterday": {
      const y = addDays(todayStart, -1);
      from = startOfLocalDay(y);
      to = endOfLocalDay(y);
      break;
    }
    case "last_7_days":
      from = startOfLocalDay(addDays(todayStart, -6));
      to = endOfLocalDay(now);
      break;
    case "last_30_days":
      from = startOfLocalDay(addDays(todayStart, -29));
      to = endOfLocalDay(now);
      break;
    case "this_month":
      from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      to = endOfLocalDay(now);
      break;
    case "this_year":
      from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      to = endOfLocalDay(now);
      break;
    case "custom": {
      const cf = customFrom ? parseYmd(customFrom) : null;
      const ct = customTo ? parseYmd(customTo) : null;
      from = cf ? startOfLocalDay(cf) : startOfLocalDay(addDays(todayStart, -29));
      to = ct ? endOfLocalDay(ct) : endOfLocalDay(now);
      if (from > to) {
        const tmp = from;
        from = startOfLocalDay(to);
        to = endOfLocalDay(tmp);
      }
      break;
    }
  }

  return {
    preset,
    from,
    to,
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
  };
}

export function inDateRange(
  iso: string | null | undefined,
  range: ResolvedDateRange
): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t >= range.from.getTime() && t <= range.to.getTime();
}

export function filterByCreatedAt<T extends { created_at: string }>(
  rows: T[],
  range: ResolvedDateRange
): T[] {
  return rows.filter((r) => inDateRange(r.created_at, range));
}

function isRevenueOrder(order: ShopOrder): boolean {
  return !REVENUE_EXCLUDED.includes(order.status);
}

function orderRevenue(order: ShopOrder): number {
  if (!isRevenueOrder(order)) return 0;
  return Number(order.total ?? 0) || 0;
}

function isDeliveryOrder(order: ShopOrder): boolean {
  if (order.delivery_method === "delivery") return true;
  if (order.delivery_method === "pickup") return false;
  return Boolean(order.shipping_required);
}

function isPickupOrder(order: ShopOrder): boolean {
  return order.delivery_method === "pickup";
}

function customerKey(phone?: string | null, email?: string | null): string | null {
  const p = phone?.trim();
  if (p) return `p:${p}`;
  const e = email?.trim()?.toLowerCase();
  if (e) return `e:${e}`;
  return null;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const idx = Number(m) - 1;
  return `${MONTH_LABELS_AR[idx] ?? m} ${y}`;
}

function dayLabel(key: string): string {
  const [, m, d] = key.split("-");
  return `${d}/${m}`;
}

function regionLabel(order: ShopOrder): string | null {
  const label =
    order.shipping_region_name_ar?.trim() ||
    order.shipping_region_custom?.trim() ||
    order.shipping_region?.trim() ||
    order.shipping_city?.trim() ||
    null;
  return label || null;
}

function categoryLabelForItem(
  item: ShopOrderItem,
  catalog: Map<string, ProductCatalogEntry>
): string {
  const key = `${item.product_type}:${item.product_id}`;
  const entry = catalog.get(key);
  if (entry?.category_label) return entry.category_label;
  if (item.product_type === "veil") return "طرحة العروس";
  if (item.product_type === "bridal_robe") return "برنص العروس";
  if (entry?.category_key && entry.category_key in DRESS_CATEGORY_LABELS) {
    return DRESS_CATEGORY_LABELS[entry.category_key as DressCategory];
  }
  return "فساتين";
}

export function computeRevenueInRange(
  orders: ShopOrder[],
  from: Date,
  to: Date
): number {
  let sum = 0;
  const fromT = from.getTime();
  const toT = to.getTime();
  for (const order of orders) {
    const t = new Date(order.created_at).getTime();
    if (Number.isNaN(t) || t < fromT || t > toT) continue;
    sum += orderRevenue(order);
  }
  return sum;
}

export function computeRevenueBreakdown(
  orders: ShopOrder[],
  now = new Date()
): RevenueBreakdown {
  const todayStart = startOfLocalDay(now);
  const weekStart = startOfLocalDay(addDays(todayStart, -((now.getDay() + 6) % 7)));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  const end = endOfLocalDay(now);
  const lifetimeStart = new Date(1970, 0, 1);

  return {
    today: computeRevenueInRange(orders, todayStart, end),
    thisWeek: computeRevenueInRange(orders, weekStart, end),
    thisMonth: computeRevenueInRange(orders, monthStart, end),
    thisYear: computeRevenueInRange(orders, yearStart, end),
    lifetime: computeRevenueInRange(orders, lifetimeStart, end),
  };
}

export function computeOrderKpis(
  orders: ShopOrder[],
  bookingsInRange: Booking[],
  totalProducts: number,
  totalCategories: number,
  allOrders: ShopOrder[],
  allBookings: Booking[]
): DashboardKpis {
  let totalRevenue = 0;
  let deliveryOrders = 0;
  let boutiquePickup = 0;
  let pendingOrders = 0;
  let completedOrders = 0;
  let cancelledOrders = 0;

  for (const order of orders) {
    totalRevenue += orderRevenue(order);
    if (isDeliveryOrder(order)) deliveryOrders += 1;
    if (isPickupOrder(order)) boutiquePickup += 1;
    if (PENDING_ORDER_STATUSES.includes(order.status)) pendingOrders += 1;
    if (COMPLETED_ORDER_STATUSES.includes(order.status)) completedOrders += 1;
    if (order.status === "cancelled") cancelledOrders += 1;
  }

  const customers = new Set<string>();
  for (const order of allOrders) {
    const key = customerKey(order.phone, order.email);
    if (key) customers.add(key);
  }
  for (const booking of allBookings) {
    const key = customerKey(booking.phone, booking.email);
    if (key) customers.add(key);
  }

  return {
    totalRevenue,
    totalOrders: orders.length,
    bridalBookings: bookingsInRange.length,
    deliveryOrders,
    boutiquePickup,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    totalCustomers: customers.size,
    totalProducts,
    totalCategories,
  };
}

export function computeBookingAnalytics(bookings: Booking[]): BookingAnalytics {
  const result: BookingAnalytics = {
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const b of bookings) {
    if (b.status === "pending") result.pending += 1;
    else if (b.status === "confirmed") result.confirmed += 1;
    else if (b.status === "completed") result.completed += 1;
    else if (b.status === "cancelled") result.cancelled += 1;
  }
  return result;
}

export function computeShippingAnalytics(orders: ShopOrder[]): ShippingAnalytics {
  let deliveryCount = 0;
  let pickupCount = 0;
  let feeSum = 0;
  let feeCount = 0;
  let pendingShippingRegions = 0;
  const regionMap = new Map<string, number>();

  for (const order of orders) {
    if (isPickupOrder(order)) pickupCount += 1;
    else if (isDeliveryOrder(order)) deliveryCount += 1;

    if (
      order.shipping_fee_pending === true ||
      order.region_configured === false
    ) {
      pendingShippingRegions += 1;
    }

    const fee = Number(order.shipping_cost);
    if (Number.isFinite(fee) && fee >= 0 && isDeliveryOrder(order)) {
      feeSum += fee;
      feeCount += 1;
    }

    if (isDeliveryOrder(order)) {
      const region = regionLabel(order);
      if (region) {
        regionMap.set(region, (regionMap.get(region) ?? 0) + 1);
      }
    }
  }

  const mostUsedRegions = [...regionMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    deliveryCount,
    pickupCount,
    mostUsedRegions,
    avgShippingFee: feeCount > 0 ? Math.round(feeSum / feeCount) : 0,
    pendingShippingRegions,
  };
}

export function computeCustomerAnalytics(
  ordersInRange: ShopOrder[],
  allOrders: ShopOrder[],
  allBookings: Booking[],
  range: ResolvedDateRange
): CustomerAnalytics {
  const firstSeen = new Map<string, number>();

  const consider = (
    key: string | null,
    createdAt: string | null | undefined
  ) => {
    if (!key || !createdAt) return;
    const t = new Date(createdAt).getTime();
    if (Number.isNaN(t)) return;
    const prev = firstSeen.get(key);
    if (prev === undefined || t < prev) firstSeen.set(key, t);
  };

  for (const o of allOrders) {
    consider(customerKey(o.phone, o.email), o.created_at);
  }
  for (const b of allBookings) {
    consider(customerKey(b.phone, b.email), b.created_at);
  }

  const periodKeys = new Set<string>();
  let revenue = 0;
  let paidOrders = 0;
  const orderCountByCustomer = new Map<string, number>();

  for (const order of ordersInRange) {
    const key = customerKey(order.phone, order.email);
    if (key) {
      periodKeys.add(key);
      orderCountByCustomer.set(key, (orderCountByCustomer.get(key) ?? 0) + 1);
    }
    const rev = orderRevenue(order);
    if (rev > 0) {
      revenue += rev;
      paidOrders += 1;
    }
  }

  let newCustomers = 0;
  let returningCustomers = 0;
  for (const key of periodKeys) {
    const first = firstSeen.get(key);
    if (first !== undefined && first >= range.from.getTime()) {
      newCustomers += 1;
    } else {
      returningCustomers += 1;
    }
  }

  const ordersPerCustomer =
    periodKeys.size > 0
      ? Math.round(
          ([...orderCountByCustomer.values()].reduce((a, b) => a + b, 0) /
            periodKeys.size) *
            10
        ) / 10
      : 0;

  return {
    newCustomers,
    returningCustomers,
    ordersPerCustomer,
    aov: paidOrders > 0 ? Math.round(revenue / paidOrders) : 0,
    totalDistinct: periodKeys.size,
  };
}

export function computeTopProducts(
  orders: ShopOrder[],
  catalog: Map<string, ProductCatalogEntry>,
  limit = 8
): TopProductRow[] {
  const map = new Map<
    string,
    {
      product_id: string;
      product_type: string;
      name: string;
      image: string | null;
      orderIds: Set<string>;
      quantity: number;
      revenue: number;
    }
  >();

  for (const order of orders) {
    if (!isRevenueOrder(order)) continue;
    for (const item of order.items ?? []) {
      const id = item.product_id || item.name_ar;
      const type = item.product_type || "dress";
      const key = `${type}:${id}`;
      const catalogEntry = catalog.get(key);
      const qty = Number(item.quantity) || 0;
      const line = qty * (Number(item.unit_price) || 0);
      const existing = map.get(key);
      if (existing) {
        existing.orderIds.add(order.id);
        existing.quantity += qty;
        existing.revenue += line;
        if (!existing.image) {
          existing.image =
            item.image ?? catalogEntry?.image ?? null;
        }
      } else {
        map.set(key, {
          product_id: id,
          product_type: type,
          name: item.name_ar || catalogEntry?.name_ar || "منتج",
          image: item.image ?? catalogEntry?.image ?? null,
          orderIds: new Set([order.id]),
          quantity: qty,
          revenue: line,
        });
      }
    }
  }

  return [...map.values()]
    .map((row) => ({
      product_id: row.product_id,
      product_type: row.product_type,
      name: row.name,
      image: row.image,
      orders_count: row.orderIds.size,
      quantity: row.quantity,
      revenue: row.revenue,
    }))
    .sort((a, b) => b.orders_count - a.orders_count || b.revenue - a.revenue)
    .slice(0, limit);
}

export function computeCharts(
  orders: ShopOrder[],
  bookings: Booking[],
  catalog: Map<string, ProductCatalogEntry>,
  range: ResolvedDateRange
): DashboardCharts {
  const revenueMonth = new Map<string, number>();
  const ordersDay = new Map<string, number>();
  const bookingsMonth = new Map<string, number>();
  const productCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const regionCounts = new Map<string, number>();
  let delivery = 0;
  let pickup = 0;

  // Seed day buckets for continuous sparkline within range (cap 62 days)
  const daySpan = Math.min(
    62,
    Math.max(
      1,
      Math.ceil((range.to.getTime() - range.from.getTime()) / 86_400_000) + 1
    )
  );
  for (let i = 0; i < daySpan; i++) {
    const d = addDays(startOfLocalDay(range.from), i);
    if (d.getTime() > range.to.getTime()) break;
    ordersDay.set(dayKey(d), 0);
  }

  for (const order of orders) {
    const d = new Date(order.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const mk = monthKey(d);
    const dk = dayKey(d);
    revenueMonth.set(mk, (revenueMonth.get(mk) ?? 0) + orderRevenue(order));
    ordersDay.set(dk, (ordersDay.get(dk) ?? 0) + 1);

    if (isPickupOrder(order)) pickup += 1;
    else if (isDeliveryOrder(order)) delivery += 1;

    if (isDeliveryOrder(order)) {
      const region = regionLabel(order);
      if (region) regionCounts.set(region, (regionCounts.get(region) ?? 0) + 1);
    }

    if (!isRevenueOrder(order)) continue;
    for (const item of order.items ?? []) {
      const name = item.name_ar || "منتج";
      const qty = Number(item.quantity) || 0;
      productCounts.set(name, (productCounts.get(name) ?? 0) + qty);
      const cat = categoryLabelForItem(item, catalog);
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + qty);
    }
  }

  for (const booking of bookings) {
    const d = new Date(booking.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const mk = monthKey(d);
    bookingsMonth.set(mk, (bookingsMonth.get(mk) ?? 0) + 1);
  }

  const sortKeys = (keys: string[]) => keys.sort((a, b) => a.localeCompare(b));

  return {
    revenuePerMonth: sortKeys([...revenueMonth.keys()]).map((k) => ({
      label: monthLabel(k),
      value: revenueMonth.get(k) ?? 0,
    })),
    ordersPerDay: sortKeys([...ordersDay.keys()]).map((k) => ({
      label: dayLabel(k),
      value: ordersDay.get(k) ?? 0,
    })),
    bookingsPerMonth: sortKeys([...bookingsMonth.keys()]).map((k) => ({
      label: monthLabel(k),
      value: bookingsMonth.get(k) ?? 0,
    })),
    deliveryVsPickup: [
      { name: "توصيل", count: delivery },
      { name: "استلام من البوتيك", count: pickup },
    ],
    mostOrderedProducts: [...productCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    mostOrderedCategories: [...categoryCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    mostRequestedRegions: [...regionCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}

export function buildCatalogMap(
  entries: ProductCatalogEntry[]
): Map<string, ProductCatalogEntry> {
  const map = new Map<string, ProductCatalogEntry>();
  for (const entry of entries) {
    map.set(`${entry.product_type}:${entry.id}`, entry);
  }
  return map;
}

export function computeAlerts(input: {
  pendingConfirmationOrders: number;
  unknownShippingRegions: number;
  pendingDeliveryFees: number;
  failedNotifications: number;
  outOfStockProducts: number;
}): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  if (input.pendingConfirmationOrders > 0) {
    alerts.push({
      id: "orders-awaiting-confirmation",
      severity: "warning",
      title: "طلبات بانتظار التأكيد",
      count: input.pendingConfirmationOrders,
      href: "/admin/orders",
    });
  }
  if (input.unknownShippingRegions > 0) {
    alerts.push({
      id: "unknown-shipping-regions",
      severity: "warning",
      title: "مناطق شحن غير معروفة",
      count: input.unknownShippingRegions,
      href: "/admin/shipping",
    });
  }
  if (input.pendingDeliveryFees > 0) {
    alerts.push({
      id: "pending-delivery-fees",
      severity: "danger",
      title: "رسوم توصيل معلّقة",
      count: input.pendingDeliveryFees,
      href: "/admin/orders",
    });
  }
  if (input.failedNotifications > 0) {
    alerts.push({
      id: "failed-notifications",
      severity: "danger",
      title: "إشعارات فاشلة",
      count: input.failedNotifications,
      href: "/admin/notifications",
    });
  }
  if (input.outOfStockProducts > 0) {
    alerts.push({
      id: "out-of-stock",
      severity: "info",
      title: "منتجات غير متوفرة / نفد المخزون",
      count: input.outOfStockProducts,
      href: "/admin/veils",
    });
  }
  return alerts;
}

export function toRecentOrders(orders: ShopOrder[], limit = 8): RecentOrderRow[] {
  return orders.slice(0, limit).map((o) => ({
    id: o.id,
    name: o.name,
    total: Number(o.total) || 0,
    status: o.status,
    delivery_method: o.delivery_method ?? null,
    created_at: o.created_at,
  }));
}

export function toRecentBookings(
  bookings: Booking[],
  limit = 8
): RecentBookingRow[] {
  return bookings.slice(0, limit).map((b) => ({
    id: b.id,
    name: b.name,
    service_type: b.service_type,
    status: b.status,
    date: b.date,
    created_at: b.created_at,
  }));
}
