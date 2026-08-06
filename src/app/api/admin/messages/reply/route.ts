import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import {
  getReplyToEmail,
  isResendConfigured,
} from "@/lib/notifications/config";
import { sendEmail } from "@/lib/notifications/email";
import { getNotificationSettings } from "@/lib/notifications/settings";
import { adminContactReplyEmail } from "@/lib/notifications/templates";
import { isMissingColumnError } from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";

const bodySchema = z.object({
  messageId: z.string().uuid("معرّف الرسالة غير صالح"),
  subject: z.string().trim().min(1, "الموضوع مطلوب").max(200),
  body: z.string().trim().min(2, "نص الرد قصير جدًا").max(8000),
});

/** In-flight guard — prevents duplicate sends for the same message. */
const sendingIds = new Set<string>();

function devPayload(extra: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return {};
  return extra;
}

/**
 * POST /api/admin/messages/reply
 * Authenticated Admin only — sends a branded Resend email and stores reply metadata.
 */
export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdminApi();
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

  if (!isResendConfigured()) {
    return NextResponse.json(
      {
        error:
          "خدمة البريد غير مُعدّة. أضيفي RESEND_API_KEY و RESEND_FROM_EMAIL (أو FROM_EMAIL).",
        ...devPayload({ detail: "Resend not configured" }),
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

  const { messageId, subject, body } = parsed.data;

  if (sendingIds.has(messageId)) {
    return NextResponse.json(
      { error: "جاري إرسال رد لهذه الرسالة. انتظري لحظة." },
      { status: 429 }
    );
  }
  sendingIds.add(messageId);

  try {
    const supabase = await createPrivilegedClient();
    const { data: row, error: loadError } = await supabase
      .from("contact_messages")
      .select("id, name, email, subject, is_deleted")
      .eq("id", messageId)
      .maybeSingle();

    if (loadError) {
      console.error("[messages/reply] load failed", loadError);
      return NextResponse.json(
        {
          error: "تعذّر تحميل الرسالة",
          ...devPayload({
            detail: loadError.message,
            code: loadError.code,
          }),
        },
        { status: 400 }
      );
    }

    if (!row || (row as { is_deleted?: boolean }).is_deleted) {
      return NextResponse.json(
        { error: "الرسالة غير موجودة" },
        { status: 404 }
      );
    }

    const to = String(row.email || "").trim();
    if (!to || !to.includes("@")) {
      return NextResponse.json(
        { error: "بريد العميلة غير صالح" },
        { status: 400 }
      );
    }

    const settings = await getNotificationSettings();
    const replyTo =
      getReplyToEmail() || settings.reply_email || undefined;

    const mail = adminContactReplyEmail({
      customerName: String(row.name || "عزيزتي"),
      originalSubject: String(row.subject || ""),
      replySubject: subject,
      replyBody: body,
      settings,
    });

    const sendResult = await sendEmail({
      to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo,
      fromName: settings.sender_name,
    });

    const now = new Date().toISOString();

    if (!sendResult.ok) {
      console.error("[messages/reply] Resend failed", sendResult.error);
      await persistReplyMeta(supabase, messageId, {
        last_reply_at: now,
        last_reply_status: "failed",
        last_reply_subject: mail.subject,
        last_reply_error: sendResult.error,
      });
      return NextResponse.json(
        {
          error: sendResult.error,
          ...devPayload({ detail: sendResult.error }),
        },
        { status: 502 }
      );
    }

    await persistReplyMeta(supabase, messageId, {
      last_reply_at: now,
      last_reply_status: "sent",
      last_reply_subject: mail.subject,
      last_reply_error: null,
      is_read: true,
    });

    return NextResponse.json({
      success: true,
      message: "تم إرسال الرد بنجاح",
      emailId: sendResult.id ?? null,
      last_reply_at: now,
      last_reply_status: "sent",
      last_reply_subject: mail.subject,
    });
  } catch (e) {
    console.error("[messages/reply] unexpected", e);
    return NextResponse.json(
      {
        error: "حدث خطأ أثناء إرسال الرد",
        ...devPayload({
          detail: e instanceof Error ? e.message : String(e),
        }),
      },
      { status: 500 }
    );
  } finally {
    sendingIds.delete(messageId);
  }
}

async function persistReplyMeta(
  supabase: Awaited<ReturnType<typeof createPrivilegedClient>>,
  id: string,
  patch: Record<string, unknown>
) {
  const { error } = await supabase
    .from("contact_messages")
    .update(patch)
    .eq("id", id);

  if (
    error &&
    (isMissingColumnError(error) ||
      /last_reply_/i.test(error.message || ""))
  ) {
    console.warn(
      "[messages/reply] reply metadata columns missing — run APPLY_CONTACT_MESSAGE_REPLIES.sql",
      error.message
    );
    // Still mark read if possible
    if ("is_read" in patch) {
      await supabase
        .from("contact_messages")
        .update({ is_read: true })
        .eq("id", id);
    }
    return;
  }
  if (error) {
    console.error("[messages/reply] metadata update failed", error);
  }
}
