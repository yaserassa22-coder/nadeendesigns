import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { writeBoutiqueAccountReply } from "@/lib/admin/account-message-bridge";
import { getReplyToEmail, canAttemptEmail } from "@/lib/notifications/config";
import { sendEmail } from "@/lib/notifications/email";
import { getEmailRuntime } from "@/lib/notifications/email-provider";
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

function isPlaceholderEmail(email: string) {
  return (
    !email ||
    email.endsWith("@customers.nadeendesigns.local") ||
    email.endsWith("@nadeendesigns.local")
  );
}

type InboxRow = {
  id: string;
  name: string | null;
  email: string | null;
  subject: string | null;
  is_deleted?: boolean;
  source?: string | null;
  customer_id?: string | null;
};

/**
 * POST /api/admin/messages/reply
 * - Always writes into /account/messages thread when customer_id is known
 * - Also emails when a real inbox address + email transport are available
 */
export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdminApi("canMutateStore");
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
    const row = await loadContactMessage(supabase, messageId);

    if (!row) {
      return NextResponse.json(
        { error: "الرسالة غير موجودة" },
        { status: 404 }
      );
    }

    let customerId = row.customer_id?.trim() || null;
    if (!customerId && row.email && !isPlaceholderEmail(row.email)) {
      customerId = await resolveCustomerIdByEmail(supabase, row.email);
    }

    const to = String(row.email || "").trim();
    const canEmailAddress = Boolean(to && to.includes("@") && !isPlaceholderEmail(to));

    await getEmailRuntime(true);
    const emailTransportOk = canAttemptEmail();

    if (!customerId && !canEmailAddress) {
      return NextResponse.json(
        {
          error:
            "لا يمكن الرد: لا يوجد حساب مربوط ولا بريد صالح لهذه الرسالة.",
        },
        { status: 400 }
      );
    }

    if (!customerId && !emailTransportOk) {
      return NextResponse.json(
        {
          error:
            "إرسال البريد متوقف. من الإشعارات: فعّلي البريد أو اختاري الوضع المحلي / Resend.",
          ...devPayload({ detail: "Email disabled or unavailable" }),
        },
        { status: 503 }
      );
    }

    const settings = await getNotificationSettings();
    const replyTo = getReplyToEmail() || settings.reply_email || undefined;
    const mail = adminContactReplyEmail({
      customerName: String(row.name || "عزيزتي"),
      originalSubject: String(row.subject || ""),
      replySubject: subject,
      replyBody: body,
      settings,
    });

    // 1) Account thread + in-app notification (customer_notifications)
    let accountDelivered = false;
    let inAppDelivered = false;
    let accountError: string | null = null;
    if (customerId) {
      const accountWrite = await writeBoutiqueAccountReply(supabase, {
        customerId,
        body,
      });
      accountDelivered = accountWrite.ok;
      inAppDelivered = Boolean(accountWrite.inApp);
      accountError = accountWrite.error ?? null;
      if (!accountWrite.ok) {
        console.error("[messages/reply] account thread write failed", accountWrite.error);
      }
    }

    // 2) Email — when real address + transport available
    let sendResult: Awaited<ReturnType<typeof sendEmail>> | null = null;
    if (canEmailAddress && emailTransportOk) {
      sendResult = await sendEmail({
        to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        replyTo,
        fromName: settings.sender_name,
      });
    }

    const now = new Date().toISOString();
    const emailOk = Boolean(sendResult?.ok);
    const emailLocal = Boolean(sendResult?.ok && sendResult.local);

    if (!accountDelivered && !emailOk) {
      await persistReplyMeta(supabase, messageId, {
        last_reply_at: now,
        last_reply_status: "failed",
        last_reply_subject: mail.subject,
        last_reply_error:
          sendResult && !sendResult.ok
            ? sendResult.error
            : accountError || "تعذّر تسليم الرد",
        is_read: true,
      });
      return NextResponse.json({
        success: true,
        message: "تم حفظ الرد",
        emailId: null,
        accountDelivered: false,
        local: false,
        last_reply_at: now,
        last_reply_status: "failed",
        last_reply_subject: mail.subject,
        warning:
          (sendResult && !sendResult.ok ? sendResult.error : null) ||
          accountError ||
          "تعذّر تسليم الرد للعميلة.",
        ...devPayload({
          detail:
            (sendResult && !sendResult.ok ? sendResult.error : null) ||
            accountError,
        }),
      });
    }

    const replyStatus = emailOk
      ? emailLocal
        ? "local"
        : "sent"
      : accountDelivered
        ? "sent"
        : "failed";

    await persistReplyMeta(supabase, messageId, {
      last_reply_at: now,
      last_reply_status: replyStatus,
      last_reply_subject: mail.subject,
      last_reply_error: null,
      is_read: true,
    });

    const parts: string[] = [];
    if (accountDelivered) parts.push("ظهر الرد في رسائل حساب العميلة");
    if (inAppDelivered) parts.push("إشعار في الحساب");
    if (emailOk && !emailLocal) parts.push("أُرسل بريد");
    if (emailOk && emailLocal) parts.push("البريد في الوضع المحلي");
    if (!emailOk && canEmailAddress) {
      parts.push("تعذّر البريد — الرد وصل عبر الحساب");
    }

    return NextResponse.json({
      success: true,
      message: parts.join(" · ") || "تم إرسال الرد بنجاح",
      emailId: sendResult && sendResult.ok ? sendResult.id ?? null : null,
      accountDelivered,
      inApp: inAppDelivered,
      local: emailLocal,
      last_reply_at: now,
      last_reply_status: replyStatus,
      last_reply_subject: mail.subject,
      warning:
        !emailOk && canEmailAddress && accountDelivered
          ? sendResult && !sendResult.ok
            ? sendResult.error
            : "لم يُرسل بريد — الرد متاح في حساب العميلة"
          : emailLocal
            ? "الوضع المحلي نشط للبريد — فعّلي Resend عند جاهزية النطاق."
            : null,
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

async function resolveCustomerIdByEmail(
  supabase: Awaited<ReturnType<typeof createPrivilegedClient>>,
  email: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .ilike("email", email.trim())
    .limit(1)
    .maybeSingle();
  if (error || !data?.id) return null;
  return String(data.id);
}

async function loadContactMessage(
  supabase: Awaited<ReturnType<typeof createPrivilegedClient>>,
  messageId: string
): Promise<InboxRow | null> {
  const full = await supabase
    .from("contact_messages")
    .select("id, name, email, subject, is_deleted, source, customer_id")
    .eq("id", messageId)
    .maybeSingle();

  if (
    full.error &&
    (isMissingColumnError(full.error) ||
      /is_deleted|source|customer_id/i.test(full.error.message || ""))
  ) {
    const fallback = await supabase
      .from("contact_messages")
      .select("id, name, email, subject")
      .eq("id", messageId)
      .maybeSingle();
    if (fallback.error) {
      console.error("[messages/reply] load failed", fallback.error);
      throw new Error(fallback.error.message);
    }
    return fallback.data as InboxRow | null;
  }

  if (full.error) {
    console.error("[messages/reply] load failed", full.error);
    throw new Error(full.error.message);
  }

  const row = full.data as InboxRow | null;
  if (!row || row.is_deleted) return null;
  return row;
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
    (isMissingColumnError(error) || /last_reply_/i.test(error.message || ""))
  ) {
    console.warn(
      "[messages/reply] reply metadata columns missing — run APPLY_CONTACT_MESSAGE_REPLIES.sql",
      error.message
    );
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
