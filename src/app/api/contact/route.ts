import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { publicApiError } from "@/lib/api/public-error";
import { onContactSubmitted } from "@/lib/notifications/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isMissingTableError, isMissingColumnError } from "@/lib/supabase/errors";

const contactSchema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب"),
  email: z.string().trim().email("البريد الإلكتروني غير صالح"),
  phone: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  subject: z.string().trim().min(3, "الموضوع مطلوب"),
  message: z.string().trim().min(10, "الرسالة قصيرة جدًا"),
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
      return publicApiError(
        "contact API",
        new Error("Supabase env not configured"),
        "تعذّر حفظ الرسالة حالياً. حاولِ مرة أخرى أو تواصلي عبر واتساب.",
        503
      );
    }

    /**
     * IMPORTANT: createAdminClient falls back to the anon key when
     * SUPABASE_SERVICE_ROLE_KEY is unset. Public RLS allows INSERT only —
     * chaining `.select()` requires SELECT and fails with:
     *   "new row violates row-level security policy for table \"contact_messages\""
     * Do not add public SELECT (privacy). Insert without returning the row.
     */
    const id = crypto.randomUUID();
    const supabase = createAdminClient();
    const baseRow = {
      id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      subject: data.subject,
      message: data.message,
      is_read: false,
    };

    // Prefer writing lifecycle defaults so Admin "active" filters never hide new rows.
    let { error } = await supabase.from("contact_messages").insert({
      ...baseRow,
      is_deleted: false,
      archived_at: null,
    });

    if (
      error &&
      (isMissingColumnError(error) ||
        /is_deleted|archived_at/i.test(error.message || ""))
    ) {
      ({ error } = await supabase.from("contact_messages").insert(baseRow));
    }

    if (error) {
      if (isMissingTableError(error, "contact_messages")) {
        return publicApiError(
          "contact API",
          error,
          "جدول الرسائل غير جاهز. نفّذي supabase/schema.sql في Supabase.",
          503
        );
      }
      return publicApiError(
        "contact API",
        error,
        "تعذّر حفظ الرسالة. حاولِ مرة أخرى."
      );
    }

    revalidatePath("/admin/messages");
    revalidatePath("/admin");

    scheduleNotify(() =>
      onContactSubmitted({
        id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        subject: data.subject,
        message: data.message,
      })
    );

    return NextResponse.json({
      success: true,
      id,
      message: "تم إرسال رسالتكِ بنجاح. سنتواصل معكِ في أقرب وقت.",
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      const message = e.issues[0]?.message ?? "بيانات غير صالحة";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return publicApiError(
      "contact API",
      e,
      "تعذّر إرسال الرسالة. حاولِ مرة أخرى."
    );
  }
}
