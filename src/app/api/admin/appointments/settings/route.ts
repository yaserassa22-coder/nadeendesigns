import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import {
  mergeAppointmentSettings,
  normalizeAppointmentSettings,
  type AppointmentSettings,
} from "@/lib/admin/appointment-settings";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { createAdminClient } from "@/lib/supabase/admin";

async function loadSettings(): Promise<AppointmentSettings> {
  if (!isSupabaseConfigured()) {
    return normalizeAppointmentSettings(null);
  }
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "appointments")
    .maybeSingle();
  return normalizeAppointmentSettings(
    (data?.value as Partial<AppointmentSettings>) ?? null
  );
}

export async function GET() {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;
  const settings = await loadSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  const body = (await request.json()) as Partial<AppointmentSettings>;
  const current = await loadSettings();
  const merged = mergeAppointmentSettings(current, body);

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "قاعدة البيانات غير مُعدّة" },
      { status: 503 }
    );
  }

  const supabase = await createPrivilegedClient();
  const { error } = await supabase.from("settings").upsert({
    key: "appointments",
    value: merged,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true, settings: merged });
}
