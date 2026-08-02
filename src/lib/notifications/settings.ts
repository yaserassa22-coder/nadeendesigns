import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
} from "@/types/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";


let cached: NotificationSettings | null = null;
let cachedAt = 0;
const CACHE_MS = 30_000;

export function mergeNotificationSettings(
  value?: Partial<NotificationSettings> | null
): NotificationSettings {
  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...value,
    whatsapp_templates: {
      ...DEFAULT_NOTIFICATION_SETTINGS.whatsapp_templates,
      ...(value?.whatsapp_templates ?? {}),
    },
    email_subjects: {
      ...DEFAULT_NOTIFICATION_SETTINGS.email_subjects,
      ...(value?.email_subjects ?? {}),
    },
  };
}

export async function getNotificationSettings(
  force = false
): Promise<NotificationSettings> {
  const now = Date.now();
  if (!force && cached && now - cachedAt < CACHE_MS) return cached;

  if (!isSupabaseConfigured()) {
    cached = DEFAULT_NOTIFICATION_SETTINGS;
    cachedAt = now;
    return cached;
  }

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "notifications")
      .maybeSingle();
    cached = mergeNotificationSettings(
      (data?.value as Partial<NotificationSettings> | null) ?? null
    );
    cachedAt = now;
    return cached;
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export async function saveNotificationSettings(
  value: NotificationSettings
): Promise<NotificationSettings> {
  const merged = mergeNotificationSettings(value);
  if (!isSupabaseConfigured()) {
    cached = merged;
    cachedAt = Date.now();
    return merged;
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from("settings").upsert({
    key: "notifications",
    value: merged,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  cached = merged;
  cachedAt = Date.now();
  return merged;
}
