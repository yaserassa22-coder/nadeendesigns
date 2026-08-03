"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar, CheckCircle } from "lucide-react";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  NotificationPreferences,
  validateNotificationPreferences,
  type NotificationPreferenceValue,
} from "@/components/forms/NotificationPreferences";
import { CUSTOM_DESIGN_BRIEF_KEY } from "@/lib/constants";
import { BOOKING_SERVICE_OPTIONS } from "@/types";

const bookingSchema = z
  .object({
    name: z.string().trim().min(2, "الاسم الكامل مطلوب"),
    phone: z
      .string()
      .trim()
      .min(9, "رقم الهاتف غير صالح")
      .regex(/^[\d+\s()-]+$/, "رقم الهاتف غير صالح"),
    email: z
      .string()
      .trim()
      .min(1, "البريد الإلكتروني مطلوب")
      .email("البريد الإلكتروني غير صالح"),
    date: z.string().min(1, "تاريخ الحجز مطلوب"),
    time: z.string().min(1, "وقت الحجز مطلوب"),
    service_type: z.enum(
      [
        "wedding_dress",
        "rental_dress",
        "custom_design",
        "nouf_dresses",
        "veil",
        "bridal_cape",
      ],
      { message: "نوع الخدمة مطلوب" }
    ),
    notes: z.string().optional(),
    notify_whatsapp: z.boolean(),
    notify_email: z.boolean(),
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

type BookingFormData = z.infer<typeof bookingSchema>;

type ApiFieldError = { field: string; message: string };

const API_FIELD_TO_FORM: Record<string, keyof BookingFormData | "form"> = {
  name: "name",
  phone: "phone",
  email: "email",
  date: "date",
  time: "time",
  service_type: "service_type",
  notes: "notes",
  notify_whatsapp: "notify_whatsapp",
  notify_email: "notify_email",
  form: "form",
};

export function BookingForm() {
  const searchParams = useSearchParams();
  const serviceParam = searchParams.get("service");
  const defaultService =
    serviceParam &&
    BOOKING_SERVICE_OPTIONS.some((o) => o.value === serviceParam)
      ? (serviceParam as BookingFormData["service_type"])
      : "wedding_dress";

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError: setFormError,
    clearErrors,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      service_type: defaultService,
      email: "",
      notes: "",
      notify_whatsapp: true,
      notify_email: true,
    },
  });

  const notifyPrefs: NotificationPreferenceValue = {
    notify_whatsapp: watch("notify_whatsapp"),
    notify_email: watch("notify_email"),
  };

  useEffect(() => {
    try {
      const brief = sessionStorage.getItem(CUSTOM_DESIGN_BRIEF_KEY);
      if (brief) {
        setValue("notes", brief);
        setValue("service_type", "custom_design");
        sessionStorage.removeItem(CUSTOM_DESIGN_BRIEF_KEY);
      }
    } catch {
      /* ignore */
    }

    if (serviceParam) setValue("service_type", defaultService);
  }, [setValue, serviceParam, defaultService]);

  const applyApiFieldErrors = (fields?: ApiFieldError[], fallback?: string) => {
    clearErrors();
    if (!fields?.length) {
      setError(fallback || "حدث خطأ أثناء إرسال الحجز");
      return;
    }

    const formKeys = new Set<string>([
      "name",
      "phone",
      "email",
      "date",
      "time",
      "service_type",
      "notes",
      "notify_whatsapp",
      "notify_email",
    ]);

    let formLevel = "";
    for (const item of fields) {
      const formKey = String(API_FIELD_TO_FORM[item.field] ?? item.field);
      if (formKey === "form" || !formKeys.has(formKey)) {
        formLevel = formLevel || item.message;
        continue;
      }
      setFormError(formKey as keyof BookingFormData, {
        type: "server",
        message: item.message,
      });
    }
    setError(formLevel || fields[0]?.message || fallback || "");
  };

  const onSubmit = async (data: BookingFormData) => {
    setError("");
    clearErrors();
    const notifyError = validateNotificationPreferences(
      {
        notify_whatsapp: data.notify_whatsapp,
        notify_email: data.notify_email,
      },
      { phone: data.phone, email: data.email }
    );
    if (notifyError) {
      setError(notifyError);
      return;
    }
    try {
      const payload = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        date: data.date,
        time: data.time,
        service_type: data.service_type,
        notes: data.notes?.trim() ? data.notes.trim() : null,
        notify_whatsapp: data.notify_whatsapp,
        notify_email: data.notify_email,
      };

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const errBody = await res.json().catch(() => ({}));

      if (!res.ok) {
        applyApiFieldErrors(
          errBody.fields as ApiFieldError[] | undefined,
          errBody.message || errBody.error || "حدث خطأ"
        );
        return;
      }

      setSuccess(true);
      reset({
        service_type: defaultService,
        email: "",
        notes: "",
        notify_whatsapp: true,
        notify_email: true,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl border border-gold/30 bg-gold/5 p-8 text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-gold" />
        <h3 className="mt-4 text-xl font-semibold text-charcoal">
          تم إرسال طلب الحجز بنجاح!
        </h3>
        <p className="mt-2 text-muted">سنتواصل معكِ قريبًا لتأكيد الموعد</p>
        <Button className="mt-6" onClick={() => setSuccess(false)}>
          حجز موعد آخر
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="grid gap-6 sm:grid-cols-2">
        <Input
          label="الاسم الكامل *"
          {...register("name")}
          error={errors.name?.message}
          placeholder="اسمك الكامل"
        />
        <Input
          label="رقم الهاتف *"
          {...register("phone")}
          error={errors.phone?.message}
          placeholder="05xxxxxxxx"
          dir="ltr"
        />
      </div>

      <Input
        label="البريد الإلكتروني *"
        type="email"
        {...register("email")}
        error={errors.email?.message}
        placeholder="email@example.com"
        dir="ltr"
      />

      <Select
        label="الخدمة المطلوبة *"
        {...register("service_type")}
        error={errors.service_type?.message}
        options={BOOKING_SERVICE_OPTIONS.map(({ value, label }) => ({
          value,
          label,
        }))}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <Input
          label="التاريخ *"
          type="date"
          {...register("date")}
          error={errors.date?.message}
        />
        <Input
          label="الوقت *"
          type="time"
          {...register("time")}
          error={errors.time?.message}
        />
      </div>

      <Textarea
        label="ملاحظات إضافية"
        {...register("notes")}
        error={errors.notes?.message}
        rows={4}
        placeholder="أخبرينا عن أي تفاصيل أو طلبات خاصة..."
      />

      <NotificationPreferences
        idPrefix="booking-notify"
        value={notifyPrefs}
        onChange={(next) => {
          setValue("notify_whatsapp", next.notify_whatsapp, {
            shouldValidate: true,
          });
          setValue("notify_email", next.notify_email, {
            shouldValidate: true,
          });
        }}
        error={
          errors.notify_whatsapp?.message || errors.notify_email?.message
        }
      />

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}

      <Button
        type="submit"
        size="lg"
        loading={isSubmitting}
        className="w-full sm:w-auto"
      >
        <Calendar className="h-4 w-4" />
        تأكيد الحجز
      </Button>
    </form>
  );
}
