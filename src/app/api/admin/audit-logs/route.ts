import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { isLifecycleModule } from "@/lib/admin/lifecycle";
import {
  getErrorMessage,
  isMissingTableError,
} from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";

export async function GET(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ logs: [], count: 0 });
  }

  const { searchParams } = new URL(request.url);
  const moduleParam = searchParams.get("module");
  const recordId = searchParams.get("recordId");
  const limitRaw = Number(searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, limitRaw), 200)
    : 50;

  const supabase = await createPrivilegedClient();
  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (moduleParam && isLifecycleModule(moduleParam)) {
    query = query.eq("module", moduleParam);
  }
  if (recordId) {
    query = query.eq("record_id", recordId);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error, "audit_logs")) {
      return NextResponse.json({
        logs: [],
        count: 0,
        warning:
          "جدول audit_logs غير موجود. نفّذي supabase/APPLY_SOFT_DELETE_ARCHIVE.sql",
      });
    }
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 400 }
    );
  }

  return NextResponse.json({
    logs: data ?? [],
    count: (data ?? []).length,
  });
}
