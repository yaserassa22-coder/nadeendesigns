import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import {
  clearLocalOutbox,
  listLocalOutbox,
  shouldUseLocalNotificationOutbox,
} from "@/lib/notifications/local-outbox";

export async function GET() {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  return NextResponse.json({
    enabled: shouldUseLocalNotificationOutbox(),
    entries: listLocalOutbox(50),
  });
}

export async function DELETE() {
  const { error: authError } = await requireAdminApi("canMutateSettings");
  if (authError) return authError;

  clearLocalOutbox();
  return NextResponse.json({ success: true, entries: [] });
}
