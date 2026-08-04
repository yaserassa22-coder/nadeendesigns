/**
 * Server-side data loading for the executive dashboard.
 * Parallel fetches + graceful handling of missing tables/columns.
 */

import {
  buildCatalogMap,
  computeAlerts,
  computeBookingAnalytics,
  computeCharts,
  computeCustomerAnalytics,
  computeOrderKpis,
  computeRevenueBreakdown,
  computeShippingAnalytics,
  computeTopProducts,
  filterByCreatedAt,
  resolveDateRange,
  toRecentBookings,
  toRecentOrders,
  type DashboardPayload,
  type DateRangePreset,
  type ProductCatalogEntry,
  type RecentActivityRow,
} from "@/lib/admin/dashboard-analytics";
import { selectShopOrdersList } from "@/lib/shop/order-query";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  getErrorMessage,
  isMissingColumnError,
  isMissingTableError,
} from "@/lib/supabase/errors";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { DRESS_CATEGORY_LABELS, type Booking, type DressCategory } from "@/types";
import type { ShopOrder } from "@/types/shop";

export type DashboardFetchResult = {
  data: DashboardPayload;
  errors: {
    orders: string | null;
    bookings: string | null;
  };
};

async function countTable(
  table: string,
  fallback = 0
): Promise<number> {
  if (!isSupabaseConfigured()) return fallback;
  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true });
    if (error) {
      if (isMissingTableError(error, table)) return fallback;
      console.warn(`[dashboard] count ${table}`, getErrorMessage(error));
      return fallback;
    }
    return typeof count === "number" ? count : fallback;
  } catch (e) {
    console.warn(`[dashboard] count ${table} unexpected`, e);
    return fallback;
  }
}

async function countDeleted(table: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("is_deleted", true);
    if (error) {
      if (
        isMissingTableError(error, table) ||
        isMissingColumnError(error) ||
        /is_deleted/i.test(error.message ?? "")
      ) {
        return 0;
      }
      return 0;
    }
    return typeof count === "number" ? count : 0;
  } catch {
    return 0;
  }
}

async function fetchOrders(): Promise<{
  orders: ShopOrder[];
  error: string | null;
}> {
  if (!isSupabaseConfigured()) return { orders: [], error: null };
  try {
    const supabase = await createPrivilegedClient();
    const { data, error } = await selectShopOrdersList(supabase);
    if (error) {
      return {
        orders: [],
        error: error.message || "فشل جلب الطلبات",
      };
    }
    return { orders: data ?? [], error: null };
  } catch (e) {
    return {
      orders: [],
      error: e instanceof Error ? e.message : "خطأ غير متوقع أثناء جلب الطلبات",
    };
  }
}

async function fetchBookings(): Promise<{
  bookings: Booking[];
  error: string | null;
}> {
  if (!isSupabaseConfigured()) return { bookings: [], error: null };
  try {
    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      if (isMissingTableError(error, "bookings")) {
        return { bookings: [], error: null };
      }
      return {
        bookings: [],
        error: error.message || "فشل جلب الحجوزات",
      };
    }
    return { bookings: (data as Booking[]) ?? [], error: null };
  } catch (e) {
    return {
      bookings: [],
      error: e instanceof Error ? e.message : "خطأ غير متوقع أثناء جلب الحجوزات",
    };
  }
}

