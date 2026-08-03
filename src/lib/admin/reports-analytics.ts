/**
 * Pure aggregation for Report Center — read-only analytics on fetched rows.
 */

import {
  buildCatalogMap,
  inDateRange,
  resolveDateRange,
  type DateRangePreset,
  type NamedCount,
  type ProductCatalogEntry,
  type ResolvedDateRange,
  type TimePoint,
} from "@/lib/admin/dashboard-analytics";
import { DRESS_CATEGORY_LABELS, type Booking, type DressCategory } from "@/types";
import type { ShopOrder, ShopOrderItem, ShopOrderStatus } from "@/types/shop";
import type {
  BookingsMetrics,
  BusinessInsight,
  CategoriesMetrics,
  CategoryRow,
  CustomerRow,
  CustomersMetrics,
  FinancialMetrics,
  ProductRow,
  ProductsMetrics,
  ReportFilters,
  ReportsCharts,
  SalesMetrics,
  ShippingMetrics,
} from "@/lib/admin/reports-types";

const REVENUE_EXCLUDED: ShopOrderStatus[] = ["cancelled"];
const OUTSTANDING: ShopOrderStatus[] = ["pending", "under_review"];

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

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dayLabel(key: string): string {
  const [, m, d] = key.split("-");
  return `${d}/${m}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const idx = Number(m) - 1;
  return `${MONTH_LABELS_AR[idx] ?? m} ${y}`;
}

function isRevenueOrder(order: ShopOrder): boolean {
  return !REVENUE_EXCLUDED.includes(order.status);
}

function orderRevenue(order: ShopOrder): number {
  if (!isRevenueOrder(order)) return 0;
  return Number(order.total ?? 0) || 0;
}

function orderDiscount(order: ShopOrder): number {
  const meta = order as ShopOrder & { discount?: number | null };
  const d = Number(meta.discount);
  return Number.isFinite(d) && d > 0 ? d : 0;
}

function isDeliveryOrder(order: ShopOrder): boolean {
  if (order.delivery_method === "delivery") return true;
  if (order.delivery_method === "pickup") return false;
  return Boolean(order.shipping_required);
}

function isPickupOrder(order: ShopOrder): boolean {
  return order.delivery_method === "pickup";
}

export function customerKey(
  phone?: string | null,
  email?: string | null
): string | null {
  const p = phone?.trim();
  if (p) return `p:${p}`;
  const e = email?.trim()?.toLowerCase();
  if (e) return `e:${e}`;
  return null;
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

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function formatPct(n: number | null): string {
  if (n === null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}%`;
}

/** Previous period of equal length ending just before current `from`. */
export function previousEqualRange(range: ResolvedDateRange): ResolvedDateRange {
  const ms = Math.max(0, range.to.getTime() - range.from.getTime());
  const to = new Date(range.from.getTime() - 1);
  const from = new Date(to.getTime() - ms);
  return {
    preset: "custom",
    from: startOfLocalDay(from),
    to,
    fromIso: startOfLocalDay(from).toISOString(),
    toIso: to.toISOString(),
  };
}

export function resolveReportRange(
  preset: DateRangePreset,
  customFrom?: string | null,
  customTo?: string | null
): { range: ResolvedDateRange; previousRange: ResolvedDateRange } {
  const range = resolveDateRange(preset, customFrom, customTo);
  return { range, previousRange: previousEqualRange(range) };
}

export function filterOrders(
  orders: ShopOrder[],
  range: ResolvedDateRange,
  filters: ReportFilters
): ShopOrder[] {
  return orders.filter((order) => {
    if (!inDateRange(order.created_at, range)) return false;
    if (filters.orderStatus && order.status !== filters.orderStatus) return false;
    if (filters.deliveryMethod) {
      if (filters.deliveryMethod === "delivery" && !isDeliveryOrder(order))
        return false;
      if (filters.deliveryMethod === "pickup" && !isPickupOrder(order))
        return false;
    }
    if (filters.shippingRegion) {
      const region = regionLabel(order);
      if (region !== filters.shippingRegion) return false;
    }
    if (filters.customer) {
      const key = customerKey(order.phone, order.email);
      const needle = filters.customer.trim().toLowerCase();
      const match =
        key === filters.customer ||
        order.phone?.includes(filters.customer) ||
        order.email?.toLowerCase().includes(needle) ||
        order.name?.toLowerCase().includes(needle);
      if (!match) return false;
    }
    if (filters.product) {
      const has = (order.items ?? []).some(
        (i) =>
          i.product_id === filters.product ||
          `${i.product_type}:${i.product_id}` === filters.product
      );
      if (!has) return false;
    }
    if (filters.category) {
      const catalog = new Map<string, ProductCatalogEntry>();
      const has = (order.items ?? []).some((i) => {
        // category filter matched later with full catalog; here allow all
        void i;
        return true;
      });
      if (!has) return false;
      void catalog;
    }
    return true;
  });
}

