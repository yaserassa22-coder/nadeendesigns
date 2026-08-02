"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Sparkles } from "lucide-react";
import type { Dress } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { PersonalizationFonts } from "@/components/dresses/PersonalizationFonts";
import { PersonalizationPreview } from "@/components/dresses/PersonalizationPreview";
import {
  DEFAULT_GIFT_STATE,
  GiftWrappingSection,
  type GiftWrappingState,
} from "@/components/dresses/GiftWrappingSection";
import {
  ARABIC_FONT_OPTIONS,
  ENGLISH_FONT_OPTIONS,
  ROBE_POSITION_OPTIONS,
  VEIL_POSITION_OPTIONS,
  WRITING_COLOR_OPTIONS,
  WRITING_LANGUAGE_OPTIONS,
  categoryToServiceType,
  clearPersonalization,
  savePersonalization,
  type ArabicFont,
  type EnglishFont,
  type WritingColor,
  type WritingLanguage,
  type WritingPosition,
} from "@/lib/personalization";
import { clearGiftOptions, saveGiftOptions } from "@/lib/gift";
import { giftOptionsSchema } from "@/lib/validations/gift";
import { productPersonalizationSchema } from "@/lib/validations/personalization";
import { cn } from "@/lib/utils";

interface PersonalizationFormProps {
  dress: Dress;
  productType: "veils" | "robes";
}

