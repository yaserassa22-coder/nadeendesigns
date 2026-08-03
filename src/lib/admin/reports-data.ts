/**
 * Server-side data loading for Report Center (read-only).
 */

import {
  isDateRangePreset,
  type DateRangePreset,
  type ProductCatalogEntry,
} from "@/lib/admin/dashboard-analytics";
import { filterLifecycleRows } from "@/lib/admin/query-lifecycle";
import {
  buildCatalogMap,
  computeBookingsMetrics,
  computeCategoriesMetrics,
  computeCustomersMetrics,
  computeFinancialMetrics,
  computeInsights,
  computeProductsMetrics,
  computeReportCharts,
  computeSalesMetrics,
  computeShippingMetrics,
  filterBookings,
  filterOrdersWithCatalog,
  resolveReportRange,
} from "@/lib/admin/reports-analytics";
import type {
  ReportFilters,
  ReportsPayload,
  ReportSection,
} from "@/lib/admin/reports-types";
import {
  canExportFinancialReports,
  canViewFinancialReports,
  normalizeAdminRole,
  type AdminActor,
} from "@/lib/admin/permissions";
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

async function fetchOrders(): Promise<{
  orders: ShopOrder[];
  error: string | null;
}> {
  if (!isSupabaseConfigured()) return { orders: [], error: null };
  try {
    const supabase = await createPrivilegedClient();
    const { data, error } = await selectShopOrdersList(supabase);
    if (error) {
      return { orders: [], error: error.message || "فشل جلب الطلبات" };
    }
    const rows = filterLifecycleRows((data ?? []) as ShopOrder[], "active");
    return { orders: rows, error: null };
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
    let query = supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    query = query.eq("is_deleted", false) as typeof query;
    const { data, error } = await query;
    if (error) {
      if (isMissingTableError(error, "bookings")) {
        return { bookings: [], error: null };
      }
      if (isMissingColumnError(error) || /is_deleted/i.test(error.message)) {
        const retry = await supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false });
        if (retry.error) {
          return {
            bookings: [],
            error: retry.error.message || "فشل جلب الحجوزات",
          };
        }
        return { bookings: (retry.data as Booking[]) ?? [], error: null };
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
        const { data: minimal, error: minErr } = await supabase
          .from(table)
          .select("id, name_ar, images");
        if (minErr || !minimal) return [];
        return (minimal as unknown as Record<string, unknown>[])
          .map(mapRow)
          .filter(Boolean) as ProductCatalogEntry[];
      }
      console.warn(`[reports] catalog ${table}`, getErrorMessage(error));
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

  return filterLifecycleRows([...dresses, ...veils, ...robes], "active");
}

function parseFilters(input: Partial<ReportFilters>): ReportFilters {
  const rawPreset = input.preset ?? "last_30_days";
  const preset: DateRangePreset = isDateRangePreset(String(rawPreset))
    ? (rawPreset as DateRangePreset)
    : "last_30_days";

  const section = input.section as ReportSection | null | undefined;

  return {
    preset,
    from: input.from ?? null,
    to: input.to ?? null,
    category: input.category || null,
    product: input.product || null,
    shippingRegion: input.shippingRegion || null,
    deliveryMethod:
      input.deliveryMethod === "delivery" || input.deliveryMethod === "pickup"
        ? input.deliveryMethod
        : null,
    orderStatus: input.orderStatus || null,
    bookingStatus: input.bookingStatus || null,
    customer: input.customer || null,
    section: section || null,
  };
}

