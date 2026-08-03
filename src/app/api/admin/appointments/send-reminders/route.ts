import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { sendAppointmentReminders } from "@/lib/admin/appointment-reminders";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";

/**
 * Manual / future-cron endpoint for appointment reminders.
 * GET ?dryRun=1 to preview. POST to send.
 * Full cron runner is not deployed yet — wire an external cron to this route later.
 */
export async function GET() {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ sent: [], scanned: 0 });
  }

  const supabase = await createPrivilegedClient();
  const result = await sendAppointmentReminders(supabase, { dryRun: true });
  return NextResponse.json({
    ...result,
    dryRun: true,
    note: "معاينة فقط — أرسلي POST للإرسال الفعلي. الكرون غير مفعّل بعد.",
  });
}

export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase غير مُعد" },
      { status: 503 }
    );
  }

  let dryRun = false;
  try {
    const body = (await request.json()) as { dryRun?: boolean };
    dryRun = Boolean(body?.dryRun);
  } catch {
    /* empty body ok */
  }

  const supabase = await createPrivilegedClient();
  const result = await sendAppointmentReminders(supabase, { dryRun });
  return NextResponse.json({
    ...result,
    dryRun,
    note: dryRun
      ? "معاينة فقط"
      : "تم تنفيذ الإرسال (best-effort). الكرون غير مفعّل بعد.",
  });
}
