import { NextResponse } from "next/server";
import {
  isDateRangePreset,
  type DateRangePreset,
} from "@/lib/admin/dashboard-analytics";
import { getDashboardAnalytics } from "@/lib/admin/dashboard-data";
import { requireAdminApi } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function serializeDashboard(
  result: Awaited<ReturnType<typeof getDashboardAnalytics>>
) {
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
    trash: data.trash,
    errors,
  };
}

export async function GET(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const rawPreset = searchParams.get("range") ?? searchParams.get("preset");
    const preset: DateRangePreset =
      rawPreset && isDateRangePreset(rawPreset) ? rawPreset : "last_30_days";
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const result = await getDashboardAnalytics({
      preset,
      from,
      to,
    });

    return NextResponse.json(serializeDashboard(result));
  } catch (e) {
    console.error("[GET /api/admin/dashboard]", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "تعذر تحميل لوحة التحكم",
      },
      { status: 500 }
    );
  }
}
