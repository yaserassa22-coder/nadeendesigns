import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import {
  BOOKING_ADMIN_ACTIONS,
  resolveStatusForAction,
} from "@/lib/bookings/status-actions";
import { notifyBookingAdminAction } from "@/lib/notifications/service";
import { isMissingColumnError } from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import type { Booking, BookingStatusHistoryEntry } from "@/types";

const bodySchema = z.object({
  bookingId: z.string().uuid("معرّف الحجز غير صالح"),
  action: z.enum(BOOKING_ADMIN_ACTIONS),
  subject: z.string().trim().min(1, "الموضوع مطلوب").max(200),
  body: z.string().trim().min(2, "نص الرسالة قصير جدًا").max(8000),
  /** When false, update status only — still creates in-app notification. */
  sendEmail: z.boolean().optional().default(true),
});

const sendingIds = new Set<string>();

function devPayload(extra: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return {};
  return extra;
}

function asHistory(raw: unknown): BookingStatusHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (row): row is BookingStatusHistoryEntry =>
      Boolean(row) &&
      typeof row === "object" &&
      typeof (row as BookingStatusHistoryEntry).status === "string" &&
      typeof (row as BookingStatusHistoryEntry).at === "string"
  );
}

/**
 * POST /api/admin/bookings/action
 * Admin-only: update booking status + notify customer
 * (in-app + account thread + WhatsApp/email per prefs).
 */
