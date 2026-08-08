/**
 * Before admin soft-deletes a booking: mark cancelled + notify customer
 * so Account → Appointments updates and email/WhatsApp/local outbox fire.
 */

import { buildBookingQuickReply } from "@/lib/bookings/status-actions";
import { notifyBookingAdminAction } from "@/lib/notifications/service";
import { isMissingColumnError } from "@/lib/supabase/errors";
import type { Booking } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type BookingNotifyRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  date: string;
  time: string;
  service_type: string;
  status: string;
  notify_email?: boolean | null;
  notify_whatsapp?: boolean | null;
  customer_id?: string | null;
  is_deleted?: boolean | null;
};

export async function prepareBookingSoftDelete(
  supabase: SupabaseClient,
  bookingId: string
): Promise<{ notified: boolean; warning?: string }> {
  let { data: row, error } = await supabase
    .from("bookings")
    .select(
      "id, name, phone, email, date, time, service_type, status, notify_email, notify_whatsapp, customer_id, is_deleted"
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (
    error &&
    (isMissingColumnError(error) ||
      /notify_|customer_id|is_deleted/i.test(error.message || ""))
  ) {
    const fallback = await supabase
      .from("bookings")
      .select("id, name, phone, email, date, time, service_type, status")
      .eq("id", bookingId)
      .maybeSingle();
    row = fallback.data as typeof row;
    error = fallback.error;
  }

  if (error || !row) {
    return { notified: false, warning: "تعذّر تحميل الحجز قبل الحذف" };
  }

  const booking = row as BookingNotifyRow;
  if (booking.is_deleted) {
    return { notified: false };
  }

  const alreadyCancelled = booking.status === "cancelled";

  if (!alreadyCancelled) {
    const { error: statusError } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (statusError) {
      console.warn(
        "[booking soft-delete] status cancel failed",
        statusError.message
      );
    }
  }

  if (alreadyCancelled) {
    return { notified: false };
  }

  const forNotify = {
    id: String(booking.id),
    name: String(booking.name || ""),
    phone: String(booking.phone || ""),
    email: booking.email ?? null,
    date: String(booking.date || ""),
    time: String(booking.time || ""),
    service_type: (booking.service_type ||
      "wedding_dress") as Booking["service_type"],
    notify_email: booking.notify_email ?? undefined,
    notify_whatsapp: booking.notify_whatsapp ?? undefined,
    customer_id: booking.customer_id ?? null,
  };

  const preset = buildBookingQuickReply("cancel", forNotify);
  const notify = await notifyBookingAdminAction({
    booking: forNotify,
    action: "cancel",
    nextStatus: "cancelled",
    subject: preset.subject,
    body: [
      preset.body,
      "",
      "(تم إلغاء الموعد من إدارة البوتيك)",
    ].join("\n"),
    wantEmail: true,
  });

  return {
    notified: notify.customerNotified,
    warning:
      notify.email.local || notify.whatsapp.local
        ? "أُلغي الموعد — الإشعار في الصندوق المحلي"
        : undefined,
  };
}
