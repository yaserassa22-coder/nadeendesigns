import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import {
  mergeSiteSettingsPatch,
  normalizeSiteSettings,
} from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import type { SiteSettings } from "@/types";

async function loadExistingSiteSettings(): Promise<SiteSettings> {
  if (!isSupabaseConfigured()) {
    return normalizeSiteSettings(DEFAULT_SETTINGS);
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "site")
    .single();
  if (error || !data?.value) {
    return normalizeSiteSettings(DEFAULT_SETTINGS);
  }
  return normalizeSiteSettings(data.value as SiteSettings);
}

export async function GET() {
  const settings = await loadExistingSiteSettings();
  return NextResponse.json(settings);
}

/**
 * Merge-on-write: never wipe shipping, notifications (separate key), checkout,
 * theme, CMS, or future keys when a partial admin form saves.
 */
export async function PUT(request: Request) {
  const { error: authError } = await requireAdminApi("canMutateSettings");
  if (authError) return authError;

  try {
    const body = (await request.json()) as Partial<SiteSettings>;
    const current = await loadExistingSiteSettings();
    const merged = mergeSiteSettingsPatch(current, body);

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "قاعدة البيانات غير مُعدّة. تحققي من إعدادات Supabase." },
        { status: 503 }
      );
    }
    const supabase = await createPrivilegedClient();
    const { error } = await supabase.from("settings").upsert({
      key: "site",
      value: merged,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    revalidatePath("/", "layout");
    revalidatePath("/checkout");
    revalidatePath("/contact");
    return NextResponse.json({ success: true, settings: merged });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "فشل حفظ الإعدادات. حاولي مرة أخرى.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
