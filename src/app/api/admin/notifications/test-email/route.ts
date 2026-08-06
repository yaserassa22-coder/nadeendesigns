import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { canAttemptEmail, getResendFrom } from "@/lib/notifications/config";
import { sendEmail } from "@/lib/notifications/email";
import { getEmailRuntime } from "@/lib/notifications/email-provider";

const bodySchema = z.object({
  to: z.string().trim().email("بريد غير صالح"),
});

function devPayload(extra: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return {};
  return extra;
}

/**
 * POST /api/admin/notifications/test-email
 * Admin-only: test local outbox or Resend connectivity.
 */
export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdminApi("canMutateSettings");
  if (authError) return authError;

  const runtime = await getEmailRuntime(true);
  if (!canAttemptEmail()) {
    return NextResponse.json(
      {
        error:
          "البريد متوقف. من الإشعارات: فعّلي الإرسال واختاري الوضع المحلي أو Resend.",
        configured: false,
        ...devPayload({
          mode: runtime.mode,
          hasKey: Boolean(runtime.apiKey),
          from: runtime.fromEmail || null,
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
  const from = getResendFrom() || runtime.fromEmail;

  const result = await sendEmail({
    to,
    subject: "Nadeen Designs — اختبار البريد",
    html: `
      <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.6;color:#2c2c2c">
        <h1 style="color:#b8860b;font-size:20px">اختبار البريد</h1>
        <p>هذه رسالة اختبار من لوحة إدارة Nadeen Designs.</p>
        <p style="color:#666;font-size:13px">From: ${from || "(local)"} · mode: ${runtime.mode}</p>
      </div>
    `,
    text: `اختبار البريد من Nadeen Designs.\nFrom: ${from || "(local)"}\nmode: ${runtime.mode}`,
    fromName: runtime.fromName || "Nadeen Designs",
    // In Resend mode, fail clearly if API cannot deliver (don't silently local-fallback).
    requireDelivery: runtime.mode === "resend",
  });

  if (!result.ok) {
    console.error("[test-email] failed", result.error);
    return NextResponse.json(
      {
        error: result.error || "فشل إرسال بريد الاختبار",
        configured: true,
        ...devPayload({ from, mode: runtime.mode }),
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    message: result.local
      ? "تم قبول الاختبار في الوضع المحلي (لم يُرسل خارجياً)"
      : "تم إرسال بريد الاختبار بنجاح",
    emailId: result.id ?? null,
    local: Boolean(result.local),
    to,
    from: from || null,
    mode: runtime.mode,
  });
}