function collectFilterOptions(
  orders: ShopOrder[],
  bookings: Booking[],
  catalog: ProductCatalogEntry[]
) {
  const categories = new Set<string>();
  const regions = new Set<string>();
  const orderStatuses = new Set<string>();
  const bookingStatuses = new Set<string>();

  for (const entry of catalog) {
    if (entry.category_label) categories.add(entry.category_label);
  }

  for (const order of orders) {
    orderStatuses.add(order.status);
    const region =
      order.shipping_region_name_ar?.trim() ||
      order.shipping_region_custom?.trim() ||
      order.shipping_region?.trim() ||
      order.shipping_city?.trim();
    if (region) regions.add(region);
  }
  for (const b of bookings) {
    bookingStatuses.add(b.status);
  }

  return {
    categories: [...categories].sort((a, b) => a.localeCompare(b, "ar")),
    products: catalog
      .map((p) => ({
        id: `${p.product_type}:${p.id}`,
        name: p.name_ar,
        product_type: p.product_type,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "ar"))
      .slice(0, 500),
    regions: [...regions].sort((a, b) => a.localeCompare(b, "ar")),
    orderStatuses: [...orderStatuses].sort(),
    bookingStatuses: [...bookingStatuses].sort(),
  };
}

export async function getAdminActorRole(
  userId: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) return "admin";
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.warn("[reports] profile role", getErrorMessage(error));
      return "admin";
    }
    return (data as { role?: string } | null)?.role ?? "admin";
  } catch {
    return "admin";
  }
}

export async function getReportsAnalytics(
  input: Partial<ReportFilters>,
  actor: AdminActor
): Promise<ReportsPayload> {
  const filters = parseFilters(input);
  const { range, previousRange } = resolveReportRange(
    filters.preset,
    filters.from,
    filters.to
  );

  const [ordersResult, bookingsResult, catalogEntries] = await Promise.all([
    fetchOrders(),
    fetchBookings(),
    fetchProductCatalog(),
  ]);

  const allOrders = ordersResult.orders;
  const allBookings = bookingsResult.bookings;
  const catalog = buildCatalogMap(catalogEntries);

  const orders = filterOrdersWithCatalog(allOrders, range, filters, catalog);
  const prevOrders = filterOrdersWithCatalog(
    allOrders,
    previousRange,
    filters,
    catalog
  );
  const bookings = filterBookings(allBookings, range, filters);
  const prevBookings = filterBookings(allBookings, previousRange, filters);

  const sales = computeSalesMetrics(orders);
  const prevSales = computeSalesMetrics(prevOrders);
  const bookingsMetrics = computeBookingsMetrics(bookings);
  const prevBookingsMetrics = computeBookingsMetrics(prevBookings);
  const products = computeProductsMetrics(orders, catalog);
  const categories = computeCategoriesMetrics(orders, catalog);
  const customers = computeCustomersMetrics(
    orders,
    allOrders,
    allBookings,
    range
  );
  const prevCustomers = computeCustomersMetrics(
    prevOrders,
    allOrders,
    allBookings,
    previousRange
  );
  const shipping = computeShippingMetrics(orders);
  const financialFull = computeFinancialMetrics(orders);
  const charts = computeReportCharts(
    orders,
    bookings,
    catalog,
    range,
    customers
  );
  const insights = computeInsights({
    sales,
    prevSales,
    bookings: bookingsMetrics,
    prevBookings: prevBookingsMetrics,
    shipping,
    categories,
    customers,
    prevCustomers,
  });

  const canFinancial = canViewFinancialReports(actor);

  return {
    range,
    previousRange,
    filters,
    permissions: {
      canViewFinancial: canFinancial,
      canExportFinancial: canExportFinancialReports(actor),
      role: normalizeAdminRole(actor.role),
    },
    sales,
    bookings: bookingsMetrics,
    products,
    categories,
    customers,
    shipping,
    financial: canFinancial ? financialFull : null,
    insights,
    charts,
    filterOptions: collectFilterOptions(allOrders, allBookings, catalogEntries),
    errors: {
      orders: ordersResult.error,
      bookings: bookingsResult.error,
    },
  };
}

export function serializeReportsPayload(data: ReportsPayload) {
  return {
    range: {
      preset: data.range.preset,
      from: data.range.fromIso,
      to: data.range.toIso,
    },
    previousRange: {
      preset: data.previousRange.preset,
      from: data.previousRange.fromIso,
      to: data.previousRange.toIso,
    },
    filters: data.filters,
    permissions: data.permissions,
    sales: data.sales,
    bookings: data.bookings,
    products: data.products,
    categories: data.categories,
    customers: data.customers,
    shipping: data.shipping,
    financial: data.financial,
    insights: data.insights,
    charts: data.charts,
    filterOptions: data.filterOptions,
    errors: data.errors,
  };
}