async function fetchProductCatalog(): Promise<ProductCatalogEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createAdminClient();

  const safeSelect = async (
    table: string,
    columns: string,
    mapRow: (row: Record<string, unknown>) => ProductCatalogEntry | null
  ): Promise<ProductCatalogEntry[]> => {
    const { data, error } = await supabase.from(table).select(columns);
    if (error) {
      if (isMissingTableError(error, table) || isMissingColumnError(error)) {
        // Retry minimal columns
        const { data: minimal, error: minErr } = await supabase
          .from(table)
          .select("id, name_ar, images");
        if (minErr || !minimal) return [];
        return (minimal as unknown as Record<string, unknown>[])
          .map(mapRow)
          .filter(Boolean) as ProductCatalogEntry[];
      }
      console.warn(`[dashboard] catalog ${table}`, getErrorMessage(error));
      return [];
    }
    return ((data ?? []) as unknown as Record<string, unknown>[])
      .map(mapRow)
      .filter(Boolean) as ProductCatalogEntry[];
  };

  const [dresses, veils, robes] = await Promise.all([
    safeSelect(
      "dresses",
      "id, name_ar, category, images, is_available",
      (row) => {
        const category =
          typeof row.category === "string" ? row.category : "";
        const images = Array.isArray(row.images) ? row.images : [];
        return {
          id: String(row.id),
          name_ar: String(row.name_ar ?? ""),
          product_type: "dress" as const,
          category_key: category || null,
          category_label:
            category && category in DRESS_CATEGORY_LABELS
              ? DRESS_CATEGORY_LABELS[category as DressCategory]
              : "فساتين",
          image: typeof images[0] === "string" ? images[0] : null,
          is_available:
            row.is_available === null || row.is_available === undefined
              ? null
              : Boolean(row.is_available),
          stock_quantity: null,
        };
      }
    ),
    safeSelect(
      "veils",
      "id, name_ar, images, stock_quantity, is_available, category",
      (row) => {
        const images = Array.isArray(row.images) ? row.images : [];
        return {
          id: String(row.id),
          name_ar: String(row.name_ar ?? ""),
          product_type: "veil" as const,
          category_key: "veil",
          category_label: "طرحة العروس",
          image: typeof images[0] === "string" ? images[0] : null,
          stock_quantity:
            row.stock_quantity === null || row.stock_quantity === undefined
              ? null
              : Number(row.stock_quantity),
          is_available:
            row.is_available === null || row.is_available === undefined
              ? null
              : Boolean(row.is_available),
        };
      }
    ),
    safeSelect(
      "bridal_robes",
      "id, name_ar, images, stock_quantity, is_available",
      (row) => {
        const images = Array.isArray(row.images) ? row.images : [];
        return {
          id: String(row.id),
          name_ar: String(row.name_ar ?? ""),
          product_type: "bridal_robe" as const,
          category_key: "bridal_robe",
          category_label: "برنص العروس",
          image: typeof images[0] === "string" ? images[0] : null,
          stock_quantity:
            row.stock_quantity === null || row.stock_quantity === undefined
              ? null
              : Number(row.stock_quantity),
          is_available:
            row.is_available === null || row.is_available === undefined
              ? null
              : Boolean(row.is_available),
        };
      }
    ),
  ]);

  return [...dresses, ...veils, ...robes];
}

async function fetchRecentMessages(limit = 8): Promise<RecentActivityRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("contact_messages")
      .select("id, name, subject, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      if (isMissingTableError(error, "contact_messages")) return [];
      console.warn("[dashboard] messages", getErrorMessage(error));
      return [];
    }
    return ((data ?? []) as Array<{
      id: string;
      name: string;
      subject: string;
      created_at: string;
    }>).map((m) => ({
      id: m.id,
      title: m.subject || "رسالة",
      subtitle: m.name,
      created_at: m.created_at,
      href: "/admin/messages",
    }));
  } catch {
    return [];
  }
}

async function fetchRecentNotifications(
  limit = 8
): Promise<RecentActivityRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createAdminClient();

  // Prefer notification_logs; fall back to customer_notifications
  try {
    const { data, error } = await supabase
      .from("notification_logs")
      .select(
        "id, notification_type, channel, order_status, status, recipient, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && data) {
      return (
        data as Array<{
          id: string;
          notification_type: string;
          channel: string;
          order_status: string | null;
          status: string;
          recipient: string | null;
          created_at: string;
        }>
      ).map((n) => ({
        id: n.id,
        title:
          n.order_status
            ? `إشعار حالة: ${n.order_status}`
            : n.notification_type || "إشعار",
        subtitle: `${n.channel} · ${n.status}${
          n.recipient ? ` · ${n.recipient}` : ""
        }`,
        created_at: n.created_at,
        href: "/admin/notifications",
      }));
    }

    if (error && !isMissingTableError(error, "notification_logs")) {
      console.warn("[dashboard] notification_logs", getErrorMessage(error));
    }
  } catch {
    /* try fallback */
  }

  try {
    const { data, error } = await supabase
      .from("customer_notifications")
      .select("id, title_ar, body_ar, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return (
      data as Array<{
        id: string;
        title_ar: string;
        body_ar: string;
        created_at: string;
      }>
    ).map((n) => ({
      id: n.id,
      title: n.title_ar,
      subtitle: n.body_ar,
      created_at: n.created_at,
      href: "/admin/notifications",
    }));
  } catch {
    return [];
  }
}

