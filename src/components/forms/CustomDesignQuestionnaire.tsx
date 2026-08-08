"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle, Sparkles } from "lucide-react";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  CUSTOM_DESIGN_BRIEF_KEY,
  CUSTOM_DESIGN_DATA_KEY,
} from "@/lib/constants";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/lib/i18n/types";

/** Stored option values stay Arabic for draft/booking backward compatibility. */
const DRESS_TYPE_VALUES = ["كلاسيكي", "عصري", "ملكي", "محتشم", "فاخر", "حسب رغبتي"] as const;
const DRESS_TYPE_KEYS = ["classic", "modern", "royal", "modest", "luxury", "custom"] as const;
const SILHOUETTE_VALUES = ["منفوش", "حورية البحر", "قصة A", "مستقيم", "حسب رغبتي"] as const;
const SILHOUETTE_KEYS = ["ballgown", "mermaid", "aLine", "sheath", "custom"] as const;
const SLEEVE_VALUES = ["بدون أكمام", "قصيرة", "طويلة", "شفافة", "حسب رغبتي"] as const;
const SLEEVE_KEYS = ["sleeveless", "short", "long", "sheer", "custom"] as const;
const NECKLINE_VALUES = ["ياقة عالية", "ياقة V", "كتف مكشوف", "قلب", "حسب رغبتي"] as const;
const NECKLINE_KEYS = ["high", "vNeck", "offShoulder", "sweetheart", "custom"] as const;
const FABRIC_VALUES = ["دانتيل", "ساتان", "تول", "كريب", "حسب رغبتي"] as const;
const FABRIC_KEYS = ["lace", "satin", "tulle", "crepe", "custom"] as const;
const EMBELLISH_VALUES = ["تطريز فاخر", "خرز", "كريستال", "دانتيل", "بسيطة", "حسب رغبتي"] as const;
const EMBELLISH_KEYS = ["embroidery", "beads", "crystal", "lace", "simple", "custom"] as const;
const BUDGET_VALUES = [
  "أقل من 3,000",
  "3,000 - 5,000",
  "5,000 - 7,500",
  "7,500 - 10,000",
  "10,000 - 15,000",
  "أكثر من 15,000",
] as const;
const BUDGET_KEYS = ["under3k", "b3to5", "b5to75", "b75to10", "b10to15", "over15"] as const;

function mapOptions(
  values: readonly string[],
  keys: readonly string[],
  labels: Record<string, string>
) {
  return values.map((value, i) => ({
    value,
    label: labels[keys[i]] ?? value,
  }));
}

function createSchema(t: Dictionary["customization"]) {
  const requiredSelect = z.string().min(1, t.fieldRequired);
  return z.object({
    dress_type: requiredSelect,
    silhouette: requiredSelect,
    sleeves: requiredSelect,
    neckline: requiredSelect,
    fabric: requiredSelect,
    embellishment: requiredSelect,
    wedding_date: z.string().min(1, t.weddingDateRequired),
    budget: requiredSelect,
    details: z.string().optional(),
  });
}

type QuestionnaireData = z.infer<ReturnType<typeof createSchema>>;

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

function formatBrief(data: QuestionnaireData, t: Dictionary["customization"]): string {
  const lines = [
    t.briefTitle,
    `${t.dressType}: ${data.dress_type}`,
    `${t.silhouette}: ${data.silhouette}`,
    `${t.sleeves}: ${data.sleeves}`,
    `${t.neckline}: ${data.neckline}`,
    `${t.fabric}: ${data.fabric}`,
    `${t.embellishment}: ${data.embellishment}`,
    `${t.weddingDate}: ${data.wedding_date}`,
    `${t.budget}: ${data.budget}`,
  ];
  if (data.details?.trim()) {
    lines.push(`${t.details}: ${data.details.trim()}`);
  }
  return lines.join("\n");
}

function saveDraft(data: QuestionnaireData, t: Dictionary["customization"]) {
  try {
    sessionStorage.setItem(CUSTOM_DESIGN_DATA_KEY, JSON.stringify(data));
    sessionStorage.setItem(CUSTOM_DESIGN_BRIEF_KEY, formatBrief(data, t));
  } catch {
    /* ignore */
  }
}

