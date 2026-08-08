import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { getLiveBackupStatus } from "@/lib/store/backup-status";
import {
  getStoreSettings,
  saveStoreSettings,
} from "@/lib/store/settings";

/**
 * Live backup / platform status for Admin → Settings → Security.
 * Optionally persists the snapshot into store.security for later display.
 */
export async function GET(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const snapshot = await getLiveBackupStatus();
    const { searchParams } = new URL(request.url);
    const persist = searchParams.get("persist") === "1";

    if (persist) {
      const current = await getStoreSettings(true);
      await saveStoreSettings({
        ...current,
        security: {
          ...current.security,
          backup_status: snapshot.backup_status,
          backup_last_at: snapshot.backup_last_at,
          backup_note: snapshot.backup_note,
        },
      }, ["security"]);
    }

    return NextResponse.json({ success: true, ...snapshot });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Backup status failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
