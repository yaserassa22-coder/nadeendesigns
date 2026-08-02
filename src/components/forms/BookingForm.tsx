"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Calendar, CheckCircle } from "lucide-react";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SERVICE_TYPE_LABELS } from "@/types";
import type { Dress } from "@/types";

const bookingSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  phone: z.string().min(9, "رقم الهاتف غير صالح"),
  email: z.string().email("البريد الإلكتروني غير صالح").optional().or(z.literal("")),
  date: z.string().min(1, "التاريخ مطلوب"),
  time: z.string().min(1, "الوقت مطلوب"),
  service_type: z.enum(["fitting", "consultation", "rental", "purchase"]),
  dress_id: z.string().optional(),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  dresses?: Dress[];
  preselectedDressId?: string;
}

export function BookingForm({ dresses = [], preselectedDressId }: BookingFormProps) {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      service_type: "fitting",
      dress_id: preselectedDressId ?? "",
    },
  });

  const onSubmit = async (data: BookingFormData) => {
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          email: data.email || null,
          dress_id: data.dress_id || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "حدث خطأ");
      }
      setSuccess(true);
      reset();
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
        <p className="mt-2 text-muted">
          سنتواصل معكِ قريبًا لتأكيد الموعد
        </p>
        <Button className="mt-6" onClick={() => setSuccess(false)}>
          حجز موعد آخر
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
        label="البريد الإلكتروني"
        type="email"
        {...register("email")}
        error={errors.email?.message}
        placeholder="email@example.com"
        dir="ltr"
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

      <Select
        label="نوع الخدمة *"
        {...register("service_type")}
        error={errors.service_type?.message}
        options={Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => ({
          value,
          label,
        }))}
      />

      {dresses.length > 0 && (
        <Select
          label="الفستان (اختياري)"
          {...register("dress_id")}
          options={[
            { value: "", label: "— بدون تحديد —" },
            ...dresses.map((d) => ({ value: d.id, label: d.name_ar })),
          ]}
        />
      )}

      <Textarea
        label="ملاحظات إضافية"
        {...register("notes")}
        rows={4}
        placeholder="أخبرينا عن أي تفاصيل أو طلبات خاصة..."
      />

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}

      <Button type="submit" size="lg" loading={isSubmitting} className="w-full sm:w-auto">
        <Calendar className="h-4 w-4" />
        تأكيد الحجز
      </Button>
    </form>
  );
}
