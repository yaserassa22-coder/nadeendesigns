import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import {
  getResendFrom,
  isResendConfigured,
} from "@/lib/notifications/config";
import { sendEmail } from "@/lib/notifications/email";

const bodySchema = z.object({
  to: z.string().trim().email("بريد غير صالح"),
});

function devPayload(extra: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return {};
  return extra;
}

/**
 * POST /api/admin/notifications/test-email
 * Admin-only: send a one-off Resend connectivity test.
 */
export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdminApi("canMutateSettings");
  if (authError) return authError;

  if (!isResendConfigured()) {
    return NextResponse.json(
      {
        error:
          "خدمة البريد غير مُعدّة. أضيفي RESEND_API_KEY و FROM_EMAIL (أو RESEND_FROM_EMAIL) في .env.local ثم أعيدي تشغيل next dev.",
        configured: false,
        ...devPayload({
          hasKey: Boolean(process.env.RESEND_API_KEY?.trim()),
          from: getResendFrom() || null,
        }),
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  const { to } = parsed.data;
  const from = getResendFrom();

  const result = await sendEmail({
    to,
    subject: "Nadeen Designs — اختبار Resend",
    html: `
      <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.6;color:#2c2c2c">
        <h1 style="color:#b8860b;font-size:20px">تم إرسال البريد بنجاح</h1>
        <p>هذه رسالة اختبار من لوحة إدارة Nadeen Designs عبر Resend.</p>
        <p style="color:#666;font-size:13px">From: ${from}</p>
      </div>
    `,
    text: `تم إرسال البريد بنجاح — اختبار Resend من Nadeen Designs.\nFrom: ${from}`,
    fromName: "Nadeen Designs",
  });

  if (!result.ok) {
    console.error("[test-email] Resend failed", result.error);
    return NextResponse.json(
      {
        error: result.error || "فشل إرسال بريد الاختبار",
        configured: true,
        ...devPayload({ from }),
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "تم إرسال بريد الاختبار بنجاح",
    emailId: result.id ?? null,
    to,
    from,
  });
}
