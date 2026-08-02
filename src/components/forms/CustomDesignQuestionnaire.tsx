"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle, Sparkles } from "lucide-react";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  CUSTOM_DESIGN_BRIEF_KEY,
  CUSTOM_DESIGN_DATA_KEY,
} from "@/lib/constants";

const toOptions = (labels: string[]) =>
  labels.map((label) => ({ value: label, label }));

const DRESS_TYPES = toOptions([
  "كلاسيكي",
  "عصري",
  "ملكي",
  "محتشم",
  "فاخر",
  "حسب رغبتي",
]);

const SILHOUETTES = toOptions([
  "منفوش",
  "حورية البحر",
  "قصة A",
  "مستقيم",
  "حسب رغبتي",
]);

const SLEEVES = toOptions([
  "بدون أكمام",
  "قصيرة",
  "طويلة",
  "شفافة",
  "حسب رغبتي",
]);

const NECKLINES = toOptions([
  "ياقة عالية",
  "ياقة V",
  "كتف مكشوف",
  "قلب",
  "حسب رغبتي",
]);

const FABRICS = toOptions([
  "دانتيل",
  "ساتان",
  "تول",
  "كريب",
  "حسب رغبتي",
]);

const EMBELLISHMENTS = toOptions([
  "تطريز فاخر",
  "خرز",
  "كريستال",
  "دانتيل",
  "بسيطة",
  "حسب رغبتي",
]);

const BUDGETS = toOptions([
  "أقل من 3,000",
  "3,000 - 5,000",
  "5,000 - 7,500",
  "7,500 - 10,000",
  "10,000 - 15,000",
  "أكثر من 15,000",
]);

const requiredSelect = z.string().min(1, "هذا الحقل مطلوب");

const questionnaireSchema = z.object({
  dress_type: requiredSelect,
  silhouette: requiredSelect,
  sleeves: requiredSelect,
  neckline: requiredSelect,
  fabric: requiredSelect,
  embellishment: requiredSelect,
  wedding_date: z.string().min(1, "موعد الزفاف مطلوب"),
  budget: requiredSelect,
  details: z.string().optional(),
});

type QuestionnaireData = z.infer<typeof questionnaireSchema>;

const EMPTY_VALUES: QuestionnaireData = {
  dress_type: "",
  silhouette: "",
  sleeves: "",
  neckline: "",
  fabric: "",
  embellishment: "",
  wedding_date: "",
  budget: "",
  details: "",
};

function formatBrief(data: QuestionnaireData): string {
  const lines = [
    "—— طلب تصميم فستان خاص ——",
    `نوع الفستان: ${data.dress_type}`,
    `شكل القصة: ${data.silhouette}`,
    `نوع الأكمام: ${data.sleeves}`,
    `الياقة: ${data.neckline}`,
    `نوع القماش: ${data.fabric}`,
    `الزخرفة: ${data.embellishment}`,
    `موعد الزفاف: ${data.wedding_date}`,
    `الميزانية التقريبية: ${data.budget}`,
  ];
  if (data.details?.trim()) {
    lines.push(`تفاصيل إضافية: ${data.details.trim()}`);
  }
  return lines.join("\n");
}

function saveDraft(data: QuestionnaireData) {
  try {
    sessionStorage.setItem(CUSTOM_DESIGN_DATA_KEY, JSON.stringify(data));
    sessionStorage.setItem(CUSTOM_DESIGN_BRIEF_KEY, formatBrief(data));
  } catch {
    /* ignore private-mode storage failures */
  }
}

