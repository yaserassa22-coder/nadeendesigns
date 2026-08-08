"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n";
import { bookingServiceOptions } from "@/lib/i18n/service-labels";

function createBookingSchema(t: ReturnType<typeof useLocale>["t"]) {
  return z
    .object({
      name: z.string().trim().min(2, t.booking.validation.nameRequired),
      phone: z
        .string()
        .trim()
        .min(9, t.booking.validation.phoneInvalid)
        .regex(/^[\d+\s()-]+$/, t.booking.validation.phoneInvalid),
      email: z
        .string()
        .trim()
        .min(1, t.booking.validation.emailRequired)
        .email(t.booking.validation.emailInvalid),
      date: z.string().min(1, t.booking.validation.dateRequired),
      time: z.string().min(1, t.booking.validation.timeRequired),
      service_type: z.enum(
        [
          "wedding_dress",
          "rental_dress",
          "custom_design",
          "nouf_dresses",
          "veil",
          "bridal_cape",
        ],
        { message: t.booking.validation.serviceRequired }
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
          message: t.booking.validation.notifyChannelRequired,
        });
      }
      if (data.notify_email) {
        const email = data.email.trim();
        if (!email || !z.string().email().safeParse(email).success) {
          ctx.addIssue({
            code: "custom",
            path: ["email"],
            message: t.booking.validation.emailRequiredForEmailNotify,
          });
        }
      }
    });
}

type BookingFormData = z.infer<ReturnType<typeof createBookingSchema>>;

type ApiFieldError = { field: string; message: string };

