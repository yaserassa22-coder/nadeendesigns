import { z } from "zod";

export const BOOKING_SERVICE_TYPES = [
  "wedding_dress",
  "rental_dress",
  "custom_design",
  "nouf_dresses",
  "veil",
  "bridal_cape",
  // legacy (DB still allows)
  "nouf_dress",
  "fitting",
  "consultation",
  "rental",
  "purchase",
] as const;

export const bookingServiceTypeSchema = z.enum(BOOKING_SERVICE_TYPES, {
  message: "نوع الخدمة غير صالح",
});

export const deliveryStatusSchema = z.enum(
  ["pending", "preparing", "out_for_delivery", "delivered"],
  { message: "حالة توصيل غير صالحة" }
);

/** Normalize client aliases → canonical DB fields before Zod parse */
export function normalizeBookingRequestBody(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const body = { ...raw };

  if (body.full_name != null && body.name == null) body.name = body.full_name;
  if (body.service != null && body.service_type == null)
    body.service_type = body.service;
  if (body.booking_date != null && body.date == null)
    body.date = body.booking_date;
  if (body.booking_time != null && body.time == null)
    body.time = body.booking_time;

  if (typeof body.email === "string") body.email = body.email.trim();
  if (typeof body.phone === "string") body.phone = body.phone.trim();
  if (typeof body.name === "string") body.name = body.name.trim();

  // Strip removed fields so they never reach insert
  delete body.dress_id;
  delete body.city;
  delete body.region;
  delete body.delivery_required;
  delete body.delivery_address;
  delete body.delivery_region;
  delete body.delivery_city;
  delete body.delivery_phone;
  delete body.personalization;
  delete body.gift_options;

  return body;
}

export const bookingCreateSchema = z.object({
  name: z
    .string({ message: "الاسم الكامل مطلوب" })
    .trim()
    .min(2, "الاسم الكامل مطلوب (حرفان على الأقل)"),
  phone: z
    .string({ message: "رقم الهاتف مطلوب" })
    .trim()
    .min(9, "رقم الهاتف غير صالح (9 أرقام على الأقل)")
    .regex(/^[\d+\s()-]+$/, "رقم الهاتف غير صالح"),
  email: z
    .string({ message: "البريد الإلكتروني مطلوب" })
    .trim()
    .min(1, "البريد الإلكتروني مطلوب")
    .email("البريد الإلكتروني غير صالح"),
  date: z
    .string({ message: "تاريخ الحجز مطلوب" })
    .trim()
    .min(1, "تاريخ الحجز مطلوب")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "صيغة التاريخ غير صالحة (YYYY-MM-DD)"),
  time: z
    .string({ message: "وقت الحجز مطلوب" })
    .trim()
    .min(1, "وقت الحجز مطلوب")
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, "صيغة الوقت غير صالحة (HH:MM)")
    .transform((t) => (t.length === 5 ? `${t}:00` : t)),
  service_type: bookingServiceTypeSchema,
  notes: z
    .string()
    .nullable()
    .optional()
    .transform((v) =>
      v == null || !String(v).trim() ? null : String(v).trim()
    ),
  notify_whatsapp: z.boolean().optional().default(true),
  notify_email: z.boolean().optional().default(true),
})
  .superRefine((data, ctx) => {
    if (!data.notify_whatsapp && !data.notify_email) {
      ctx.addIssue({
        code: "custom",
        path: ["notify_whatsapp"],
        message:
          "يرجى اختيار قناة واحدة على الأقل لاستلام التحديثات (WhatsApp أو Email)",
      });
    }
    if (data.notify_whatsapp && data.phone.trim().length < 9) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message:
          "رقم واتساب غير صالح — أدخلي رقم هاتف صحيح لاستلام التحديثات عبر WhatsApp",
      });
    }
    if (data.notify_email) {
      const email = data.email.trim();
      if (!email || !z.string().email().safeParse(email).success) {
        ctx.addIssue({
          code: "custom",
          path: ["email"],
          message:
            "البريد الإلكتروني مطلوب وصالح عند اختيار التحديثات عبر Email",
        });
      }
    }
  });

export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;

/** Map Zod path → public field name for API clients */
export function bookingFieldFromPath(path: PropertyKey[]): string {
  const key = String(path[0] ?? "form");
  const map: Record<string, string> = {
    name: "name",
    phone: "phone",
    email: "email",
    date: "date",
    time: "time",
    service_type: "service_type",
    notes: "notes",
    notify_whatsapp: "notify_whatsapp",
    notify_email: "notify_email",
  };
  return map[key] ?? key;
}

export function formatZodBookingErrors(error: z.ZodError) {
  const fields = error.issues.map((issue) => ({
    field: bookingFieldFromPath(issue.path),
    message: issue.message,
    path: issue.path.map(String).join(".") || undefined,
  }));
  return {
    error: fields[0]?.message ?? "بيانات غير صالحة",
    field: fields[0]?.field,
    message: fields[0]?.message ?? "بيانات غير صالحة",
    fields,
  };
}