async function fetchStatusUpdates(limit = 8): Promise<RecentActivityRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("notification_logs")
      .select("id, order_id, order_status, channel, status, created_at")
      .not("order_status", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      if (
        isMissingTableError(error, "notification_logs") ||
        isMissingColumnError(error)
      ) {
        return [];
      }
      return [];
    }
    return (
      (data ?? []) as Array<{
        id: string;
        order_id: string | null;
        order_status: string;
        channel: string;
        status: string;
        created_at: string;
      }>
    ).map((n) => ({
      id: n.id,
      title: `تحديث حالة الطلب: ${n.order_status}`,
      subtitle: `${n.channel} · ${n.status}`,
      created_at: n.created_at,
      href: n.order_id ? `/admin/orders` : "/admin/notifications",
    }));
  } catch {
    return [];
  }
}

async function countFailedNotifications(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("notification_logs")
      .select("id", { count: "exact", head: true })
      .in("status", ["failed", "pending_retry"]);
    if (error) {
      if (isMissingTableError(error, "notification_logs")) return 0;
      return 0;
    }
    return typeof count === "number" ? count : 0;
  } catch {
    return 0;
  }
}

function countOutOfStock(catalog: ProductCatalogEntry[]): number {
  return catalog.filter((p) => {
    if (p.is_available === false) return true;
    if (
      (p.product_type === "veil" || p.product_type === "bridal_robe") &&
      typeof p.stock_quantity === "number" &&
      p.stock_quantity <= 0
    ) {
      return true;
    }
    return false;
  }).length;
}

function countPendingFees(orders: ShopOrder[]): {
  pendingFees: number;
  unknownRegions: number;
} {
  let pendingFees = 0;
  let unknownRegions = 0;
  for (const order of orders) {
    if (order.shipping_fee_pending === true) pendingFees += 1;
    if (order.region_configured === false) unknownRegions += 1;
  }
  return { pendingFees, unknownRegions };
}

