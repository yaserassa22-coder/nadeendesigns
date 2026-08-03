import { NextResponse, after } from "next/server";
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
import { onBookingSubmitted } from "@/lib/notifications/service";
import type {
  AppointmentLifecycleAction,
  Booking,
  BookingStatus,
  DeliveryStatus,
} from "@/types";
import { assertNoConflict } from "@/lib/admin/appointment-conflicts";
import { loadAppointmentSettings } from "@/lib/admin/appointment-slots";
import { canForceAppointmentOverride } from "@/lib/admin/permissions";
import { getAdminActorRole } from "@/lib/admin/reports-data";
import { writeAuditLog } from "@/lib/admin/audit";
import { notifyFirstWaitingCustomer } from "@/lib/admin/waiting-list-notify";

type BookingRow = ReturnType<typeof buildInsertPayload> & { id?: string };

const pendingBookings: BookingRow[] = [];

function scheduleBookingNotifications(task: () => Promise<void>) {
  try {
    after(async () => {
      try {
        await task();
      } catch (e) {
        console.error("[bookings API] notification task failed", e);
      }
    });
  } catch {
    void task().catch((e) =>
      console.error("[bookings API] notification task failed", e)
    );
  }
}

/** Essential booking columns — matches simplified form + Phase D fields */
function buildInsertPayload(
  data: BookingCreateInput,
  defaults: {
    buffer_before: number;
    buffer_after: number;
    duration_minutes: number;
  }
) {
  return {
    name: data.name,
    phone: data.phone,
    email: data.email?.trim() ? data.email.trim() : null,
    date: data.date,
    time: data.time,
    service_type: data.service_type,
    notes: data.notes ?? null,
    status: "pending" as const,
    notify_whatsapp: data.notify_whatsapp ?? true,
    notify_email: data.notify_email ?? true,
    booking_source: data.booking_source ?? "online",
    consultant_id: data.consultant_id ?? null,
    duration_minutes: data.duration_minutes ?? defaults.duration_minutes,
    buffer_before: data.buffer_before ?? defaults.buffer_before,
    buffer_after: data.buffer_after ?? defaults.buffer_after,
    is_vip: data.is_vip ?? false,
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

function lifecycleUpdates(
  action: AppointmentLifecycleAction
): Record<string, unknown> {
  const now = new Date().toISOString();
  switch (action) {
    case "arrived":
      return { arrived_at: now, status: "confirmed" };
    case "started":
      return { started_at: now, status: "confirmed" };
    case "completed":
      return { completed_at: now, status: "completed" };
    case "no_show":
      return { no_show_at: now, status: "cancelled" };
    default:
      return {};
  }
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

  const force = Boolean(parsed.data.force);
  let actorRole: string | null = "admin";
  let actorId: string | null = null;
  let actorEmail: string | null = null;

  // Manual/admin sources require auth; force requires owner
  const source = parsed.data.booking_source ?? "online";
  if (source !== "online" || force) {
    const { user, error: authError } = await requireAdminApi();
    if (authError) return authError;
    actorId = user!.id;
    actorEmail = user!.email ?? null;
    actorRole = await getAdminActorRole(user!.id);
  }

  try {
    const bookingId = crypto.randomUUID();
    if (isSupabaseConfigured()) {
      const supabase = createAdminClient();
      const settings = await loadAppointmentSettings(supabase);
      const row = buildInsertPayload(parsed.data, {
        buffer_before: settings.default_buffer_before,
        buffer_after: settings.default_buffer_after,
        duration_minutes: settings.duration_presets.consultation,
      });

      const conflict = await assertNoConflict(
        supabase,
        {
          date: row.date,
          time: row.time,
          duration_minutes: row.duration_minutes,
          buffer_before: row.buffer_before,
          buffer_after: row.buffer_after,
          consultant_id: row.consultant_id,
        },
        {
          force,
          isOwner: canForceAppointmentOverride({
            id: actorId ?? "",
            role: actorRole,
          }),
        }
      );

      if (!conflict.ok) {
        if (conflict.conflict) {
          return NextResponse.json(
            {
              error: conflict.message,
              message: conflict.message,
              field: "time",
              conflict: true,
              conflictingId: conflict.conflictingId,
            },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: conflict.message, message: conflict.message },
          { status: conflict.status }
        );
      }

      const insertFull = { id: bookingId, ...row };
      let { error } = await supabase.from("bookings").insert(insertFull);

      if (
        error &&
        /notify_|booking_source|consultant_id|duration_minutes|buffer_|is_vip|column .* does not exist/i.test(
          getErrorMessage(error)
        )
      ) {
        console.warn(
          "[bookings API] smart columns missing — inserting core fields. Run APPLY_SMART_APPOINTMENTS.sql"
        );
        const core = {
          name: row.name,
          phone: row.phone,
          email: row.email,
          date: row.date,
          time: row.time,
          service_type: row.service_type,
          notes: row.notes,
          status: row.status,
        };
        const retry = await supabase
          .from("bookings")
          .insert({ id: bookingId, ...core });
        error = retry.error;
      }

      if (error) {
        console.error("[bookings API] supabase insert failed", error);
        return NextResponse.json(supabaseErrorPayload(error), { status: 400 });
      }

      if (force && actorId) {
        await writeAuditLog(supabase, {
          module: "bookings",
          recordId: bookingId,
          action: "force_override",
          actorId,
          actorEmail,
          meta: {
            date: row.date,
            time: row.time,
            consultant_id: row.consultant_id,
          },
        });
      }
    } else {
      const row = buildInsertPayload(parsed.data, {
        buffer_before: 0,
        buffer_after: 15,
        duration_minutes: 60,
      });
      pendingBookings.push({ ...row, id: bookingId });
      console.info("[bookings API] saved to memory (Supabase not configured)");
    }

    const bookingForNotify: Booking = {
      id: bookingId,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email?.trim() ? parsed.data.email.trim() : null,
      date: parsed.data.date,
      time: parsed.data.time,
      service_type: parsed.data.service_type as Booking["service_type"],
      dress_id: null,
      notes: parsed.data.notes ?? null,
      status: "pending",
      delivery_required: false,
      delivery_address: null,
      created_at: new Date().toISOString(),
      notify_whatsapp: parsed.data.notify_whatsapp,
      notify_email: parsed.data.notify_email,
    };
    scheduleBookingNotifications(() => onBookingSubmitted(bookingForNotify));

    return NextResponse.json(
      {
        success: true,
        message: "تم إرسال طلب الحجز بنجاح",
        id: bookingId,
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
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;

  try {
    const body = await request.json();
    const {
      id,
      status,
      delivery_status,
      date,
      time,
      consultant_id,
      duration_minutes,
      buffer_before,
      buffer_after,
      booking_source,
      is_vip,
      lifecycle_action,
      force,
      notes,
      name,
      phone,
      email,
      service_type,
    } = body as {
      id?: string;
      status?: BookingStatus;
      delivery_status?: DeliveryStatus | null;
      date?: string;
      time?: string;
      consultant_id?: string | null;
      duration_minutes?: number;
      buffer_before?: number;
      buffer_after?: number;
      booking_source?: string;
      is_vip?: boolean;
      lifecycle_action?: AppointmentLifecycleAction;
      force?: boolean;
      notes?: string | null;
      name?: string;
      phone?: string;
      email?: string | null;
      service_type?: string;
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
    if (date) updates.date = date;
    if (time) updates.time = time.length === 5 ? `${time}:00` : time;
    if (consultant_id !== undefined) updates.consultant_id = consultant_id;
    if (duration_minutes !== undefined)
      updates.duration_minutes = duration_minutes;
    if (buffer_before !== undefined) updates.buffer_before = buffer_before;
    if (buffer_after !== undefined) updates.buffer_after = buffer_after;
    if (booking_source !== undefined) updates.booking_source = booking_source;
    if (is_vip !== undefined) updates.is_vip = is_vip;
    if (notes !== undefined) updates.notes = notes;
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (service_type !== undefined) updates.service_type = service_type;

    if (lifecycle_action) {
      Object.assign(updates, lifecycleUpdates(lifecycle_action));
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
    const role = await getAdminActorRole(user!.id);

    // Conflict check when rescheduling
    const needsConflictCheck =
      date !== undefined ||
      time !== undefined ||
      consultant_id !== undefined ||
      duration_minutes !== undefined ||
      buffer_before !== undefined ||
      buffer_after !== undefined;

    if (needsConflictCheck) {
      const { data: existing } = await supabase
        .from("bookings")
        .select(
          "id, date, time, duration_minutes, buffer_before, buffer_after, consultant_id, status"
        )
        .eq("id", id)
        .maybeSingle();

      if (existing) {
        const conflict = await assertNoConflict(
          supabase,
          {
            date: (updates.date as string) || existing.date,
            time: (updates.time as string) || existing.time,
            duration_minutes:
              (updates.duration_minutes as number | undefined) ??
              existing.duration_minutes,
            buffer_before:
              (updates.buffer_before as number | undefined) ??
              existing.buffer_before,
            buffer_after:
              (updates.buffer_after as number | undefined) ??
              existing.buffer_after,
            consultant_id:
              updates.consultant_id !== undefined
                ? (updates.consultant_id as string | null)
                : existing.consultant_id,
            exclude_id: id,
          },
          {
            force: Boolean(force),
            isOwner: canForceAppointmentOverride({
              id: user!.id,
              role,
            }),
          }
        );

        if (!conflict.ok) {
          if (conflict.conflict) {
            return NextResponse.json(
              {
                error: conflict.message,
                message: conflict.message,
                conflict: true,
                conflictingId: conflict.conflictingId,
              },
              { status: 409 }
            );
          }
          return NextResponse.json(
            { error: conflict.message, message: conflict.message },
            { status: conflict.status }
          );
        }

        if (force) {
          await writeAuditLog(supabase, {
            module: "bookings",
            recordId: id,
            action: "force_override",
            actorId: user!.id,
            actorEmail: user!.email,
            meta: { updates },
          });
        }
      }
    }

    const { error } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", id);
    if (error) throw error;

    if (lifecycle_action) {
      await writeAuditLog(supabase, {
        module: "bookings",
        recordId: id,
        action: "appointment_status",
        actorId: user!.id,
        actorEmail: user!.email,
        meta: { lifecycle_action, updates },
      });
    }

    // On cancel / no-show — notify waiting list (best effort)
    if (status === "cancelled" || lifecycle_action === "no_show") {
      const { data: row } = await supabase
        .from("bookings")
        .select("date, consultant_id")
        .eq("id", id)
        .maybeSingle();
      if (row) {
        scheduleBookingNotifications(async () => {
          await notifyFirstWaitingCustomer(supabase, {
            preferredDate: row.date,
            consultantId: row.consultant_id,
          });
        });
      }
    }

    return NextResponse.json({ success: true, updates });
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
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;

  const { handleModuleDelete } = await import("@/lib/admin/soft-delete-api");
  return handleModuleDelete({
    request,
    module: "bookings",
    actor: { id: user!.id, email: user!.email },
    missingIdMessage: "معرّف الحجز مطلوب",
  });
}
