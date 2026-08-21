import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/admin/audit";
import {
  getAdminActorRole,
  getReportsAnalytics,
} from "@/lib/admin/reports-data";
import { buildReportEmailHtml } from "@/lib/admin/reports-export";
import type {
  ReportEmailPreset,
  ReportFilters,
  ReportSection,
} from "@/lib/admin/reports-types";
import { requireAdminApi } from "@/lib/auth";
import { SITE_NAME } from "@/lib/constants";
import { sendEmail } from "@/lib/notifications/email";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PRESET_LABELS: Record<ReportEmailPreset, string> = {
  daily: "يومي",
  weekly: "أسبوعي",
  monthly: "شهري",
  custom: "مخصص",
};

function presetToRange(preset: ReportEmailPreset): ReportFilters["preset"] {
  if (preset === "daily") return "today";
  if (preset === "weekly") return "last_7_days";
  if (preset === "monthly") return "this_month";
  return "custom";
}

export async function POST(request: Request) {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;
  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      emailPreset?: ReportEmailPreset;
      section?: ReportSection;
      filters?: Partial<ReportFilters>;
    };

    const to = (body.email || user.email || "").trim();
    if (!to || !to.includes("@")) {
      return NextResponse.json(
        { error: "عنوان البريد غير صالح" },
        { status: 400 }
      );
    }

    const emailPreset: ReportEmailPreset = body.emailPreset || "weekly";
    const section = body.section || "overview";
    const role = await getAdminActorRole(user.id);

    const filters: Partial<ReportFilters> = {
      ...(body.filters || {}),
      section,
    };

    if (!filters.preset && emailPreset !== "custom") {
      filters.preset = presetToRange(emailPreset);
    }
    if (!filters.preset) filters.preset = "last_30_days";

    if (section === "financial") {
      const probe = await getReportsAnalytics(filters, {
        id: user.id,
        email: user.email,
        role,
      });
      if (!probe.permissions.canViewFinancial) {
        return NextResponse.json(
          { error: "غير مصرح بإرسال التقارير المالية لهذا الدور" },
          { status: 403 }
        );
      }
    }

    const data = await getReportsAnalytics(filters, {
      id: user.id,
      email: user.email,
      role,
    });

    const label = PRESET_LABELS[emailPreset] || "تقرير";
    const html = buildReportEmailHtml(data, label);
    const result = await sendEmail({
      to,
      subject: `${SITE_NAME} — تقرير ${label}`,
      html,
      fromName: SITE_NAME,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createPrivilegedClient();
        await writeAuditLog(supabase, {
          module: "reports",
          recordId: section,
          action: "report_emailed",
          actorId: user.id,
          actorEmail: user.email,
          meta: {
            to,
            emailPreset,
            section,
            resendId: result.id,
          },
        });
      } catch {
        /* non-blocking */
      }
    }

    return NextResponse.json({ ok: true, id: result.id });
  } catch (e) {
    console.error("[POST /api/admin/reports/email]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل إرسال التقرير" },
      { status: 500 }
    );
  }
}
