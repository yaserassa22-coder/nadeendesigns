import { after } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isMissingTableError } from "@/lib/supabase/errors";
import { onWaitlistJoined } from "@/lib/notifications/service";

const schema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب"),
  phone: z
    .string()
    .trim()
    .min(9, "رقم الهاتف غير صالح")
    .regex(/^[\d+\s()-]+$/, "رقم الهاتف غير صالح"),
  email: z
    .string()
    .trim()
    .email("البريد غير صالح")
    .optional()
    .nullable()
    .or(z.literal("")),
  preferred_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  preferred_time: z.string().optional().nullable(),
  consultant_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  notify_whatsapp: z.boolean().optional().default(true),
  notify_email: z.boolean().optional().default(true),
});

/** Public: join waiting list when slot unavailable. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "بيانات غير صالحة";
    return NextResponse.json({ error: msg, message: msg }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "قاعدة البيانات غير مُعدّة" },
      { status: 503 }
    );
  }

  const d = parsed.data;
  const supabase = createAdminClient();
  // Anon fallback has INSERT-only RLS — never chain .select() (needs SELECT).
  const id = crypto.randomUUID();
  const { error } = await supabase.from("waiting_list").insert({
    id,
    name: d.name,
    phone: d.phone,
    email: d.email?.trim() ? d.email.trim() : null,
    preferred_date: d.preferred_date || null,
    preferred_time: d.preferred_time || null,
    consultant_id: d.consultant_id || null,
    notes: d.notes?.trim() || null,
    status: "waiting",
    notify_whatsapp: d.notify_whatsapp ?? true,
    notify_email: d.notify_email ?? true,
  });

  if (error) {
    if (isMissingTableError(error, "waiting_list")) {
      return NextResponse.json(
        {
          error:
            "قائمة الانتظار غير مفعّلة. نفّذي supabase/APPLY_SMART_APPOINTMENTS.sql",
          ...(process.env.NODE_ENV !== "production"
            ? { detail: error.message, code: error.code }
            : {}),
        },
        { status: 503 }
      );
    }
    console.error("[waiting-list API] insert failed", error);
    return NextResponse.json(
      {
        error: error.message || "تعذّر الانضمام لقائمة الانتظار",
        ...(process.env.NODE_ENV !== "production"
          ? { detail: error.message, code: error.code }
          : {}),
      },
      { status: 400 }
    );
  }
  try {
    after(() =>
      onWaitlistJoined({
        id,
        name: d.name,
        phone: d.phone,
        email: d.email?.trim() ? d.email.trim() : null,
        preferred_date: d.preferred_date || null,
        preferred_time: d.preferred_time || null,
      })
    );
  } catch {
    void onWaitlistJoined({
      id,
      name: d.name,
      phone: d.phone,
      email: d.email?.trim() ? d.email.trim() : null,
      preferred_date: d.preferred_date || null,
      preferred_time: d.preferred_time || null,
    });
  }

  return NextResponse.json(
    {
      success: true,
      message: "تم إضافتكِ إلى قائمة الانتظار. سنتواصل عند توفّر موعد.",
      id,
    },
    { status: 201 }
  );
}