export async function getDashboardAnalytics(input: {
  preset?: DateRangePreset | string | null;
  from?: string | null;
  to?: string | null;
}): Promise<DashboardFetchResult> {
  const preset: DateRangePreset =
    input.preset &&
    [
      "today",
      "yesterday",
      "last_7_days",
      "last_30_days",
      "this_month",
      "last_month",
      "this_year",
      "last_year",
      "custom",
    ].includes(input.preset)
      ? (input.preset as DateRangePreset)
      : "last_30_days";

  const range = resolveDateRange(preset, input.from, input.to);

  const [
    ordersResult,
    bookingsResult,
    catalog,
    dressesCount,
    veilsCount,
    robesCount,
    categoriesCount,
    messages,
    notifications,
    statusUpdates,
    failedNotifications,
    trashOrders,
    trashBookings,
    trashDresses,
    trashVeils,
    trashRobes,
    trashMessages,
    trashGallery,
    trashCategories,
    trashShipping,
  ] = await Promise.all([
    fetchOrders(),
    fetchBookings(),
    fetchProductCatalog(),
    countTable("dresses"),
    countTable("veils"),
    countTable("bridal_robes"),
    countTable("categories"),
    fetchRecentMessages(8),
    fetchRecentNotifications(8),
    fetchStatusUpdates(8),
    countFailedNotifications(),
    countDeleted("shop_orders"),
    countDeleted("bookings"),
    countDeleted("dresses"),
    countDeleted("veils"),
    countDeleted("bridal_robes"),
    countDeleted("contact_messages"),
    countDeleted("gallery_items"),
    countDeleted("categories"),
    countDeleted("shipping_regions"),
  ]);

  const allOrders = ordersResult.orders;
  const allBookings = bookingsResult.bookings;
  const ordersInRange = filterByCreatedAt(allOrders, range);
  const bookingsInRange = filterByCreatedAt(allBookings, range);
  const catalogMap = buildCatalogMap(catalog);
  const totalProducts = dressesCount + veilsCount + robesCount;
  const { pendingFees, unknownRegions } = countPendingFees(allOrders);
  const pendingConfirmation = allOrders.filter(
    (o) => o.status === "pending" || o.status === "under_review"
  ).length;

  const data: DashboardPayload = {
    range,
    kpis: computeOrderKpis(
      ordersInRange,
      bookingsInRange,
      totalProducts,
      categoriesCount,
      allOrders,
      allBookings
    ),
    revenueBreakdown: computeRevenueBreakdown(allOrders),
    charts: computeCharts(ordersInRange, bookingsInRange, catalogMap, range),
    recent: {
      orders: toRecentOrders(allOrders, 8),
      bookings: toRecentBookings(allBookings, 8),
      statusUpdates,
      messages,
      notifications,
    },
    topProducts: computeTopProducts(ordersInRange, catalogMap, 8),
    shipping: computeShippingAnalytics(ordersInRange),
    bookingAnalytics: computeBookingAnalytics(bookingsInRange),
    customers: computeCustomerAnalytics(
      ordersInRange,
      allOrders,
      allBookings,
      range
    ),
    alerts: computeAlerts({
      pendingConfirmationOrders: pendingConfirmation,
      unknownShippingRegions: unknownRegions,
      pendingDeliveryFees: pendingFees,
      failedNotifications,
      outOfStockProducts: countOutOfStock(catalog),
    }),
    trash: {
      ordersInTrash: trashOrders,
      bookingsInTrash: trashBookings,
      productsInTrash: trashDresses + trashVeils + trashRobes,
      totalInTrash:
        trashOrders +
        trashBookings +
        trashDresses +
        trashVeils +
        trashRobes +
        trashMessages +
        trashGallery +
        trashCategories +
        trashShipping,
    },
  };

  // Phase G guest KPIs (non-fatal if tables missing)
  try {
    if (isSupabaseConfigured()) {
    const supabase = createAdminClient();
    const [
      { count: totalGuests },
      { count: convertedGuests },
      { count: registeredCustomers },
      { count: abandonedCarts },
      { data: guestRows },
    ] = await Promise.all([
      supabase
        .from("guest_customers")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("guest_customers")
        .select("*", { count: "exact", head: true })
        .not("converted_to_customer_id", "is", null),
      supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("is_guest", false),
      supabase
        .from("guest_carts")
        .select("*", { count: "exact", head: true })
        .not("items", "eq", "[]"),
      supabase
        .from("guest_customers")
        .select("created_at, last_seen")
        .limit(5000),
    ]);
    let returningGuests = 0;
    for (const g of guestRows ?? []) {
      const created = new Date(g.created_at as string).getTime();
      const seen = new Date(g.last_seen as string).getTime();
      if (seen - created > 86_400_000) returningGuests += 1;
    }
    const total = totalGuests ?? 0;
    const conv = convertedGuests ?? 0;
    data.customers = {
      ...data.customers,
      totalGuests: total,
      returningGuests,
      registeredCustomers: registeredCustomers ?? 0,
      guestConversionRate:
        total > 0 ? Math.round((conv / total) * 1000) / 10 : 0,
      abandonedGuestCarts: abandonedCarts ?? 0,
    };
    }
  } catch {
    /* guest tables optional until 031 */
  }

  // Serialize dates for JSON
  const serializable: DashboardPayload = {
    ...data,
    range: {
      ...data.range,
      from: data.range.from,
      to: data.range.to,
    },
  };

  return {
    data: serializable,
    errors: {
      orders: ordersResult.error,
      bookings: bookingsResult.error,
    },
  };
}
