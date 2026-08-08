import { Resend } from "resend";
import { getEmailRuntime } from "@/lib/notifications/email-provider";
import {
  pushLocalOutbox,
  shouldUseLocalNotificationOutbox,
} from "@/lib/notifications/local-outbox";

/** Map Resend API errors to actionable Arabic copy. */
function mapResendError(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes("only send testing emails to your own") ||
    m.includes("verify a domain") ||
    (m.includes("resend.dev") && m.includes("own email"))
  ) {
    return (
      "Resend في وضع التجربة: لا يُرسل إلا لبريد حساب Resend. " +
      "من لوحة الإدارة → الإشعارات: ثبّتي نطاقاً وضعي FROM من نطاقك."
    );
  }
  if (m.includes("invalid api key") || m.includes("unauthorized")) {
    return "مفتاح Resend غير صالح — حدّثيه من إعدادات البريد في لوحة الإدارة.";
  }
  if (
    m.includes("from") &&
    (m.includes("invalid") || m.includes("not allowed"))
  ) {
    return "عنوان المرسل غير مسموح من Resend — استخدمي بريداً من نطاق موثّق.";
  }
  return message || "فشل إرسال البريد عبر Resend";
}

export type SendEmailResult =
  | { ok: true; id?: string; local?: boolean }
  | { ok: false; error: string; local?: boolean };

/**
 * Send transactional email via Resend, or accept into local outbox when
 * mode=local / not configured (so messaging works before domain + Resend).
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  fromName?: string;
  /** When true, never use local outbox — fail if Resend cannot send. */
  requireDelivery?: boolean;
}): Promise<SendEmailResult> {
  const runtime = await getEmailRuntime();
  const to = params.to.trim();
  if (!to || !to.includes("@")) {
    return { ok: false, error: "عنوان البريد غير صالح" };
  }

  if (!runtime.enabled) {
    // Local/dev: still capture so appointment confirm can be tested
    if (shouldUseLocalNotificationOutbox() && !params.requireDelivery) {
      const row = pushLocalOutbox({
        channel: "email",
        to,
        subject: params.subject,
        body: params.text || params.subject,
        html: params.html,
        meta: { reason: "email_disabled_local_capture" },
      });
      console.info("[email] local outbox (provider disabled)", {
        id: row.id,
        to,
        subject: params.subject,
      });
      return { ok: true, id: row.id, local: true };
    }
    return {
      ok: false,
      error: "إرسال البريد متوقف من إعدادات الإدارة",
    };
  }

  const useLocal =
    runtime.mode === "local" ||
    !runtime.apiKey ||
    !runtime.fromEmail ||
    // Sandbox Resend only reaches the Resend account inbox — capture locally in dev
    (shouldUseLocalNotificationOutbox() &&
      runtime.fromIsSandbox &&
      !params.requireDelivery);

  if (useLocal) {
    if (params.requireDelivery) {
      return {
        ok: false,
        error:
          "البريد غير جاهز للإرسال الخارجي. من الإشعارات: وصّلي Resend بوضع Resend + FROM من نطاق موثّق.",
      };
    }
    const row = pushLocalOutbox({
      channel: "email",
      to,
      subject: params.subject,
      body: params.text || params.subject,
      html: params.html,
      meta: { from: runtime.fromEmail || null, mode: runtime.mode },
    });
    console.info("[email] local outbox (not sent externally)", {
      to,
      subject: params.subject,
      id: row.id,
      from: runtime.fromEmail || "(none)",
    });
    return { ok: true, id: row.id, local: true };
  }

  try {
    const resend = new Resend(runtime.apiKey);
    const rawFrom = runtime.fromEmail;
    const fromName = params.fromName || runtime.fromName;
    const from =
      fromName && !rawFrom.includes("<")
        ? `${fromName} <${rawFrom}>`
        : rawFrom;
    const replyTo = params.replyTo || runtime.replyTo || undefined;

    if (process.env.NODE_ENV !== "production") {
      console.info("[email] sending via Resend", {
        to,
        from,
        subject: params.subject,
      });
    }

    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject: params.subject,
      html: params.html,
      ...(params.text ? { text: params.text } : {}),
      ...(replyTo ? { replyTo } : {}),
    });

    if (error) {
      console.error("[email] Resend error", error);
      const mapped = mapResendError(
        error.message || "فشل إرسال البريد عبر Resend"
      );
      // Dev / pre-domain: keep appointment flow testable when Resend rejects
      if (shouldUseLocalNotificationOutbox() && !params.requireDelivery) {
        const row = pushLocalOutbox({
          channel: "email",
          to,
          subject: params.subject,
          body: params.text || params.subject,
          html: params.html,
          meta: {
            reason: "resend_failed_local_fallback",
            resend_error: mapped,
          },
        });
        console.info("[email] local outbox (Resend failed)", {
          id: row.id,
          to,
          error: mapped,
        });
        return { ok: true, id: row.id, local: true };
      }
      return { ok: false, error: mapped };
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("[email] Resend ok", { id: data?.id, to });
    }
    return { ok: true, id: data?.id };
  } catch (e) {
    console.error("[email] unexpected", e);
    const message =
      e instanceof Error ? e.message : "خطأ غير متوقع أثناء إرسال البريد";
    if (shouldUseLocalNotificationOutbox() && !params.requireDelivery) {
      const row = pushLocalOutbox({
        channel: "email",
        to,
        subject: params.subject,
        body: params.text || params.subject,
        html: params.html,
        meta: { reason: "resend_exception_local_fallback", error: message },
      });
      return { ok: true, id: row.id, local: true };
    }
    return { ok: false, error: message };
  }
}
