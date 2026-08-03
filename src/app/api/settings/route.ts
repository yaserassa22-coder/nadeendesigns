import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { normalizeSiteSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import type { SiteSettings } from "@/types";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(normalizeSiteSettings(DEFAULT_SETTINGS));
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "site")
    .single();
  if (error || !data) {
    return NextResponse.json(normalizeSiteSettings(DEFAULT_SETTINGS));
  }
  return NextResponse.json(normalizeSiteSettings(data.value as SiteSettings));
}

export async function PUT(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  try {
    const body = normalizeSiteSettings((await request.json()) as SiteSettings);
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "قاعدة البيانات غير مُعدّة. تحققي من إعدادات Supabase." },
        { status: 503 }
      );
    }
    const supabase = await createPrivilegedClient();
    const { error } = await supabase.from("settings").upsert({
      key: "site",
      value: body,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "فشل حفظ الإعدادات. حاولي مرة أخرى.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
