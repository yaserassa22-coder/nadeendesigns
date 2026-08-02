import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const bookingSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(9),
  email: z.string().email().nullable().optional(),
  date: z.string(),
  time: z.string(),
  service_type: z.enum(["fitting", "consultation", "rental", "purchase"]),
  dress_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const pendingBookings: z.infer<typeof bookingSchema>[] = [];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = bookingSchema.parse(body);

    if (isSupabaseConfigured()) {
      const supabase = createAdminClient();
      const { error } = await supabase.from("bookings").insert({
        ...data,
        status: "pending",
      });
      if (error) throw error;
    } else {
      pendingBookings.push(data);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Validation error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(pendingBookings);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json();
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true });
    }
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
