import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/admin/audit";
import { csvResponse } from "@/lib/admin/csv-export";
import {
  getAdminActorRole,
  getReportsAnalytics,
} from "@/lib/admin/reports-data";
import {
  buildReportCsv,
  buildReportPdf,
  buildReportXlsx,
} from "@/lib/admin/reports-export";
import type {
  ReportExportFormat,
  ReportFilters,
  ReportSection,
} from "@/lib/admin/reports-types";
import { requireAdminApi } from "@/lib/auth";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseFilters(url: URL): Partial<ReportFilters> {
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
    const url = new URL(request.url);
    const format = (url.searchParams.get("format") || "csv") as ReportExportFormat;
    if (format !== "csv" && format !== "xlsx" && format !== "pdf") {
      return NextResponse.json(
        { error: "صيغة التصدير غير صالحة. استخدم: csv | xlsx | pdf" },
        { status: 400 }
      );
    }

    const filters = parseFilters(url);
    const section = (filters.section || "overview") as ReportSection;
    const role = await getAdminActorRole(user.id);
    const data = await getReportsAnalytics(filters, {
      id: user.id,
      email: user.email,
      role,
    });

    if (section === "financial" && !data.permissions.canExportFinancial) {
      return NextResponse.json(
        { error: "غير مصرح بتصدير التقارير المالية لهذا الدور" },
        { status: 403 }
      );
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const base = `nadeen-report-${section}-${stamp}`;

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createPrivilegedClient();
        await writeAuditLog(supabase, {
          module: "reports",
          recordId: section,
          action: "report_exported",
          actorId: user.id,
          actorEmail: user.email,
          meta: { format, section, preset: data.filters.preset },
        });
      } catch {
        /* non-blocking */
      }
    }

    if (format === "csv") {
      return csvResponse(`${base}.csv`, buildReportCsv(data, section));
    }

    if (format === "xlsx") {
      const bytes = await buildReportXlsx(data, section);
      return new NextResponse(Buffer.from(bytes), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${base}.xlsx"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const pdf = await buildReportPdf(data, section);
    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${base}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[GET /api/admin/reports/export]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل التصدير" },
      { status: 500 }
    );
  }
}
