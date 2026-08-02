import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import {
  getNotificationSettings,
  mergeNotificationSettings,
  saveNotificationSettings,
} from "@/lib/notifications/settings";
import { DEFAULT_NOTIFICATION_SETTINGS, type NotificationSettings } from "@/types/shop";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET() {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  const settings = await getNotificationSettings(true);
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  try {
    const body = (await request.json()) as Partial<NotificationSettings>;
    const merged = mergeNotificationSettings({
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...body,
    });

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        settings: merged,
        warning: "Supabase غير مُعد — تم الحفظ مؤقتاً في الذاكرة فقط",
      });
    }

    const settings = await saveNotificationSettings(merged);
    return NextResponse.json({ success: true, settings });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل حفظ الإعدادات" },
      { status: 400 }
    );
  }
}
