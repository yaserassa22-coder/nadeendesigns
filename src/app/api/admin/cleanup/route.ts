import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { runTrashCleanup } from "@/lib/admin/lifecycle";
import { canPermanentDelete } from "@/lib/admin/permissions";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { normalizeSiteSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import type { SiteSettings } from "@/types";

async function loadCleanupDays(): Promise<number> {
  const fallback = DEFAULT_SETTINGS.trash_cleanup_days ?? 30;
  if (!isSupabaseConfigured()) return fallback;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "site")
      .single();
    const settings = normalizeSiteSettings(
      (data?.value as SiteSettings | null) ?? null
    );
    const days = settings.trash_cleanup_days;
    return typeof days === "number" && days >= 1 ? days : fallback;
  } catch {
    return fallback;
  }
}

/** Explicit "Run cleanup" — never auto; never orders/bookings. */
export async function POST(request: Request) {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase غير مُعد. تحققي من متغيرات البيئة." },
      { status: 503 }
    );
  }

  const actor = {
    id: user!.id,
    email: user!.email,
    role: "admin",
  };

  if (!canPermanentDelete(actor)) {
    return NextResponse.json({ error: "غير مصرح بالتنظيف" }, { status: 403 });
  }

  let days = await loadCleanupDays();
  try {
    const body = (await request.json()) as { days?: number };
    if (typeof body.days === "number" && body.days >= 1) {
      days = Math.floor(body.days);
    }
  } catch {
    // optional body
  }

  const supabase = await createPrivilegedClient();
  const result = await runTrashCleanup(supabase, actor, days);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({
    success: true,
    deleted: result.deleted,
    days,
    note: "لم تُمس الطلبات والحجوزات — التنظيف لا يشملهما أبداً.",
  });
}