export function PersonalizationForm({
  dress,
  productType,
}: PersonalizationFormProps) {
  const router = useRouter();
  const [writingLanguage, setWritingLanguage] =
    useState<WritingLanguage>("ar");
  const [textAr, setTextAr] = useState("");
  const [textEn, setTextEn] = useState("");
  const [fontAr, setFontAr] = useState<ArabicFont>("classic_ar");
  const [fontEn, setFontEn] = useState<EnglishFont>("elegant_script");
  const [color, setColor] = useState<WritingColor>("gold");
  const [position, setPosition] = useState<WritingPosition>(
    productType === "robes" ? "back" : "bottom_corner"
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [gift, setGift] = useState<GiftWrappingState>(DEFAULT_GIFT_STATE);

  const positionOptions = useMemo(
    () =>
      productType === "robes" ? ROBE_POSITION_OPTIONS : VEIL_POSITION_OPTIONS,
    [productType]
  );

  const showArabic =
    writingLanguage === "ar" || writingLanguage === "both";
  const showEnglish =
    writingLanguage === "en" || writingLanguage === "both";

  const persistGift = (): boolean => {
    if (!gift.enabled) {
      clearGiftOptions();
      return true;
    }

    const parsed = giftOptionsSchema.safeParse({
      enabled: true as const,
      gift_box: gift.giftBox,
      gift_card: gift.giftCard,
      gift_message: gift.giftMessage,
      sender_name: gift.senderName,
      recipient_name: gift.recipientName,
      hide_price: gift.hidePrice,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors((prev) => ({ ...prev, ...next }));
      return false;
    }

    try {
      saveGiftOptions(parsed.data);
      return true;
    } catch {
      setErrors((prev) => ({
        ...prev,
        form: "تعذّر حفظ خيارات الإهداء. حاولي مرة أخرى.",
      }));
      return false;
    }
  };

  const goToBooking = (withPersonalization: boolean) => {
    setErrors({});

    if (withPersonalization) {
      const parsed = productPersonalizationSchema.safeParse({
        product_type: productType,
        dress_id: dress.id,
        dress_name_ar: dress.name_ar,
        writing_language: writingLanguage,
        text_ar: textAr,
        text_en: textEn,
        font_ar: fontAr,
        font_en: fontEn,
        color,
        position,
      });

      if (!parsed.success) {
        const next: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? "form");
          if (!next[key]) next[key] = issue.message;
        }
        setErrors(next);
        return;
      }

      try {
        savePersonalization(parsed.data);
      } catch {
        setErrors({ form: "تعذّر حفظ التخصيص. حاولي مرة أخرى." });
        return;
      }
    } else {
      clearPersonalization();
    }

    if (!persistGift()) return;

    const service = categoryToServiceType(productType);
    router.push(`/booking?dress=${dress.id}&service=${service}`);
  };

  return (
    <PersonalizationFonts className="mt-10 space-y-6 rounded-3xl border border-beige-dark bg-white/80 p-6 shadow-sm md:p-8">
      <div className="text-center md:text-right">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-sm text-gold">
          <Sparkles className="h-4 w-4" />
          تخصيص الكتابة
        </div>
        <h2 className="text-2xl font-bold text-charcoal md:text-3xl">
          خصّصي الكتابة على{" "}
          {productType === "veils" ? "الطرحة" : "برنص العروس"}
        </h2>
        <p className="mt-2 text-muted">
          اختاري اللغة، الخط، اللون، وموضع الكتابة لإطلالة خاصة بكِ.
        </p>
      </div>

      <div className="decorative-line w-full" />

      <Select
        label="لغة الكتابة *"
        value={writingLanguage}
        onChange={(e) => {
          setWritingLanguage(e.target.value as WritingLanguage);
          setErrors({});
        }}
        options={WRITING_LANGUAGE_OPTIONS.map((o) => ({
          value: o.value,
          label: o.label,
        }))}
      />

      {writingLanguage === "both" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="الاسم أو النص بالعربية"
            value={textAr}
            maxLength={25}
            dir="rtl"
            onChange={(e) => setTextAr(e.target.value.slice(0, 25))}
            error={errors.text_ar}
            placeholder="مثال: ندين"
          />
          <Input
            label="Name or Text in English"
            value={textEn}
            maxLength={25}
            dir="ltr"
            onChange={(e) => setTextEn(e.target.value.slice(0, 25))}
            error={errors.text_en}
            placeholder="e.g. Nadeen"
          />
        </div>
      ) : writingLanguage === "ar" ? (
        <Input
          label="الاسم أو النص بالعربية *"
          value={textAr}
          maxLength={25}
          dir="rtl"
          onChange={(e) => setTextAr(e.target.value.slice(0, 25))}
          error={errors.text_ar}
          placeholder="مثال: العروس سارة"
        />
      ) : (
        <Input
          label="Name or Text in English *"
          value={textEn}
          maxLength={25}
          dir="ltr"
          onChange={(e) => setTextEn(e.target.value.slice(0, 25))}
          error={errors.text_en}
          placeholder="e.g. Sarah"
        />
      )}

      <p className="text-xs text-muted">حد أقصى 25 حرفًا لكل حقل</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {showArabic && (
          <Select
            label="خط العربية *"
            value={fontAr}
            onChange={(e) => setFontAr(e.target.value as ArabicFont)}
            options={ARABIC_FONT_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
        )}
        {showEnglish && (
          <Select
            label="English Font *"
            value={fontEn}
            onChange={(e) => setFontEn(e.target.value as EnglishFont)}
            dir="ltr"
            options={ENGLISH_FONT_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
        )}
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-charcoal">لون الكتابة *</p>
        <div className="flex flex-wrap gap-3">
          {WRITING_COLOR_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setColor(opt.value)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors",
                color === opt.value
                  ? "border-gold bg-gold/10 text-charcoal"
                  : "border-beige-dark bg-white text-muted hover:border-gold/40"
              )}
            >
              <span
                className="h-4 w-4 rounded-full border border-beige-dark"
                style={{ backgroundColor: opt.hex }}
              />
              <span dir="ltr">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <Select
        label="موضع الكتابة *"
        value={position}
        onChange={(e) => setPosition(e.target.value as WritingPosition)}
        dir="ltr"
        options={positionOptions.map((o) => ({
          value: o.value,
          label: o.label,
        }))}
        error={errors.position}
      />

      <PersonalizationPreview
        writingLanguage={writingLanguage}
        textAr={textAr}
        textEn={textEn}
        fontAr={fontAr}
        fontEn={fontEn}
        color={color}
      />

      <GiftWrappingSection
        value={gift}
        onChange={setGift}
        errors={errors}
      />

      {errors.form && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {errors.form}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          size="lg"
          className="w-full sm:w-auto"
          onClick={() => goToBooking(true)}
        >
          <Calendar className="h-4 w-4" />
          احجزي مع التخصيص
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => goToBooking(false)}
        >
          احجزي بدون تخصيص
        </Button>
      </div>
    </PersonalizationFonts>
  );
}
