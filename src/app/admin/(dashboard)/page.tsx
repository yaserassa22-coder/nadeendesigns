import type { Metadata } from "next";
import { ExecutiveDashboard } from "@/components/admin/dashboard/ExecutiveDashboard";
import type { DashboardApiResponse } from "@/components/admin/dashboard/ExecutiveDashboard";
import { getDashboardAnalytics } from "@/lib/admin/dashboard-data";

export const metadata: Metadata = {
  title: "لوحة التحكم",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toClientPayload(
  result: Awaited<ReturnType<typeof getDashboardAnalytics>>
): DashboardApiResponse {
  const { data, errors } = result;
  return {
    range: {
      preset: data.range.preset,
      from: data.range.fromIso,
      to: data.range.toIso,
    },
    kpis: data.kpis,
    revenueBreakdown: data.revenueBreakdown,
    charts: data.charts,
    recent: data.recent,
    topProducts: data.topProducts,
    shipping: data.shipping,
    bookingAnalytics: data.bookingAnalytics,
    customers: data.customers,
    alerts: data.alerts,
    errors,
  };
}

export default async function AdminDashboardPage() {
  const result = await getDashboardAnalytics({ preset: "last_30_days" });
  const initialData = toClientPayload(result);

  return <ExecutiveDashboard initialData={initialData} />;
}