type SlotInfo = { time: string; available: boolean; label?: string };

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
  const { t, locale } = useLocale();
  const bookingSchema = useMemo(() => createBookingSchema(t), [t]);
  const searchParams = useSearchParams();
  const serviceParam = searchParams.get("service");
  const dressParam = searchParams.get("dress");
  const defaultService =
    serviceParam &&
    BOOKING_SERVICE_OPTIONS.some((o) => o.value === serviceParam)
      ? (serviceParam as BookingFormData["service_type"])
      : "wedding_dress";

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError: setFormError,
    clearErrors,
    getValues,
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
  const selectedDate = watch("date");
  const selectedTime = watch("time");

  useEffect(() => {
    const noteParts: string[] = [];
    try {
      // Keep brief until booking succeeds — do not remove on mount.
      const brief = sessionStorage.getItem(CUSTOM_DESIGN_BRIEF_KEY);
      if (brief) {
        noteParts.push(brief);
        setValue("service_type", "custom_design");
      }
    } catch {
      /* ignore */
    }

    if (dressParam?.trim()) {
      noteParts.push(formatMessage(t.booking.linkedProductNote, { id: dressParam.trim() }));
    }

    if (noteParts.length) {
      const current = getValues("notes")?.trim() ?? "";
      const merged = noteParts.join("\n\n");
      if (!current.includes(noteParts[0]!)) {
        setValue("notes", current ? `${merged}\n\n${current}` : merged);
      }
    }

    if (serviceParam) setValue("service_type", defaultService);
  }, [setValue, getValues, serviceParam, defaultService, dressParam]);

  useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    setValue("time", "");
    void fetch(
      `/api/bookings/availability?date=${encodeURIComponent(selectedDate)}`,
      { cache: "no-store" }
    )
      .then(async (r) => {
        const d = await r.json();
        if (cancelled) return;
        const list: SlotInfo[] = Array.isArray(d.slots) ? d.slots : [];
        setSlots(list);
        const anyOpen = list.some((s) => s.available);
        setShowWaitlist(!anyOpen && list.length >= 0);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate, setValue]);

  const applyApiFieldErrors = (fields?: ApiFieldError[], fallback?: string) => {
    clearErrors();
    if (!fields?.length) {
      setError(fallback || t.booking.submitError);
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

  const joinWaitlist = async () => {
    const v = getValues();
    if (!v.name?.trim() || !v.phone?.trim()) {
      setError(t.booking.waitlistNeedContact);
      return;
    }
    setWaitlistLoading(true);
    setError("");
    try {
      const res = await fetch("/api/waiting-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: v.name,
          phone: v.phone,
          email: v.email || null,
          preferred_date: v.date || null,
          preferred_time: v.time || null,
          notes: v.notes || null,
          notify_whatsapp: v.notify_whatsapp,
          notify_email: v.notify_email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.booking.waitlistJoinFailed);
      setWaitlistDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.booking.waitlistJoinFailed);
    } finally {
      setWaitlistLoading(false);
    }
  };

  const onSubmit = async (data: BookingFormData) => {
    setError("");
    clearErrors();
    const notifyError = validateNotificationPreferences(
      {
        notify_whatsapp: data.notify_whatsapp,
        notify_email: data.notify_email,
      },
      { phone: data.phone, email: data.email },
      locale
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
        booking_source: "online",
      };

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const errBody = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 409) {
          setShowWaitlist(true);
        }
        applyApiFieldErrors(
          errBody.fields as ApiFieldError[] | undefined,
          errBody.message || errBody.error || t.common.errorGeneric
        );
        return;
      }

      try {
        sessionStorage.removeItem(CUSTOM_DESIGN_BRIEF_KEY);
      } catch {
        /* ignore */
      }
      try {
        const phone = data.phone?.trim() || "";
        const email = data.email?.trim() || "";
        const meta = JSON.stringify({
          id: errBody.id ?? null,
          phone: data.phone,
          email: data.email,
          customerKey: phone
            ? `p:${phone}`
            : email
              ? `e:${email.toLowerCase()}`
              : null,
        });
        sessionStorage.setItem("nadeen_last_booking", meta);
        localStorage.setItem("nadeen_last_booking", meta);
      } catch {
        /* ignore */
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
      setError(e instanceof Error ? e.message : t.booking.unexpectedError);
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl border border-gold/30 bg-gold/5 p-8 text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-gold" />
        <h3 className="mt-4 text-xl font-semibold text-charcoal">
          {t.booking.success}
        </h3>
        <p className="mt-2 text-muted">{t.booking.successHint}</p>
        <Button className="mt-6" onClick={() => setSuccess(false)}>
          {t.booking.bookAnother}
        </Button>
      </div>
    );
  }

  if (waitlistDone) {
    return (
      <div className="rounded-2xl border border-gold/30 bg-gold/5 p-8 text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-gold" />
        <h3 className="mt-4 text-xl font-semibold text-charcoal">
          {t.booking.waitlistSuccess}
        </h3>
        <p className="mt-2 text-muted">{t.booking.waitlistHint}</p>
        <Button className="mt-6" onClick={() => setWaitlistDone(false)}>
          {t.booking.backToForm}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="grid gap-6 sm:grid-cols-2">
        <Input
          label={`${t.booking.name} *`}
          {...register("name")}
          error={errors.name?.message}
          placeholder={t.booking.name}
        />
        <Input
          label={`${t.booking.phone} *`}
          {...register("phone")}
          error={errors.phone?.message}
          placeholder="05xxxxxxxx"
          dir="ltr"
        />
      </div>

      <Input
        label={`${t.booking.email} *`}
        type="email"
        {...register("email")}
        error={errors.email?.message}
        placeholder="email@example.com"
        dir="ltr"
      />

      <Select
        label={`${t.booking.service} *`}
        {...register("service_type")}
        error={errors.service_type?.message}
        options={bookingServiceOptions(locale).map(({ value, label }) => ({
          value,
          label,
        }))}
      />

      <Input
        label={`${t.booking.date} *`}
        type="date"
        {...register("date")}
        error={errors.date?.message}
      />

      <div>
        <p className="mb-2 text-sm font-medium text-charcoal">
          {t.booking.time} *
        </p>
        {!selectedDate ? (
          <p className="text-sm text-muted">{t.booking.pickDateFirst}</p>
        ) : slotsLoading ? (
          <p className="text-sm text-muted">{t.booking.loadingSlots}</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted">
            {t.booking.noSlots}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                disabled={!slot.available}
                onClick={() =>
                  setValue("time", slot.time, { shouldValidate: true })
                }
                className={cn(
                  "rounded-xl border px-2 py-2 text-sm transition",
                  !slot.available &&
                    "cursor-not-allowed border-beige-dark/60 bg-beige/40 text-muted line-through",
                  slot.available &&
                    selectedTime === slot.time &&
                    "border-gold bg-gold text-white",
                  slot.available &&
                    selectedTime !== slot.time &&
                    "border-beige-dark hover:border-gold/50"
                )}
              >
                <span dir="ltr">{slot.time}</span>
                {!slot.available && (
                  <span className="mt-0.5 block text-[10px] no-underline">
                    {slot.label || t.booking.unavailable}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        <input type="hidden" {...register("time")} />
        {errors.time?.message && (
          <p className="mt-1 text-sm text-red-600">{errors.time.message}</p>
        )}
      </div>

      {(showWaitlist || (slots.length > 0 && !slots.some((s) => s.available))) && (
        <div className="rounded-xl border border-beige-dark bg-beige/30 p-4 text-sm">
          <p className="text-charcoal">
            {t.booking.waitlistCta}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            loading={waitlistLoading}
            onClick={() => void joinWaitlist()}
          >
            {t.booking.joinWaitlist}
          </Button>
        </div>
      )}

      <Textarea
        label={t.booking.notes}
        {...register("notes")}
        error={errors.notes?.message}
        rows={4}
        placeholder={t.booking.notes}
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
        {t.booking.submit}
      </Button>
    </form>
  );
}
