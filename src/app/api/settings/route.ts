import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import {
  DEFAULT_SETTINGS,
  OFFICIAL_INSTAGRAM_HANDLE,
  OFFICIAL_INSTAGRAM_URL,
} from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import type { SiteSettings } from "@/types";

function withOfficialInstagram(settings: SiteSettings): SiteSettings {
  return {
    ...settings,
    instagram_url: OFFICIAL_INSTAGRAM_URL,
    instagram_handle: OFFICIAL_INSTAGRAM_HANDLE,
  };
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(withOfficialInstagram(DEFAULT_SETTINGS));
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "site")
    .single();
  if (error || !data) {
    return NextResponse.json(withOfficialInstagram(DEFAULT_SETTINGS));
  }
  return NextResponse.json(withOfficialInstagram(data.value as SiteSettings));
}

export async function PUT(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  try {
    const body = withOfficialInstagram((await request.json()) as SiteSettings);
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
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
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
