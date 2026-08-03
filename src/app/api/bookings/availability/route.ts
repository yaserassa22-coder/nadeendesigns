import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getAvailableSlots } from "@/lib/admin/appointment-slots";

/** Public: available slots for date (+ optional consultant / duration). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date")?.trim();
  const consultantId = searchParams.get("consultantId")?.trim() || null;
  const durationRaw = searchParams.get("duration");
  const durationMinutes = durationRaw ? Number(durationRaw) : undefined;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "التاريخ مطلوب بصيغة YYYY-MM-DD" },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      slots: [],
      warning: "Supabase غير مُعد",
    });
  }

  const supabase = createAdminClient();
  const result = await getAvailableSlots(supabase, {
    date,
    consultantId,
    durationMinutes:
      durationMinutes && Number.isFinite(durationMinutes)
        ? durationMinutes
        : undefined,
  });

  return NextResponse.json(
    {
      date,
      consultantId,
      slots: result.slots,
      settings: {
        opening_time: result.settings.opening_time,
        closing_time: result.settings.closing_time,
        slot_interval_minutes: result.settings.slot_interval_minutes,
        duration_presets: result.settings.duration_presets,
      },
      warning: result.warning,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
