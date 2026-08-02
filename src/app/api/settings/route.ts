import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import type { SiteSettings } from "@/types";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(DEFAULT_SETTINGS);
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "site")
    .single();
  if (error || !data) return NextResponse.json(DEFAULT_SETTINGS);
  return NextResponse.json(data.value as SiteSettings);
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as SiteSettings;
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }
    const supabase = createAdminClient();
    const { error } = await supabase.from("settings").upsert({
      key: "site",
      value: body,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