export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireAdminApi("canMutateStore");
  if (authError) return authError;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error: "قاعدة البيانات غير مُعدّة",
        ...devPayload({ detail: "Supabase env missing" }),
      },
      { status: 503 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || "بيانات غير صالحة";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { bookingId, action, subject, body, sendEmail: wantEmail } =
    parsed.data;
  const nextStatus = resolveStatusForAction(action);
  const actor = user?.email?.trim() || user?.id || "admin";

  if (sendingIds.has(bookingId)) {
    return NextResponse.json(
      { error: "جاري تنفيذ إجراء لهذا الحجز. انتظري لحظة." },
      { status: 429 }
    );
  }
  sendingIds.add(bookingId);

  try {
    const supabase = await createPrivilegedClient();
    let { data: row, error: loadError } = await supabase
      .from("bookings")
      .select(
        "id, name, email, phone, date, time, service_type, status, notify_email, notify_whatsapp, customer_id, status_history, is_deleted"
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (
      loadError &&
      (isMissingColumnError(loadError) ||
        /customer_id|notify_whatsapp|is_deleted|status_history/i.test(
          loadError.message || ""
        ))
    ) {
      const fallback = await supabase
        .from("bookings")
        .select(
          "id, name, email, phone, date, time, service_type, status, notify_email, notify_whatsapp"
        )
        .eq("id", bookingId)
        .maybeSingle();
      row = fallback.data as typeof row;
      loadError = fallback.error;
    }

    if (loadError) {
      console.error("[bookings/action] load failed", loadError);
      return NextResponse.json(
        {
          error: "تعذّر تحميل الحجز",
          ...devPayload({ detail: loadError.message }),
        },
        { status: 400 }
      );
    }

    if (!row || (row as { is_deleted?: boolean }).is_deleted) {
      return NextResponse.json({ error: "الحجز غير موجود" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const history = asHistory(
      (row as { status_history?: unknown }).status_history
    );
    if (nextStatus) {
      history.push({
        status: nextStatus,
        at: now,
        by: actor,
        action,
        note: subject,
      });
    }

    // Notify customer BEFORE / after status — run after we have row data.
    const notify = await notifyBookingAdminAction({
      booking: {
        id: String(row.id),
        name: String(row.name || ""),
        phone: String(row.phone || ""),
        email: (row.email as string | null) ?? null,
        date: String(row.date || ""),
        time: String(row.time || ""),
        service_type: (row.service_type || "wedding_dress") as Booking["service_type"],
        notify_email: (row as { notify_email?: boolean }).notify_email,
        notify_whatsapp: (row as { notify_whatsapp?: boolean }).notify_whatsapp,
        customer_id: (row as { customer_id?: string | null }).customer_id ?? null,
      },
      action,
      nextStatus,
      subject,
      body,
      wantEmail,
    });

    const emailResult = notify.email;
    const replyStatus = !wantEmail
      ? "skipped"
      : emailResult.sent
        ? emailResult.local
          ? "local"
          : "sent"
        : notify.account || notify.inApp || notify.whatsapp.sent
          ? "sent"
          : emailResult.attempted
            ? "failed"
            : "skipped";

    const patch: Record<string, unknown> = {
      last_reply_at: now,
      last_reply_status: replyStatus,
      last_reply_subject: subject,
      last_reply_by: actor,
      status_history: history,
      updated_at: now,
    };
    if (nextStatus) {
      patch.status = nextStatus;
      if (nextStatus === "completed") {
        patch.completed_at = now;
      }
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update(patch)
      .eq("id", bookingId);

    if (updateError) {
      if (
        isMissingColumnError(updateError) ||
        /last_reply_|status_history|rescheduled/i.test(
          updateError.message || ""
        )
      ) {
        const fallback: Record<string, unknown> = {};
        if (nextStatus) fallback.status = nextStatus;
        if (Object.keys(fallback).length) {
          await supabase.from("bookings").update(fallback).eq("id", bookingId);
        }
        console.warn(
          "[bookings/action] reply/history columns missing — run APPLY_BOOKING_STATUS_MANAGEMENT.sql",
          updateError.message
        );
      } else {
        console.error("[bookings/action] update failed", updateError);
        return NextResponse.json(
          {
            error: "تعذّر تحديث الحجز",
            ...devPayload({ detail: updateError.message }),
          },
          { status: 400 }
        );
      }
    }

    const parts: string[] = [];
    if (nextStatus) parts.push("تم تحديث الحالة");
    if (notify.inApp) parts.push("إشعار في الحساب");
    if (notify.account) parts.push("رسالة في المحادثة");
    if (notify.whatsapp.sent) parts.push("واتساب");
    if (emailResult.sent && !emailResult.local) parts.push("بريد");
    if (emailResult.sent && emailResult.local) parts.push("بريد محلي");

    const warningParts: string[] = [];
    if (wantEmail && !emailResult.sent) {
      if (emailResult.skippedReason === "email_unavailable") {
        warningParts.push(
          "البريد غير مُعد — فعّلي Resend من الإشعارات عند جاهزية النطاق."
        );
      } else if (emailResult.skippedReason === "missing_customer_email") {
        warningParts.push("لا يوجد بريد للعميلة.");
      } else if (emailResult.skippedReason === "customer_opted_out") {
        warningParts.push("العميلة أوقفت إشعارات البريد.");
      } else if (emailResult.error) {
        warningParts.push(emailResult.error);
      } else {
        warningParts.push("تعذّر إرسال البريد.");
      }
    }
    if (emailResult.sent && emailResult.local) {
      warningParts.push(
        "البريد في الوضع المحلي — العميلة ترى التأكيد في الحساب/الواتساب إن توفّرا."
      );
    }
    if (
      !notify.whatsapp.sent &&
      notify.whatsapp.skippedReason === "whatsapp_not_configured" &&
      (row as { notify_whatsapp?: boolean }).notify_whatsapp !== false
    ) {
      warningParts.push("واتساب غير مُعد (Twilio).");
    }

    return NextResponse.json({
      success: true,
      status: nextStatus ?? row.status,
      email: emailResult,
      whatsapp: notify.whatsapp,
      inApp: notify.inApp,
      account: notify.account,
      customerNotified: notify.customerNotified,
      last_reply_at: now,
      last_reply_status: replyStatus,
      last_reply_subject: subject,
      last_reply_by: actor,
      status_history: history,
      message: parts.join(" · ") || "تم تسجيل الإجراء",
      warning: warningParts.length ? warningParts.join(" ") : null,
    });
  } catch (e) {
    console.error("[bookings/action] unexpected", e);
    return NextResponse.json(
      {
        error: "حدث خطأ أثناء تنفيذ الإجراء",
        ...devPayload({
          detail: e instanceof Error ? e.message : String(e),
        }),
      },
      { status: 500 }
    );
  } finally {
    sendingIds.delete(bookingId);
  }
}
