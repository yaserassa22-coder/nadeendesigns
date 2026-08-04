import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isMissingTableError } from "@/lib/supabase/errors";
import { hashOtpCode, safeEqualHash, toE164 } from "@/lib/customer-auth/otp";
import {
  establishPhoneSession,
  getCustomerByAuthUserId,
  recordCustomerSession,
  recordLoginHistory,
} from "@/lib/customer-auth/customer";
import { getCustomerAuthSettings } from "@/lib/customer-auth/settings";

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "خدمة المصادقة غير مُعدّة" },
        { status: 503 }
      );
    }

    const settings = await getCustomerAuthSettings();
    const body = (await request.json().catch(() => ({}))) as {
      request_id?: string;
      dial?: string;
      phone?: string;
      code?: string;
      remember?: boolean;
      full_name?: string;
    };

    const code = (body.code || "").replace(/\D/g, "");
    if (code.length !== 6) {
      return NextResponse.json(
        { error: "أدخلي رمزًا مكوّنًا من 6 أرقام" },
        { status: 400 }
      );
    }

    const dial = (body.dial || "+972").trim();
    const e164 = toE164(dial, body.phone || "");
    if (!e164) {
      return NextResponse.json(
        { error: "رقم الهاتف غير صالح" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = request.headers.get("user-agent");

    let query = supabase
      .from("otp_requests")
      .select("*")
      .eq("destination", e164)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (body.request_id) {
      query = supabase
        .from("otp_requests")
        .select("*")
        .eq("id", body.request_id)
        .limit(1);
    }

    const { data: rows, error } = await query;
    if (error && isMissingTableError(error, "otp_requests")) {
      return NextResponse.json(
        { error: "جداول OTP غير موجودة. طبّقي ترحيل 028." },
        { status: 503 }
      );
    }

    const otp = rows?.[0];
    if (!otp) {
      return NextResponse.json(
        { error: "لا يوجد رمز نشط. اطلبي رمزًا جديدًا." },
        { status: 400 }
      );
    }

    if (otp.consumed_at) {
      return NextResponse.json(
        { error: "تم استخدام هذا الرمز مسبقًا" },
        { status: 400 }
      );
    }

    if (new Date(otp.expires_at as string).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "انتهت صلاحية الرمز. اطلبي رمزًا جديدًا." },
        { status: 400 }
      );
    }

    const attempts = Number(otp.attempts) || 0;
    const maxAttempts =
      Number(otp.max_attempts) || settings.otp_max_attempts;
    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: "تم تجاوز عدد المحاولات. اطلبي رمزًا جديدًا." },
        { status: 429 }
      );
    }

    const ok = safeEqualHash(
      hashOtpCode(code),
      String(otp.code_hash)
    );

    if (!ok) {
      await supabase
        .from("otp_requests")
        .update({ attempts: attempts + 1 })
        .eq("id", otp.id);

      await recordLoginHistory({
        method: "otp",
        success: false,
        ip,
        userAgent: ua,
        meta: { destination: e164, reason: "bad_code" },
      });

      return NextResponse.json(
        {
          error: "رمز غير صحيح",
          attempts_left: Math.max(0, maxAttempts - attempts - 1),
        },
        { status: 401 }
      );
    }

    await supabase
      .from("otp_requests")
      .update({
        consumed_at: new Date().toISOString(),
        attempts: attempts + 1,
      })
      .eq("id", otp.id);

    const session = await establishPhoneSession({
      e164,
      fullName: body.full_name,
    });

    if (!session.ok) {
      return NextResponse.json({ error: session.error }, { status: 500 });
    }

    const customer = await getCustomerByAuthUserId(session.userId);
    if (customer) {
      await recordLoginHistory({
        customerId: customer.id,
        authUserId: session.userId,
        method: "otp",
        success: true,
        ip,
        userAgent: ua,
      });
      await recordCustomerSession({
        customerId: customer.id,
        authUserId: session.userId,
        remember: body.remember,
        ip,
        userAgent: ua,
      });
    }

    return NextResponse.json({
      ok: true,
      customer: customer
        ? {
            id: customer.id,
            full_name: customer.full_name,
            phone: customer.phone,
            email: customer.email,
          }
        : null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
