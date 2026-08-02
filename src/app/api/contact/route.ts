import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  subject: z.string().min(3),
  message: z.string().min(10),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = contactSchema.parse(body);

    if (isSupabaseConfigured()) {
      const supabase = createAdminClient();
      const { error } = await supabase.from("contact_messages").insert({
        ...data,
        is_read: false,
      });
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Validation error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
