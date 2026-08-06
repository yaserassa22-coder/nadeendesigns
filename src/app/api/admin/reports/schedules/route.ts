/**
 * CRUD stub for report_schedules.
 * FUTURE-READY: no cron/runner — enabling a schedule will NOT auto-send
 * until a schedule runner is deployed.
 */

import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/admin/audit";
import { getAdminActorRole } from "@/lib/admin/reports-data";
import {
  canManageReportSchedules,
  normalizeAdminRole,
} from "@/lib/admin/permissions";
import { requireAdminApi } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  getErrorMessage,
  isMissingTableError,
} from "@/lib/supabase/errors";
import { createPrivilegedClient } from "@/lib/supabase/privileged";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FREQUENCIES = new Set(["daily", "weekly", "monthly"]);

export async function GET() {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;
  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ schedules: [], futureReady: true });
  }

  try {
    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("report_schedules")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingTableError(error, "report_schedules")) {
        return NextResponse.json({
          schedules: [],
          futureReady: true,
          warning:
            "جدول report_schedules غير موجود — شغّلي APPLY_REPORTS.sql",
        });
      }
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 400 }
      );
    }

    return NextResponse.json({
      schedules: data ?? [],
      futureReady: true,
      note: "لا يوجد مشغّل جدولة بعد — لن تُرسل التقارير تلقائياً.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل جلب الجداول" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { user, error: authError } = await requireAdminApi(
    "canManageReportSchedules"
  );
  if (authError) return authError;
  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const role = await getAdminActorRole(user.id);
  if (!canManageReportSchedules({ id: user.id, email: user.email, role })) {
    return NextResponse.json(
      { error: "غير مصرح بإدارة جداول التقارير" },
      { status: 403 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase غير مُعد" },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as {
      frequency?: string;
      report_type?: string;
      email?: string;
      filters?: Record<string, unknown>;
      enabled?: boolean;
    };

    if (!body.frequency || !FREQUENCIES.has(body.frequency)) {
      return NextResponse.json(
        { error: "التكرار يجب أن يكون daily | weekly | monthly" },
        { status: 400 }
      );
    }
    const email = (body.email || "").trim();
    if (!email.includes("@")) {
      return NextResponse.json({ error: "بريد غير صالح" }, { status: 400 });
    }
    const reportType = (body.report_type || "overview").trim();

    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("report_schedules")
      .insert({
        frequency: body.frequency,
        report_type: reportType,
        email,
        filters: body.filters ?? {},
        enabled: body.enabled !== false,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error, "report_schedules")) {
        return NextResponse.json(
          {
            error:
              "جدول report_schedules غير موجود — شغّلي APPLY_REPORTS.sql",
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 400 }
      );
    }

    await writeAuditLog(supabase, {
      module: "reports",
      recordId: data.id,
      action: "create",
      actorId: user.id,
      actorEmail: user.email,
      meta: {
        type: "report_schedule",
        frequency: body.frequency,
        role: normalizeAdminRole(role),
        futureReady: true,
      },
    });

    return NextResponse.json({
      schedule: data,
      futureReady: true,
      note: "تم الحفظ. لن يُرسل تلقائياً حتى يتوفر مشغّل الجدولة.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل إنشاء الجدول" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;
  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const role = await getAdminActorRole(user.id);
  if (!canManageReportSchedules({ id: user.id, email: user.email, role })) {
    return NextResponse.json(
      { error: "غير مصرح بإدارة جداول التقارير" },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      frequency?: string;
      report_type?: string;
      email?: string;
      filters?: Record<string, unknown>;
      enabled?: boolean;
    };
    if (!body.id) {
      return NextResponse.json({ error: "معرّف الجدول مطلوب" }, { status: 400 });
    }
    if (body.frequency && !FREQUENCIES.has(body.frequency)) {
      return NextResponse.json({ error: "تكرار غير صالح" }, { status: 400 });
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.frequency) patch.frequency = body.frequency;
    if (body.report_type) patch.report_type = body.report_type;
    if (body.email) patch.email = body.email.trim();
    if (body.filters) patch.filters = body.filters;
    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;

    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("report_schedules")
      .update(patch)
      .eq("id", body.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 400 }
      );
    }

    await writeAuditLog(supabase, {
      module: "reports",
      recordId: body.id,
      action: "edit",
      actorId: user.id,
      actorEmail: user.email,
      meta: { type: "report_schedule", patch },
    });

    return NextResponse.json({ schedule: data, futureReady: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل تحديث الجدول" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;
  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const role = await getAdminActorRole(user.id);
  if (!canManageReportSchedules({ id: user.id, email: user.email, role })) {
    return NextResponse.json(
      { error: "غير مصرح بإدارة جداول التقارير" },
      { status: 403 }
    );
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "معرّف الجدول مطلوب" }, { status: 400 });
    }

    const supabase = await createPrivilegedClient();
    const { error } = await supabase
      .from("report_schedules")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 400 }
      );
    }

    await writeAuditLog(supabase, {
      module: "reports",
      recordId: id,
      action: "permanent_delete",
      actorId: user.id,
      actorEmail: user.email,
      meta: { type: "report_schedule" },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل حذف الجدول" },
      { status: 500 }
    );
  }
}
