import { after } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { onContactSubmitted } from "@/lib/notifications/service";

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  subject: z.string().min(3),
  message: z.string().min(10),
});

function scheduleNotify(task: () => Promise<void>) {
  try {
    after(async () => {
      try {
        await task();
      } catch (e) {
        console.error("[contact API] notification task failed", e);
      }
    });
  } catch {
    void task().catch((e) =>
      console.error("[contact API] notification task failed", e)
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = contactSchema.parse(body);

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error:
            "تعذّر حفظ الرسالة حالياً. حاولِ مرة أخرى أو تواصلي عبر واتساب.",
        },
        { status: 503 }
      );
    }

    const supabase = createAdminClient();
    const { data: row, error } = await supabase
      .from("contact_messages")
      .insert({
        ...data,
        is_read: false,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[contact API] insert failed", error);
      return NextResponse.json(
        { error: "تعذّر حفظ الرسالة. حاولِ مرة أخرى." },
        { status: 500 }
      );
    }

    const id = row?.id ?? crypto.randomUUID();
    scheduleNotify(() =>
      onContactSubmitted({
        id,
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        subject: data.subject,
        message: data.message,
      })
    );

    return NextResponse.json({ success: true, id });
  } catch (e) {
    if (e instanceof z.ZodError) {
      const message = e.issues[0]?.message ?? "بيانات غير صالحة";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "حدث خطأ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
