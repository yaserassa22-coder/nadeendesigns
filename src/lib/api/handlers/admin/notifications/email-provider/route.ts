import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import {
  getEmailProviderPublicStatus,
  getEmailProviderSettings,
  mergeEmailProviderSettings,
  saveEmailProviderSettings,
} from "@/lib/notifications/email-provider";

const putSchema = z.object({
  enabled: z.boolean().optional(),
  mode: z.enum(["local", "resend"]).optional(),
  from_email: z.string().trim().max(200).optional(),
  from_name: z.string().trim().max(120).optional(),
  reply_to: z.string().trim().max(200).optional(),
  admin_notification_email: z.string().trim().max(200).optional(),
  /** Omit or empty = keep existing key. Set clear_api_key to remove stored key. */
  resend_api_key: z.string().trim().max(200).optional(),
  clear_api_key: z.boolean().optional(),
});

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  const status = await getEmailProviderPublicStatus(true);
  return NextResponse.json(status);
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAdminApi("canMutateSettings");
  if (error) return error;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح" }, { status: 400 });
  }

  const parsed = putSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  const body = parsed.data;
  const current = await getEmailProviderSettings(true);

  let nextKey = current.resend_api_key;
  if (body.clear_api_key) {
    nextKey = "";
  } else if (body.resend_api_key && body.resend_api_key.length > 0) {
    nextKey = body.resend_api_key;
  }

  if (body.mode === "resend") {
    const from = (body.from_email ?? current.from_email).trim();
    const key = nextKey || process.env.RESEND_API_KEY?.trim() || "";
    if (!key) {
      return NextResponse.json(
        {
          error:
            "وضع Resend يحتاج مفتاح API — الصقيه هنا أو أبقي RESEND_API_KEY في البيئة.",
        },
        { status: 400 }
      );
    }
    if (!from || !from.includes("@")) {
      return NextResponse.json(
        { error: "وضع Resend يحتاج عنوان FROM صالح (من نطاق موثّق بعد الشراء)." },
        { status: 400 }
      );
    }
  }

  const merged = mergeEmailProviderSettings({
    ...current,
    enabled: body.enabled ?? current.enabled,
    mode: body.mode ?? current.mode,
    from_email: body.from_email ?? current.from_email,
    from_name: body.from_name ?? current.from_name,
    reply_to: body.reply_to ?? current.reply_to,
    admin_notification_email:
      body.admin_notification_email ?? current.admin_notification_email,
    resend_api_key: nextKey,
  });

  await saveEmailProviderSettings(merged);
  const status = await getEmailProviderPublicStatus(true);
  return NextResponse.json({
    success: true,
    message: "تم حفظ إعدادات البريد",
    ...status,
  });
}
