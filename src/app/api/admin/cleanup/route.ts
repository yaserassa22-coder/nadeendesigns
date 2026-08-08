import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import {
  runTrashCleanup,
  type TrashCleanupDaysByModule,
} from "@/lib/admin/lifecycle";
import { canPermanentDelete } from "@/lib/admin/permissions";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { normalizeSiteSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import type { SiteSettings } from "@/types";

async function loadCleanupConfig(): Promise<TrashCleanupDaysByModule> {
  const fallbackDays = DEFAULT_SETTINGS.trash_cleanup_days ?? 30;
  const defaults: TrashCleanupDaysByModule = {
    defaultDays: fallbackDays,
    customer_notifications:
      DEFAULT_SETTINGS.cleanup_read_notifications_days ?? 30,
    notification_logs: DEFAULT_SETTINGS.cleanup_archived_logs_days ?? 60,
    messages: DEFAULT_SETTINGS.cleanup_old_messages_days ?? 90,
  };

  if (!isSupabaseConfigured()) return defaults;
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
    return {
      defaultDays:
        typeof settings.trash_cleanup_days === "number" &&
        settings.trash_cleanup_days >= 1
          ? settings.trash_cleanup_days
          : fallbackDays,
      customer_notifications:
        settings.cleanup_read_notifications_days ??
        defaults.customer_notifications,
      notification_logs:
        settings.cleanup_archived_logs_days ?? defaults.notification_logs,
      messages:
        settings.cleanup_old_messages_days ?? defaults.messages,
    };
  } catch {
    return defaults;
  }
}

/** Explicit "Run cleanup" — never auto; never orders/bookings. */
export async function POST(request: Request) {
  const { user, error: authError, role } = await requireAdminApi(
    "canEmptyTrash"
  );
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
    role,
  };

  if (!canPermanentDelete(actor)) {
    return NextResponse.json({ error: "غير مصرح بالتنظيف" }, { status: 403 });
  }

  let config = await loadCleanupConfig();
  try {
    const body = (await request.json()) as {
      days?: number;
      cleanup_read_notifications_days?: number;
      cleanup_old_messages_days?: number;
      cleanup_archived_logs_days?: number;
    };
    if (typeof body.days === "number" && body.days >= 1) {
      config = { ...config, defaultDays: Math.floor(body.days) };
    }
    if (
      typeof body.cleanup_read_notifications_days === "number" &&
      body.cleanup_read_notifications_days >= 1
    ) {
      config = {
        ...config,
        customer_notifications: Math.floor(
          body.cleanup_read_notifications_days
        ),
      };
    }
    if (
      typeof body.cleanup_old_messages_days === "number" &&
      body.cleanup_old_messages_days >= 1
    ) {
      config = {
        ...config,
        messages: Math.floor(body.cleanup_old_messages_days),
      };
    }
    if (
      typeof body.cleanup_archived_logs_days === "number" &&
      body.cleanup_archived_logs_days >= 1
    ) {
      config = {
        ...config,
        notification_logs: Math.floor(body.cleanup_archived_logs_days),
      };
    }
  } catch {
    // optional body
  }

  const supabase = await createPrivilegedClient();
  const result = await runTrashCleanup(supabase, actor, config);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({
    success: true,
    deleted: result.deleted,
    days: config.defaultDays,
    config,
    note: "لم تُمس الطلبات والحجوزات — التنظيف لا يشملهما أبداً.",
  });
}
