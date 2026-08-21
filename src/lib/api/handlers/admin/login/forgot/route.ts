import { NextRequest, NextResponse } from "next/server";
import { sendCustomerAuthLinkEmail } from "@/lib/customer-auth/auth-mail";

/**
 * Unauthenticated staff password recovery.
 * Uses the existing Supabase Auth recovery link + Resend delivery.
 * Does not reveal whether the email belongs to an administrator.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = (body.email || "").trim().toLowerCase();
    if (!email.includes("@")) {
      return NextResponse.json(
        { error: "أدخلي بريداً إلكترونياً صالحاً" },
        { status: 400 }
      );
    }

    const result = await sendCustomerAuthLinkEmail({
      kind: "recovery",
      email,
      next: "/account/reset-password",
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      sent: true,
      message:
        "إذا كان هذا البريد مرتبطاً بحساب، ستصلك رسالة لإعادة تعيين كلمة المرور.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
