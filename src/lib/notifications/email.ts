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
    return {
      ok: false,
      error:
        "Resend غير مُعد. أضيفي RESEND_API_KEY و RESEND_FROM_EMAIL (أو FROM_EMAIL) في .env.local",
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

    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject: params.subject,
      html: params.html,
      ...(params.text ? { text: params.text } : {}),
      ...(params.replyTo ? { replyTo: params.replyTo } : {}),
    });

    if (error) {
      return { ok: false, error: error.message || "فشل إرسال البريد عبر Resend" };
    }
    return { ok: true, id: data?.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "خطأ غير متوقع أثناء إرسال البريد",
    };
  }
}
