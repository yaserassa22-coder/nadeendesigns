import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getErrorCode,
  getErrorMessage,
  isMissingColumnError,
} from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import {
  bookingCreateSchema,
  deliveryStatusSchema,
  formatZodBookingErrors,
  normalizeBookingRequestBody,
  type BookingCreateInput,
} from "@/lib/validations/booking";
import type { BookingStatus, DeliveryStatus } from "@/types";

type BookingRow = ReturnType<typeof buildInsertPayload>;

const pendingBookings: BookingRow[] = [];

/** Essential booking columns only — matches simplified form */
function buildInsertPayload(data: BookingCreateInput) {
  return {
    name: data.name,
    phone: data.phone,
    email: data.email,
    date: data.date,
    time: data.time,
    service_type: data.service_type,
    notes: data.notes ?? null,
    status: "pending" as const,
  };
}

function supabaseErrorPayload(error: unknown) {
  const message = getErrorMessage(error) || "فشل حفظ الحجز";
  const code = getErrorCode(error);

  if (isMissingColumnError(error) || /Could not find the .*column/i.test(message)) {
    return {
      error: "خطأ في أعمدة جدول الحجوزات. راجعي إعدادات Supabase.",
      field: "form",
      message: "خطأ في أعمدة جدول الحجوزات. راجعي إعدادات Supabase.",
      code,
      details: message,
    };
  }

  if (/service_type|check constraint/i.test(message)) {
    return {
      error: "نوع الخدمة غير مسموح في قاعدة البيانات",
      field: "service_type",
      message: "نوع الخدمة غير مسموح في قاعدة البيانات",
      code,
      details: message,
    };
  }

  return {
    error: message,
    field: "form",
    message,
    code,
    details: message,
  };
}

export async function POST(request: Request) {
  let rawBody: unknown = null;

  try {
    rawBody = await request.json();
  } catch {
    console.error("[bookings API] invalid JSON body");
    return NextResponse.json(
      {
        error: "جسم الطلب غير صالح (JSON)",
        field: "form",
        message: "جسم الطلب غير صالح (JSON)",
      },
      { status: 400 }
    );
  }

  console.info("[bookings API] incoming body", JSON.stringify(rawBody, null, 2));

  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return NextResponse.json(
      {
        error: "بيانات الحجز مطلوبة",
        field: "form",
        message: "بيانات الحجز مطلوبة",
      },
      { status: 400 }
    );
  }

  const normalized = normalizeBookingRequestBody(
    rawBody as Record<string, unknown>
  );
  console.info(
    "[bookings API] normalized body",
    JSON.stringify(normalized, null, 2)
  );

  const parsed = bookingCreateSchema.safeParse(normalized);
  if (!parsed.success) {
    const formatted = formatZodBookingErrors(parsed.error);
    console.error("[bookings API] validation failed", formatted);
    return NextResponse.json(formatted, { status: 400 });
  }

  const row = buildInsertPayload(parsed.data);
  console.info("[bookings API] insert payload", JSON.stringify(row, null, 2));

  try {
    if (isSupabaseConfigured()) {
      const supabase = createAdminClient();
      const { error } = await supabase.from("bookings").insert(row);

      if (error) {
        console.error("[bookings API] supabase insert failed", error);
        return NextResponse.json(supabaseErrorPayload(error), { status: 400 });
      }
    } else {
      pendingBookings.push(row);
      console.info("[bookings API] saved to memory (Supabase not configured)");
    }

    return NextResponse.json(
      {
        success: true,
        message: "تم إرسال طلب الحجز بنجاح",
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(formatZodBookingErrors(e), { status: 400 });
    }
    console.error("[bookings API] unexpected error", e);
    return NextResponse.json(supabaseErrorPayload(e), { status: 400 });
  }
}

export async function GET() {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(pendingBookings);
  }

  try {
    // Privileged: service role bypasses RLS, else authenticated admin session
    const supabase = await createPrivilegedClient();
    const { data, error, count } = await supabase
      .from("bookings")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[bookings API GET]", error);
      return NextResponse.json(
        {
          error: error.message,
          message: error.message,
          details: error.details ?? null,
          hint: error.hint ?? null,
          code: error.code ?? null,
        },
        { status: 500 }
      );
    }

    console.info("[bookings API GET] rows", count ?? data?.length ?? 0);
    return NextResponse.json(data ?? [], {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "فشل جلب الحجوزات";
    console.error("[bookings API GET] unexpected", e);
    return NextResponse.json({ error: message, message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, status, delivery_status } = body as {
      id?: string;
      status?: BookingStatus;
      delivery_status?: DeliveryStatus | null;
    };

    if (!id) {
      return NextResponse.json(
        {
          error: "معرّف الحجز مطلوب",
          field: "id",
          message: "معرّف الحجز مطلوب",
        },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (delivery_status !== undefined) {
      if (delivery_status !== null) {
        deliveryStatusSchema.parse(delivery_status);
      }
      updates.delivery_status = delivery_status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          error: "لا يوجد شيء للتحديث",
          field: "form",
          message: "لا يوجد شيء للتحديث",
        },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true });
    }

    const supabase = await createPrivilegedClient();
    const { error } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "حالة توصيل غير صالحة",
          field: "delivery_status",
          message: "حالة توصيل غير صالحة",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(supabaseErrorPayload(e), { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      {
        error: "معرّف الحجز مطلوب",
        field: "id",
        message: "معرّف الحجز مطلوب",
      },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true });
  }

  const supabase = await createPrivilegedClient();
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
