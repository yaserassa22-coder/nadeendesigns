import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/admin/audit";
import { requireAdminApi } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";

export const dynamic = "force-dynamic";

/** Audit-only endpoint when the admin prints a report (window.print). */
export async function POST(request: Request) {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;
  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      section?: string;
      preset?: string;
    };

    if (isSupabaseConfigured()) {
      const supabase = await createPrivilegedClient();
      await writeAuditLog(supabase, {
        module: "reports",
        recordId: body.section || "overview",
        action: "report_printed",
        actorId: user.id,
        actorEmail: user.email,
        meta: { preset: body.preset ?? null },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل تسجيل الطباعة" },
      { status: 500 }
    );
  }
}