function loadDraft(schema: ReturnType<typeof createSchema>): QuestionnaireData | null {
  try {
    const raw = sessionStorage.getItem(CUSTOM_DESIGN_DATA_KEY);
    if (!raw) return null;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function CustomDesignQuestionnaire() {
  const { t } = useLocale();
  const c = t.customization;
  const schema = useMemo(() => createSchema(c), [c]);
  const [phase, setPhase] = useState<"form" | "success">("form");
  const [isEditing, setIsEditing] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const selectPlaceholder = useMemo(
    () => ({ value: "", label: c.selectPlaceholder }),
    [c.selectPlaceholder]
  );
  const dressTypes = useMemo(() => mapOptions(DRESS_TYPE_VALUES, DRESS_TYPE_KEYS, c.dressTypes), [c.dressTypes]);
  const silhouettes = useMemo(() => mapOptions(SILHOUETTE_VALUES, SILHOUETTE_KEYS, c.silhouettes), [c.silhouettes]);
  const sleevesOpts = useMemo(() => mapOptions(SLEEVE_VALUES, SLEEVE_KEYS, c.sleevesOpts), [c.sleevesOpts]);
  const necklines = useMemo(() => mapOptions(NECKLINE_VALUES, NECKLINE_KEYS, c.necklines), [c.necklines]);
  const fabrics = useMemo(() => mapOptions(FABRIC_VALUES, FABRIC_KEYS, c.fabrics), [c.fabrics]);
  const embellishments = useMemo(() => mapOptions(EMBELLISH_VALUES, EMBELLISH_KEYS, c.embellishments), [c.embellishments]);
  const budgets = useMemo(() => mapOptions(BUDGET_VALUES, BUDGET_KEYS, c.budgets), [c.budgets]);

  const { register, handleSubmit, formState: { errors }, reset, getValues } = useForm<QuestionnaireData>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft = loadDraft(schema);
      if (draft) { reset(draft); setIsEditing(true); }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reset, schema]);

  const onSubmit = (data: QuestionnaireData) => {
    saveDraft(data, c);
    reset(data);
    setIsEditing(true);
    setSaveNotice(isEditing ? c.successEdit : c.successNew);
    setPhase("success");
  };

  const openEdit = () => {
    const draft = loadDraft(schema) ?? getValues();
    reset({ ...EMPTY_VALUES, ...draft, details: draft.details ?? "" });
    setIsEditing(true);
    setSaveNotice("");
    setPhase("form");
  };

  if (!hydrated) {
    return (
      <div className="rounded-3xl border border-beige-dark bg-white/90 px-6 py-16 text-center text-muted">
        {c.loading}
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
          {saveNotice || c.successNew}
        </h3>
        <p className="mx-auto mt-4 max-w-md text-muted leading-relaxed">
          {isEditing ? c.successHintEdit : c.successHintNew}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/booking?service=custom_design">
            <Button size="lg">{c.bookConsult}</Button>
          </Link>
          <Button variant="outline" size="lg" onClick={openEdit}>
            {c.edit}
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
          {isEditing ? c.editTitle : c.startTitle}
        </h2>
        <div className="decorative-line mx-auto mt-5 w-20" />
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted md:text-lg">
          {isEditing ? c.editHint : c.startHint}
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Select label={c.dressType} options={[selectPlaceholder, ...dressTypes]} error={errors.dress_type?.message} {...register("dress_type")} />
        <Select label={c.silhouette} options={[selectPlaceholder, ...silhouettes]} error={errors.silhouette?.message} {...register("silhouette")} />
        <Select label={c.sleeves} options={[selectPlaceholder, ...sleevesOpts]} error={errors.sleeves?.message} {...register("sleeves")} />
        <Select label={c.neckline} options={[selectPlaceholder, ...necklines]} error={errors.neckline?.message} {...register("neckline")} />
        <Select label={c.fabric} options={[selectPlaceholder, ...fabrics]} error={errors.fabric?.message} {...register("fabric")} />
        <Select label={c.embellishment} options={[selectPlaceholder, ...embellishments]} error={errors.embellishment?.message} {...register("embellishment")} />
        <Input label={c.weddingDate} type="date" error={errors.wedding_date?.message} {...register("wedding_date")} dir="ltr" />
        <Select label={c.budget} options={[selectPlaceholder, ...budgets]} error={errors.budget?.message} {...register("budget")} />
      </div>
      <div className="mt-6">
        <Textarea label={c.details} rows={6} placeholder={c.detailsPlaceholder} error={errors.details?.message} {...register("details")} />
      </div>
      <div className="mt-10">
        <Button type="submit" size="lg" className="w-full py-5 text-base shadow-lg shadow-gold/25 md:text-lg">
          {isEditing ? c.saveEdits : c.submit}
        </Button>
      </div>
    </motion.form>
  );
}
