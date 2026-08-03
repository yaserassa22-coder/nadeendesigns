import type { DateRangePreset, ResolvedDateRange, NamedCount, TimePoint } from "@/lib/admin/dashboard-analytics";

export type ReportSection =
  | "overview"
  | "sales"
  | "bookings"
  | "products"
  | "categories"
  | "customers"
  | "shipping"
  | "financial"
  | "insights";

export const REPORT_SECTIONS: { id: ReportSection; label: string; financial?: boolean }[] = [
  { id: "overview", label: "نظرة عامة" },
  { id: "sales", label: "المبيعات" },
  { id: "bookings", label: "الحجوزات" },
  { id: "products", label: "المنتجات" },
  { id: "categories", label: "التصنيفات" },
  { id: "customers", label: "العملاء" },
  { id: "shipping", label: "الشحن" },
  { id: "financial", label: "المالية", financial: true },
  { id: "insights", label: "الرؤى" },
];

export type ReportExportFormat = "csv" | "xlsx" | "pdf";

export type ReportEmailPreset = "daily" | "weekly" | "monthly" | "custom";

export type ReportFilters = {
  preset: DateRangePreset;
  from?: string | null;
  to?: string | null;
  category?: string | null;
  product?: string | null;
  shippingRegion?: string | null;
  deliveryMethod?: "delivery" | "pickup" | null;
  orderStatus?: string | null;
  bookingStatus?: string | null;
  customer?: string | null;
  section?: ReportSection | null;
};

export type SalesMetrics = {
  totalRevenue: number;
  netRevenue: number;
  ordersCount: number;
  productsSold: number;
  aov: number;
  avgShippingFee: number;
  avgDiscount: number;
};

export type BookingsMetrics = {
  newCount: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  /** Future-ready: bookings have no price column yet */
  bookingRevenue: number;
  mostRequestedServices: NamedCount[];
};

export type ProductRow = {
  product_id: string;
  product_type: string;
  name: string;
  quantity: number;
  orders_count: number;
  revenue: number;
  /** Future-ready: product views not tracked yet */
  views: number | null;
};

export type ProductsMetrics = {
  bestSelling: ProductRow[];
  worstSelling: ProductRow[];
  neverOrdered: ProductRow[];
  highestRevenue: ProductRow[];
  highestViewed: ProductRow[];
};

export type CategoryRow = {
  name: string;
  quantity: number;
  revenue: number;
  orders_count: number;
};

export type CategoriesMetrics = {
  bestSelling: CategoryRow[];
  lowestSelling: CategoryRow[];
  categoryRevenue: CategoryRow[];
};

export type CustomerRow = {
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  orders: number;
  spend: number;
};

export type CustomersMetrics = {
  newCustomers: number;
  returningCustomers: number;
  topCustomers: CustomerRow[];
  highestSpending: CustomerRow[];
  avgSpend: number;
  ordersPerCustomer: number;
};

export type ShippingMetrics = {
  deliveryCount: number;
  pickupCount: number;
  mostSelectedRegions: NamedCount[];
  avgShippingCost: number;
  pendingShippingFees: number;
  /** Future-ready without reliable status timestamps */
  avgDeliveryTimeHours: number | null;
};

export type FinancialMetrics = {
  gross: number;
  net: number;
  shippingIncome: number;
  discountsGiven: number;
  /** Future-ready: refunds not tracked */
  refunds: number;
  outstandingOrders: number;
  outstandingValue: number;
};

export type BusinessInsight = {
  id: string;
  title: string;
  body: string;
  tone: "up" | "down" | "neutral" | "info";
  metric?: string;
};

export type ReportsCharts = {
  revenue: TimePoint[];
  orders: TimePoint[];
  bookings: TimePoint[];
  products: NamedCount[];
  shipping: NamedCount[];
  categories: NamedCount[];
  customers: TimePoint[];
};

export type ReportsPayload = {
  range: ResolvedDateRange;
  previousRange: ResolvedDateRange;
  filters: ReportFilters;
  permissions: {
    canViewFinancial: boolean;
    canExportFinancial: boolean;
    role: string;
  };
  sales: SalesMetrics;
  bookings: BookingsMetrics;
  products: ProductsMetrics;
  categories: CategoriesMetrics;
  customers: CustomersMetrics;
  shipping: ShippingMetrics;
  financial: FinancialMetrics | null;
  insights: BusinessInsight[];
  charts: ReportsCharts;
  filterOptions: {
    categories: string[];
    products: { id: string; name: string; product_type: string }[];
    regions: string[];
    orderStatuses: string[];
    bookingStatuses: string[];
  };
  errors: {
    orders: string | null;
    bookings: string | null;
  };
};

export type ReportScheduleRow = {
  id: string;
  frequency: "daily" | "weekly" | "monthly";
  report_type: string;
  email: string;
  filters: Record<string, unknown>;
  enabled: boolean;
  last_sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
