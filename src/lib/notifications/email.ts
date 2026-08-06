import { Resend } from "resend";
import {
  getResendFrom,
  isResendConfigured,
} from "@/lib/notifications/config";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  /** Plain-text fallback for clients that prefer text. */
  text?: string;
  replyTo?: string;
  fromName?: string;
}): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  if (!isResendConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[email] Resend not configured — set RESEND_API_KEY and FROM_EMAIL (or RESEND_FROM_EMAIL) in .env.local"
      );
    }
    return {
      ok: false,
      error:
        "Resend غير مُعد. أضيفي RESEND_API_KEY و FROM_EMAIL (أو RESEND_FROM_EMAIL) في .env.local",
    };
  }

  const to = params.to.trim();
  if (!to || !to.includes("@")) {
    return { ok: false, error: "عنوان البريد غير صالح" };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const rawFrom = getResendFrom();
    const from =
      params.fromName && !rawFrom.includes("<")
        ? `${params.fromName} <${rawFrom}>`
        : rawFrom;

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
      ...(params.replyTo ? { replyTo: params.replyTo } : {}),
    });

    if (error) {
      console.error("[email] Resend error", error);
      return { ok: false, error: error.message || "فشل إرسال البريد عبر Resend" };
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("[email] Resend ok", { id: data?.id, to });
    }
    return { ok: true, id: data?.id };
  } catch (e) {
    console.error("[email] unexpected", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "خطأ غير متوقع أثناء إرسال البريد",
    };
  }
}