function loadDraft(): QuestionnaireData | null {
  try {
    const raw = sessionStorage.getItem(CUSTOM_DESIGN_DATA_KEY);
    if (!raw) return null;
    const parsed = questionnaireSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const selectPlaceholder = { value: "", label: "اختاري..." };

export function CustomDesignQuestionnaire() {
  const [phase, setPhase] = useState<"form" | "success">("form");
  const [isEditing, setIsEditing] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    getValues,
  } = useForm<QuestionnaireData>({
    resolver: zodResolver(questionnaireSchema),
    defaultValues: EMPTY_VALUES,
  });

  // Load any previously saved draft once on mount (never wipe it)
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      reset(draft);
      setIsEditing(true);
    }
    setHydrated(true);
  }, [reset]);

  const onSubmit = (data: QuestionnaireData) => {
    saveDraft(data);
    // Keep values in the form — do NOT reset()
    reset(data);
    setIsEditing(true);
    setSaveNotice(
      isEditing ? "تم حفظ التعديلات بنجاح." : "استلمنا رؤيتكِ بكل حب"
    );
    setPhase("success");
  };

  const openEdit = () => {
    const draft = loadDraft() ?? getValues();
    reset({
      ...EMPTY_VALUES,
      ...draft,
      details: draft.details ?? "",
    });
    setIsEditing(true);
    setSaveNotice("");
    setPhase("form");
  };

  if (!hydrated) {
    return (
      <div className="rounded-3xl border border-beige-dark bg-white/90 px-6 py-16 text-center text-muted">
        جاري تحميل التفاصيل...
      </div>
    );
  }

  if (phase === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-gold/25 bg-white/80 px-6 py-12 text-center shadow-sm backdrop-blur md:px-12"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
          <CheckCircle className="h-8 w-8" />
        </div>
        <h3 className="mt-6 text-2xl font-semibold text-charcoal md:text-3xl">
          {saveNotice || "استلمنا رؤيتكِ بكل حب"}
        </h3>
        <p className="mx-auto mt-4 max-w-md text-muted leading-relaxed">
          {isEditing
            ? "يمكنك متابعة حجز الاستشارة أو العودة لتعديل أي تفصيلة أخرى."
            : "خطوتكِ التالية هي حجز استشارة شخصية لنبدأ معًا رحلة تصميم فستانكِ الحصري."}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/booking?service=custom_design">
            <Button size="lg">احجزي استشارة</Button>
          </Link>
          <Button variant="outline" size="lg" onClick={openEdit}>
            تعديل
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.65 }}
      onSubmit={handleSubmit(onSubmit)}
      className="relative overflow-hidden rounded-3xl border border-beige-dark bg-white/90 p-6 shadow-sm backdrop-blur md:p-10 lg:p-12"
    >
      <div className="pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-l from-transparent via-gold/50 to-transparent" />

      <div className="mb-10 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
          <Sparkles className="h-5 w-5" />
        </div>
        <h2 className="text-2xl font-bold text-charcoal md:text-3xl lg:text-4xl">
          {isEditing
            ? "تعديل تصميم فستان خاص"
            : "ابدئي بتصميم فستان أحلامكِ"}
        </h2>
        <div className="decorative-line mx-auto mt-5 w-20" />
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted md:text-lg">
          {isEditing
            ? "عدّلي التفاصيل المحفوظة ثم اضغطي حفظ التعديلات."
            : "أخبِرينا عن رؤيتكِ لنصمم فستانًا يعكس شخصيتكِ بكل تفاصيله."}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Select
          label="نوع الفستان *"
          options={[selectPlaceholder, ...DRESS_TYPES]}
          error={errors.dress_type?.message}
          {...register("dress_type")}
        />
        <Select
          label="شكل القصة *"
          options={[selectPlaceholder, ...SILHOUETTES]}
          error={errors.silhouette?.message}
          {...register("silhouette")}
        />
        <Select
          label="نوع الأكمام *"
          options={[selectPlaceholder, ...SLEEVES]}
          error={errors.sleeves?.message}
          {...register("sleeves")}
        />
        <Select
          label="الياقة *"
          options={[selectPlaceholder, ...NECKLINES]}
          error={errors.neckline?.message}
          {...register("neckline")}
        />
        <Select
          label="نوع القماش *"
          options={[selectPlaceholder, ...FABRICS]}
          error={errors.fabric?.message}
          {...register("fabric")}
        />
        <Select
          label="الزخرفة *"
          options={[selectPlaceholder, ...EMBELLISHMENTS]}
          error={errors.embellishment?.message}
          {...register("embellishment")}
        />
        <Input
          label="موعد الزفاف *"
          type="date"
          error={errors.wedding_date?.message}
          {...register("wedding_date")}
          dir="ltr"
        />
        <Select
          label="الميزانية التقريبية *"
          options={[selectPlaceholder, ...BUDGETS]}
          error={errors.budget?.message}
          {...register("budget")}
        />
      </div>

      <div className="mt-6">
        <Textarea
          label="تفاصيل إضافية / ملاحظات"
          rows={6}
          placeholder="اكتبي أي تفاصيل أو أفكار خاصة بفستان أحلامكِ..."
          error={errors.details?.message}
          {...register("details")}
        />
      </div>

      <div className="mt-10">
        <Button
          type="submit"
          size="lg"
          className="w-full py-5 text-base shadow-lg shadow-gold/25 md:text-lg"
        >
          {isEditing ? "حفظ التعديلات" : "ابدئي رحلة تصميم فستانكِ"}
        </Button>
      </div>
    </motion.form>
  );
}
