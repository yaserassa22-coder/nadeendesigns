"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { CheckCircle, Send } from "lucide-react";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const contactSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  email: z.string().email("البريد الإلكتروني غير صالح"),
  phone: z.string().optional(),
  subject: z.string().min(3, "الموضوع مطلوب"),
  message: z.string().min(10, "الرسالة قصيرة جدًا"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export function ContactForm() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
        <h3 className="mt-4 text-xl font-semibold">تم إرسال رسالتك!</h3>
        <p className="mt-2 text-muted">سنرد عليكِ في أقرب وقت</p>
        <Button className="mt-6" onClick={() => setSuccess(false)}>
          إرسال رسالة أخرى
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Input
          label="الاسم *"
          {...register("name")}
          error={errors.name?.message}
        />
        <Input
          label="البريد الإلكتروني *"
          type="email"
          {...register("email")}
          error={errors.email?.message}
          dir="ltr"
        />
      </div>
      <Input
        label="رقم الهاتف"
        {...register("phone")}
        dir="ltr"
      />
      <Input
        label="الموضوع *"
        {...register("subject")}
        error={errors.subject?.message}
      />
      <Textarea
        label="الرسالة *"
        {...register("message")}
        error={errors.message?.message}
        rows={5}
      />
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}
      <Button type="submit" size="lg" loading={isSubmitting}>
        <Send className="h-4 w-4" />
        إرسال الرسالة
      </Button>
    </form>
  );
}
