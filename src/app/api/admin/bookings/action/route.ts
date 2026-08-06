import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import {
  BOOKING_ADMIN_ACTIONS,
  resolveStatusForAction,
} from "@/lib/bookings/status-actions";
import {
  getReplyToEmail,
  isResendConfigured,
} from "@/lib/notifications/config";
import { sendEmail } from "@/lib/notifications/email";
import { getNotificationSettings } from "@/lib/notifications/settings";
import { adminBookingStatusEmail } from "@/lib/notifications/templates";
import { isMissingColumnError } from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import type { BookingStatusHistoryEntry } from "@/types";

const bodySchema = z.object({
  bookingId: z.string().uuid("معرّف الحجز غير صالح"),
  action: z.enum(BOOKING_ADMIN_ACTIONS),
  subject: z.string().trim().min(1, "الموضوع مطلوب").max(200),
  body: z.string().trim().min(2, "نص الرسالة قصير جدًا").max(8000),
  /** When false, update status only — no Resend attempt. */
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
 * Admin-only: update booking status (when applicable) + optional customer email.
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
  const actor =
    user?.email?.trim() ||
    user?.id ||
    "admin";

  if (sendingIds.has(bookingId)) {
    return NextResponse.json(
      { error: "جاري تنفيذ إجراء لهذا الحجز. انتظري لحظة." },
      { status: 429 }
    );
  }
  sendingIds.add(bookingId);

  try {
    const supabase = await createPrivilegedClient();
    const { data: row, error: loadError } = await supabase
      .from("bookings")
      .select(
        "id, name, email, phone, date, time, status, notify_email, status_history, is_deleted"
      )
      .eq("id", bookingId)
      .maybeSingle();

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

    const to = String(row.email || "").trim();
    const notifyEmail = (row as { notify_email?: boolean }).notify_email !== false;

    let emailResult: {
      attempted: boolean;
      sent: boolean;
      skippedReason?: string;
      error?: string;
      emailId?: string | null;
    } = { attempted: false, sent: false };

    if (wantEmail) {
      if (!isResendConfigured()) {
        emailResult = {
          attempted: false,
          sent: false,
          skippedReason: "resend_not_configured",
        };
      } else if (!to || !to.includes("@")) {
        emailResult = {
          attempted: false,
          sent: false,
          skippedReason: "missing_customer_email",
        };
      } else if (!notifyEmail) {
        emailResult = {
          attempted: false,
          sent: false,
          skippedReason: "customer_opted_out",
        };
      } else {
        emailResult.attempted = true;
        const settings = await getNotificationSettings();
        const mail = adminBookingStatusEmail({
          customerName: String(row.name || "عزيزتي"),
          subject,
          body,
          settings,
        });
        const replyTo =
          getReplyToEmail() || settings.reply_email || undefined;
        const sendResult = await sendEmail({
          to,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          replyTo,
          fromName: settings.sender_name,
        });
        if (sendResult.ok) {
          emailResult = {
            attempted: true,
            sent: true,
            emailId: sendResult.id ?? null,
          };
        } else {
          emailResult = {
            attempted: true,
            sent: false,
            error: sendResult.error,
          };
        }
      }
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

    const replyStatus = !wantEmail
      ? "skipped"
      : emailResult.sent
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
        // Fallback: status-only update if migration not applied yet.
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

    return NextResponse.json({
      success: true,
      status: nextStatus ?? row.status,
      email: emailResult,
      last_reply_at: now,
      last_reply_status: replyStatus,
      last_reply_subject: subject,
      last_reply_by: actor,
      status_history: history,
      message: emailResult.sent
        ? "تم تحديث الحالة وإرسال البريد"
        : nextStatus
          ? "تم تحديث الحالة"
          : "تم تسجيل الرد",
      warning:
        wantEmail && !emailResult.sent
          ? emailResult.skippedReason === "resend_not_configured"
            ? "خدمة البريد غير مُعدّة — تم حفظ الحالة دون إرسال."
            : emailResult.skippedReason === "missing_customer_email"
              ? "لا يوجد بريد للعميلة — تم حفظ الحالة دون إرسال."
              : emailResult.error ||
                "تعذّر إرسال البريد — تم حفظ الحالة."
          : null,
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
