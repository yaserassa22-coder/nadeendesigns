/**
 * Admin booking management actions — status sync + customer email presets.
 * Pure helpers; no DB / network.
 */

import type { Booking, BookingStatus } from "../../types";
import { formatDateWestern } from "../utils";

export const BOOKING_ADMIN_ACTIONS = [
  "confirm",
  "reschedule",
  "cancel",
  "complete",
  "reply",
] as const;

export type BookingAdminAction = (typeof BOOKING_ADMIN_ACTIONS)[number];

export const BOOKING_ACTION_STATUS: Record<
  Exclude<BookingAdminAction, "reply">,
  BookingStatus
> = {
  confirm: "confirmed",
  reschedule: "rescheduled",
  cancel: "cancelled",
  complete: "completed",
};

export const BOOKING_ACTION_LABELS_AR: Record<BookingAdminAction, string> = {
  confirm: "تأكيد الحجز",
  reschedule: "طلب موعد آخر",
  cancel: "إلغاء الحجز",
  complete: "تعليم كمكتمل",
  reply: "رد",
};

export type BookingQuickReply = {
  action: BookingAdminAction;
  subject: string;
  body: string;
};

function timeLabel(time: string) {
  return (time || "").slice(0, 5) || "—";
}

function dateLabel(date: string) {
  try {
    return formatDateWestern(date);
  } catch {
    return date || "—";
  }
}

/** Professional quick-reply presets — Admin may edit before send. */
export function buildBookingQuickReply(
  action: BookingAdminAction,
  booking: Pick<Booking, "name" | "date" | "time">,
  location?: string | null
): BookingQuickReply {
  const name = booking.name?.trim() || "عزيزتي";
  const date = dateLabel(booking.date);
  const time = timeLabel(booking.time);
  const place = location?.trim() || "NadEEN Designs";

  switch (action) {
    case "confirm":
      return {
        action,
        subject: "تأكيد الموعد — NadEEN Designs",
        body: [
          `مرحباً ${name}،`,
          ``,
          `تم تأكيد موعدكِ بنجاح.`,
          ``,
          `التاريخ: ${date}`,
          `الوقت: ${time}`,
          `الموقع: ${place}`,
          ``,
          `نتطلع لاستقبالكِ.`,
          ``,
          `مع أطيب التحيات،`,
          `فريق NadEEN Designs`,
        ].join("\n"),
      };
    case "reschedule":
      return {
        action,
        subject: "إعادة جدولة الموعد — NadEEN Designs",
        body: [
          `مرحباً ${name}،`,
          ``,
          `للأسف الموعد المطلوب غير متاح.`,
          ``,
          `يرجى اختيار تاريخ ووقت آخر متاحين.`,
          `سنسعد بمساعدتكِ لترتيب موعد مناسب.`,
          ``,
          `مع أطيب التحيات،`,
          `فريق NadEEN Designs`,
        ].join("\n"),
      };
    case "cancel":
      return {
        action,
        subject: "إلغاء الموعد — NadEEN Designs",
        body: [
          `مرحباً ${name}،`,
          ``,
          `للأسف لم نتمكن من تأكيد موعدكِ.`,
          ``,
          `يرجى التواصل معنا لترتيب وقت آخر يناسبكِ.`,
          ``,
          `مع أطيب التحيات،`,
          `فريق NadEEN Designs`,
        ].join("\n"),
      };
    case "complete":
      return {
        action,
        subject: "شكراً لزيارتكِ — NadEEN Designs",
        body: [
          `مرحباً ${name}،`,
          ``,
          `شكراً لزيارتكِ NadEEN Designs.`,
          `نتطلع لخدمتكِ مجدداً.`,
          ``,
          `مع أطيب التحيات،`,
          `فريق NadEEN Designs`,
        ].join("\n"),
      };
    case "reply":
    default:
      return {
        action: "reply",
        subject: "بخصوص موعدكِ — NadEEN Designs",
        body: [
          `مرحباً ${name}،`,
          ``,
          ``,
          ``,
          `مع أطيب التحيات،`,
          `فريق NadEEN Designs`,
        ].join("\n"),
      };
  }
}

export function resolveStatusForAction(
  action: BookingAdminAction
): BookingStatus | null {
  if (action === "reply") return null;
  return BOOKING_ACTION_STATUS[action];
}

/** Map a customer-facing status change → admin action (for notify presets). */
export function bookingActionForStatus(
  status: BookingStatus | string
): Exclude<BookingAdminAction, "reply"> | null {
  switch (status) {
    case "confirmed":
      return "confirm";
    case "rescheduled":
      return "reschedule";
    case "cancelled":
      return "cancel";
    case "completed":
      return "complete";
    default:
      return null;
  }
}