export function filterOrdersWithCatalog(
  orders: ShopOrder[],
  range: ResolvedDateRange,
  filters: ReportFilters,
  catalog: Map<string, ProductCatalogEntry>
): ShopOrder[] {
  const base = filterOrders(orders, range, { ...filters, category: null });
  if (!filters.category) return base;
  return base.filter((order) =>
    (order.items ?? []).some(
      (i) => categoryLabelForItem(i, catalog) === filters.category
    )
  );
}

export function filterBookings(
  bookings: Booking[],
  range: ResolvedDateRange,
  filters: ReportFilters
): Booking[] {
  return bookings.filter((b) => {
    if (!inDateRange(b.created_at, range)) return false;
    if (filters.bookingStatus && b.status !== filters.bookingStatus) return false;
    if (filters.customer) {
      const key = customerKey(b.phone, b.email);
      const needle = filters.customer.trim().toLowerCase();
      const match =
        key === filters.customer ||
        b.phone?.includes(filters.customer) ||
        b.email?.toLowerCase().includes(needle) ||
        b.name?.toLowerCase().includes(needle);
      if (!match) return false;
    }
    return true;
  });
}

function seedDaySeries(range: ResolvedDateRange): Map<string, number> {
  const map = new Map<string, number>();
  const daySpan = Math.min(
    93,
    Math.max(
      1,
      Math.ceil((range.to.getTime() - range.from.getTime()) / 86_400_000) + 1
    )
  );
  const useMonths = daySpan > 62;
  if (useMonths) return map;
  for (let i = 0; i < daySpan; i++) {
    const d = addDays(startOfLocalDay(range.from), i);
    if (d.getTime() > range.to.getTime()) break;
    map.set(dayKey(d), 0);
  }
  return map;
}

