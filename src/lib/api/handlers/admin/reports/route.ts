import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/admin/audit";
import {
  getAdminActorRole,
  getReportsAnalytics,
  serializeReportsPayload,
} from "@/lib/admin/reports-data";
import type { ReportFilters, ReportSection } from "@/lib/admin/reports-types";
import { requireAdminApi } from "@/lib/auth";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseSearchFilters(url: URL): Partial<ReportFilters> {
  const sp = url.searchParams;
  const delivery = sp.get("deliveryMethod");
  return {
    preset: (sp.get("range") ?? sp.get("preset") ?? "last_30_days") as ReportFilters["preset"],
    from: sp.get("from"),
    to: sp.get("to"),
    category: sp.get("category"),
    product: sp.get("product"),
    shippingRegion: sp.get("shippingRegion"),
    deliveryMethod:
      delivery === "delivery" || delivery === "pickup" ? delivery : null,
    orderStatus: sp.get("orderStatus"),
    bookingStatus: sp.get("bookingStatus"),
    customer: sp.get("customer"),
    section: (sp.get("section") as ReportSection | null) || null,
  };
}

export async function GET(request: Request) {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;
  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const role = await getAdminActorRole(user.id);
    const filters = parseSearchFilters(new URL(request.url));
    const data = await getReportsAnalytics(filters, {
      id: user.id,
      email: user.email,
      role,
    });

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createPrivilegedClient();
        await writeAuditLog(supabase, {
          module: "reports",
          recordId: filters.section || "overview",
          action: "report_generated",
          actorId: user.id,
          actorEmail: user.email,
          meta: {
            preset: data.filters.preset,
            from: data.range.fromIso,
            to: data.range.toIso,
          },
        });
      } catch {
        /* non-blocking */
      }
    }

    return NextResponse.json(serializeReportsPayload(data));
  } catch (e) {
    console.error("[GET /api/admin/reports]", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "تعذر تحميل التقارير",
      },
      { status: 500 }
    );
  }
}