function seriesFromMap(
  map: Map<string, number>,
  asMonth: boolean
): TimePoint[] {
  return [...map.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((k) => ({
      label: asMonth ? monthLabel(k) : dayLabel(k),
      value: map.get(k) ?? 0,
    }));
}

export function computeSalesMetrics(orders: ShopOrder[]): SalesMetrics {
  let totalRevenue = 0;
  let shippingSum = 0;
  let shippingCount = 0;
  let discountSum = 0;
  let productsSold = 0;
  let paidOrders = 0;

  for (const order of orders) {
    const rev = orderRevenue(order);
    if (rev > 0 || isRevenueOrder(order)) {
      totalRevenue += rev;
      if (rev > 0) paidOrders += 1;
    }
    discountSum += orderDiscount(order);
    if (isRevenueOrder(order)) {
      for (const item of order.items ?? []) {
        productsSold += Number(item.quantity) || 0;
      }
    }
    const fee = Number(order.shipping_cost);
    if (Number.isFinite(fee) && fee >= 0 && isDeliveryOrder(order)) {
      shippingSum += fee;
      shippingCount += 1;
    }
  }

  const ordersCount = orders.length;
  const avgShippingFee =
    shippingCount > 0 ? Math.round(shippingSum / shippingCount) : 0;
  const avgDiscount =
    ordersCount > 0 ? Math.round((discountSum / ordersCount) * 100) / 100 : 0;
  const aov = paidOrders > 0 ? Math.round(totalRevenue / paidOrders) : 0;
  const netRevenue = Math.max(0, totalRevenue - discountSum);

  return {
    totalRevenue,
    netRevenue,
    ordersCount,
    productsSold,
    aov,
    avgShippingFee,
    avgDiscount,
  };
}

export function computeBookingsMetrics(bookings: Booking[]): BookingsMetrics {
  let confirmed = 0;
  let completed = 0;
  let cancelled = 0;
  let noShows = 0;
  const services = new Map<string, number>();
  const hourMap = new Map<string, number>();
  const dayMap = new Map<string, number>();
  const sourceMap = new Map<string, number>();
  const consultantMap = new Map<string, number>();
  const dayLabels = [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ];

  for (const b of bookings) {
    const row = b as Booking & {
      no_show_at?: string | null;
      booking_source?: string | null;
      consultant_id?: string | null;
    };
    if (row.no_show_at) noShows += 1;
    else if (b.status === "confirmed") confirmed += 1;
    else if (b.status === "completed") completed += 1;
    else if (b.status === "cancelled") cancelled += 1;
    const svc = b.service_type || "أخرى";
    services.set(svc, (services.get(svc) ?? 0) + 1);

    const hour = (b.time || "00:00").slice(0, 2) + ":00";
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);

    const d = new Date(`${b.date}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      const label = dayLabels[d.getDay()] ?? String(d.getDay());
      dayMap.set(label, (dayMap.get(label) ?? 0) + 1);
    }

    const src = row.booking_source || "online";
    sourceMap.set(src, (sourceMap.get(src) ?? 0) + 1);

    const cid = row.consultant_id || "غير معيّنة";
    consultantMap.set(cid, (consultantMap.get(cid) ?? 0) + 1);
  }

  const total = bookings.length || 1;
  const toNamed = (m: Map<string, number>, limit = 8) =>
    [...m.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

  return {
    newCount: bookings.length,
    confirmed,
    completed,
    cancelled,
    bookingRevenue: 0,
    mostRequestedServices: toNamed(services),
    noShows,
    cancelRate: Math.round((cancelled / total) * 1000) / 10,
    noShowRate: Math.round((noShows / total) * 1000) / 10,
    busyHours: toNamed(hourMap),
    busyDays: toNamed(dayMap, 7),
    consultantPerformance: toNamed(consultantMap),
    bySource: toNamed(sourceMap),
  };
}

function aggregateProducts(
  orders: ShopOrder[],
  catalog: Map<string, ProductCatalogEntry>
): Map<string, ProductRow> {
  const map = new Map<string, ProductRow & { orderIds: Set<string> }>();

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
        existing.orders_count = existing.orderIds.size;
      } else {
        const orderIds = new Set([order.id]);
        map.set(key, {
          product_id: id,
          product_type: type,
          name: item.name_ar || catalogEntry?.name_ar || "منتج",
          quantity: qty,
          orders_count: 1,
          revenue: line,
          views: null,
          orderIds,
        });
      }
    }
  }

  const cleaned = new Map<string, ProductRow>();
  for (const [k, v] of map) {
    cleaned.set(k, {
      product_id: v.product_id,
      product_type: v.product_type,
      name: v.name,
      quantity: v.quantity,
      orders_count: v.orders_count,
      revenue: v.revenue,
      views: null,
    });
  }
  return cleaned;
}

export function computeProductsMetrics(
  orders: ShopOrder[],
  catalog: Map<string, ProductCatalogEntry>
): ProductsMetrics {
  const sold = aggregateProducts(orders, catalog);
  const soldList = [...sold.values()].sort(
    (a, b) => b.quantity - a.quantity || b.revenue - a.revenue
  );
  const byRevenue = [...sold.values()].sort((a, b) => b.revenue - a.revenue);

  const neverOrdered: ProductRow[] = [];
  for (const entry of catalog.values()) {
    const key = `${entry.product_type}:${entry.id}`;
    if (!sold.has(key)) {
      neverOrdered.push({
        product_id: entry.id,
        product_type: entry.product_type,
        name: entry.name_ar || "منتج",
        quantity: 0,
        orders_count: 0,
        revenue: 0,
        views: null,
      });
    }
  }

  const withSales = soldList.filter((p) => p.quantity > 0);
  const worstSelling = [...withSales]
    .sort((a, b) => a.quantity - b.quantity || a.revenue - b.revenue)
    .slice(0, 8);

  return {
    bestSelling: soldList.slice(0, 10),
    worstSelling,
    neverOrdered: neverOrdered.slice(0, 20),
    highestRevenue: byRevenue.slice(0, 10),
    highestViewed: [],
  };
}

export function computeCategoriesMetrics(
  orders: ShopOrder[],
  catalog: Map<string, ProductCatalogEntry>
): CategoriesMetrics {
  const map = new Map<
    string,
    { quantity: number; revenue: number; orderIds: Set<string> }
  >();

  for (const order of orders) {
    if (!isRevenueOrder(order)) continue;
    for (const item of order.items ?? []) {
      const cat = categoryLabelForItem(item, catalog);
      const qty = Number(item.quantity) || 0;
      const line = qty * (Number(item.unit_price) || 0);
      const existing = map.get(cat);
      if (existing) {
        existing.quantity += qty;
        existing.revenue += line;
        existing.orderIds.add(order.id);
      } else {
        map.set(cat, {
          quantity: qty,
          revenue: line,
          orderIds: new Set([order.id]),
        });
      }
    }
  }

  const rows: CategoryRow[] = [...map.entries()]
    .map(([name, v]) => ({
      name,
      quantity: v.quantity,
      revenue: v.revenue,
      orders_count: v.orderIds.size,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    bestSelling: [...rows].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
    lowestSelling: [...rows]
      .filter((r) => r.quantity > 0)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 10),
    categoryRevenue: rows.slice(0, 12),
  };
}

export function computeCustomersMetrics(
  ordersInRange: ShopOrder[],
  allOrders: ShopOrder[],
  allBookings: Booking[],
  range: ResolvedDateRange
): CustomersMetrics {
  const firstSeen = new Map<string, number>();
  const names = new Map<
    string,
    { name: string; phone: string | null; email: string | null }
  >();

  const consider = (
    key: string | null,
    createdAt: string | null | undefined,
    name?: string,
    phone?: string | null,
    email?: string | null
  ) => {
    if (!key || !createdAt) return;
    const t = new Date(createdAt).getTime();
    if (Number.isNaN(t)) return;
    const prev = firstSeen.get(key);
    if (prev === undefined || t < prev) firstSeen.set(key, t);
    if (!names.has(key)) {
      names.set(key, {
        name: name || "عميل",
        phone: phone ?? null,
        email: email ?? null,
      });
    }
  };

  for (const o of allOrders) {
    consider(
      customerKey(o.phone, o.email),
      o.created_at,
      o.name,
      o.phone,
      o.email
    );
  }
  for (const b of allBookings) {
    consider(
      customerKey(b.phone, b.email),
      b.created_at,
      b.name,
      b.phone,
      b.email
    );
  }

  const spend = new Map<string, number>();
  const orderCounts = new Map<string, number>();
  const periodKeys = new Set<string>();

  for (const order of ordersInRange) {
    const key = customerKey(order.phone, order.email);
    if (!key) continue;
    periodKeys.add(key);
    orderCounts.set(key, (orderCounts.get(key) ?? 0) + 1);
    spend.set(key, (spend.get(key) ?? 0) + orderRevenue(order));
    names.set(key, {
      name: order.name || names.get(key)?.name || "عميل",
      phone: order.phone ?? names.get(key)?.phone ?? null,
      email: order.email ?? names.get(key)?.email ?? null,
    });
  }

  let newCustomers = 0;
  let returningCustomers = 0;
  for (const key of periodKeys) {
    const first = firstSeen.get(key);
    if (first !== undefined && first >= range.from.getTime()) newCustomers += 1;
    else returningCustomers += 1;
  }

  const rows: CustomerRow[] = [...periodKeys].map((key) => ({
    key,
    name: names.get(key)?.name || "عميل",
    phone: names.get(key)?.phone ?? null,
    email: names.get(key)?.email ?? null,
    orders: orderCounts.get(key) ?? 0,
    spend: spend.get(key) ?? 0,
  }));

  const topCustomers = [...rows]
    .sort((a, b) => b.orders - a.orders || b.spend - a.spend)
    .slice(0, 10);
  const highestSpending = [...rows]
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10);

  const totalSpend = rows.reduce((a, r) => a + r.spend, 0);
  const avgSpend =
    rows.length > 0 ? Math.round(totalSpend / rows.length) : 0;
  const ordersPerCustomer =
    rows.length > 0
      ? Math.round(
          (rows.reduce((a, r) => a + r.orders, 0) / rows.length) * 10
        ) / 10
      : 0;

  return {
    newCustomers,
    returningCustomers,
    topCustomers,
    highestSpending,
    avgSpend,
    ordersPerCustomer,
  };
}

export function computeShippingMetrics(orders: ShopOrder[]): ShippingMetrics {
  let deliveryCount = 0;
  let pickupCount = 0;
  let feeSum = 0;
  let feeCount = 0;
  let pendingShippingFees = 0;
  const regionMap = new Map<string, number>();

  for (const order of orders) {
    if (isPickupOrder(order)) pickupCount += 1;
    else if (isDeliveryOrder(order)) deliveryCount += 1;

    if (order.shipping_fee_pending === true || order.region_configured === false) {
      pendingShippingFees += 1;
    }

    const fee = Number(order.shipping_cost);
    if (Number.isFinite(fee) && fee >= 0 && isDeliveryOrder(order)) {
      feeSum += fee;
      feeCount += 1;
    }

    if (isDeliveryOrder(order)) {
      const region = regionLabel(order);
      if (region) regionMap.set(region, (regionMap.get(region) ?? 0) + 1);
    }
  }

  return {
    deliveryCount,
    pickupCount,
    mostSelectedRegions: [...regionMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    avgShippingCost: feeCount > 0 ? Math.round(feeSum / feeCount) : 0,
    pendingShippingFees,
    avgDeliveryTimeHours: null,
  };
}

export function computeFinancialMetrics(orders: ShopOrder[]): FinancialMetrics {
  let gross = 0;
  let shippingIncome = 0;
  let discountsGiven = 0;
  let outstandingOrders = 0;
  let outstandingValue = 0;

  for (const order of orders) {
    if (OUTSTANDING.includes(order.status)) {
      outstandingOrders += 1;
      outstandingValue += Number(order.total ?? 0) || 0;
    }
    if (!isRevenueOrder(order)) continue;
    gross += Number(order.total ?? 0) || 0;
    const fee = Number(order.shipping_cost);
    if (Number.isFinite(fee) && fee > 0) shippingIncome += fee;
    discountsGiven += orderDiscount(order);
  }

  const refunds = 0;
  const net = Math.max(0, gross - discountsGiven - refunds);

  return {
    gross,
    net,
    shippingIncome,
    discountsGiven,
    refunds,
    outstandingOrders,
    outstandingValue,
  };
}

export function computeReportCharts(
  orders: ShopOrder[],
  bookings: Booking[],
  catalog: Map<string, ProductCatalogEntry>,
  range: ResolvedDateRange,
  customers: CustomersMetrics
): ReportsCharts {
  const daySpan = Math.ceil(
    (range.to.getTime() - range.from.getTime()) / 86_400_000
  );
  const useMonths = daySpan > 62;

  const revenueMap = useMonths
    ? new Map<string, number>()
    : seedDaySeries(range);
  const ordersMap = useMonths
    ? new Map<string, number>()
    : seedDaySeries(range);
  const bookingsMap = useMonths
    ? new Map<string, number>()
    : seedDaySeries(range);
  const customersMap = useMonths
    ? new Map<string, number>()
    : seedDaySeries(range);

  const productCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  let delivery = 0;
  let pickup = 0;
  const seenCustomersByDay = new Map<string, Set<string>>();

  for (const order of orders) {
    const d = new Date(order.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = useMonths ? monthKey(d) : dayKey(d);
    revenueMap.set(key, (revenueMap.get(key) ?? 0) + orderRevenue(order));
    ordersMap.set(key, (ordersMap.get(key) ?? 0) + 1);

    if (isPickupOrder(order)) pickup += 1;
    else if (isDeliveryOrder(order)) delivery += 1;

    const ck = customerKey(order.phone, order.email);
    if (ck) {
      const set = seenCustomersByDay.get(key) ?? new Set();
      set.add(ck);
      seenCustomersByDay.set(key, set);
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

  for (const [key, set] of seenCustomersByDay) {
    customersMap.set(key, set.size);
  }

  for (const booking of bookings) {
    const d = new Date(booking.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = useMonths ? monthKey(d) : dayKey(d);
    bookingsMap.set(key, (bookingsMap.get(key) ?? 0) + 1);
  }

  void customers;

  return {
    revenue: seriesFromMap(revenueMap, useMonths),
    orders: seriesFromMap(ordersMap, useMonths),
    bookings: seriesFromMap(bookingsMap, useMonths),
    products: [...productCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    shipping: [
      { name: "توصيل", count: delivery },
      { name: "استلام من البوتيك", count: pickup },
    ],
    categories: [...categoryCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    customers: seriesFromMap(customersMap, useMonths),
  };
}

export function computeInsights(input: {
  sales: SalesMetrics;
  prevSales: SalesMetrics;
  bookings: BookingsMetrics;
  prevBookings: BookingsMetrics;
  shipping: ShippingMetrics;
  categories: CategoriesMetrics;
  customers: CustomersMetrics;
  prevCustomers: CustomersMetrics;
}): BusinessInsight[] {
  const insights: BusinessInsight[] = [];
  const revPct = pctChange(input.sales.totalRevenue, input.prevSales.totalRevenue);
  const ordersPct = pctChange(input.sales.ordersCount, input.prevSales.ordersCount);
  const bookingsPct = pctChange(
    input.bookings.newCount,
    input.prevBookings.newCount
  );
  const customersPct = pctChange(
    input.customers.newCustomers + input.customers.returningCustomers,
    input.prevCustomers.newCustomers + input.prevCustomers.returningCustomers
  );

  insights.push({
    id: "revenue-trend",
    title: "اتجاه الإيرادات",
    body:
      revPct === null
        ? "لا توجد فترة سابقة كافية للمقارنة. إيرادات الفترة الحالية: " +
          String(input.sales.totalRevenue)
        : revPct >= 0
          ? `ارتفعت الإيرادات بنسبة ${formatPct(revPct)} مقارنة بالفترة السابقة.`
          : `انخفضت الإيرادات بنسبة ${formatPct(revPct)} مقارنة بالفترة السابقة.`,
    tone: revPct === null ? "neutral" : revPct >= 0 ? "up" : "down",
    metric: formatPct(revPct),
  });

  insights.push({
    id: "orders-trend",
    title: "اتجاه الطلبات",
    body:
      ordersPct === null
        ? `عدد الطلبات في الفترة: ${input.sales.ordersCount}`
        : `تغير عدد الطلبات ${formatPct(ordersPct)} مقابل الفترة السابقة (${input.sales.ordersCount} طلب).`,
    tone: ordersPct === null ? "neutral" : ordersPct >= 0 ? "up" : "down",
    metric: formatPct(ordersPct),
  });

  const topRegion = input.shipping.mostSelectedRegions[0];
  insights.push({
    id: "top-region",
    title: "أكثر منطقة شحن",
    body: topRegion
      ? `أكثر منطقة اختياراً: ${topRegion.name} (${topRegion.count} طلب توصيل).`
      : "لا توجد بيانات مناطق شحن في هذه الفترة.",
    tone: "info",
    metric: topRegion ? String(topRegion.count) : "—",
  });

  const topCategory = input.categories.bestSelling[0];
  insights.push({
    id: "top-category",
    title: "أقوى تصنيف",
    body: topCategory
      ? `التصنيف الأعلى مبيعاً: ${topCategory.name} (${topCategory.quantity} قطعة).`
      : "لا توجد مبيعات تصنيفات في هذه الفترة.",
    tone: "info",
    metric: topCategory ? String(topCategory.quantity) : "—",
  });

  insights.push({
    id: "bookings-trend",
    title: "اتجاه الحجوزات",
    body:
      bookingsPct === null
        ? `حجوزات الفترة: ${input.bookings.newCount}`
        : `تغير الحجوزات ${formatPct(bookingsPct)} (${input.bookings.newCount} حجز، مؤكد: ${input.bookings.confirmed}).`,
    tone: bookingsPct === null ? "neutral" : bookingsPct >= 0 ? "up" : "down",
    metric: formatPct(bookingsPct),
  });

  insights.push({
    id: "customers-mix",
    title: "العملاء الجدد والعائدون",
    body: `عملاء جدد: ${input.customers.newCustomers} · عائدون: ${input.customers.returningCustomers}. متوسط الإنفاق: ${input.customers.avgSpend}. تغير إجمالي العملاء ${formatPct(customersPct)}.`,
    tone: "info",
    metric: formatPct(customersPct),
  });

  if (input.shipping.pendingShippingFees > 0) {
    insights.push({
      id: "pending-fees",
      title: "رسوم شحن معلّقة",
      body: `هناك ${input.shipping.pendingShippingFees} طلب برسوم توصيل معلّقة أو منطقة غير مُعدّة.`,
      tone: "down",
      metric: String(input.shipping.pendingShippingFees),
    });
  }

  return insights;
}

export { buildCatalogMap };
export type { NamedCount, TimePoint, ProductCatalogEntry };
