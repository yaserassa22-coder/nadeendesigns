"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Sparkles } from "lucide-react";
import type { Dress } from "@/types";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Input";
import { PersonalizationFonts } from "@/components/dresses/PersonalizationFonts";
import { PersonalizationPreview } from "@/components/dresses/PersonalizationPreview";
import {
  DEFAULT_GIFT_STATE,
  GiftWrappingSection,
  type GiftWrappingState,
} from "@/components/dresses/GiftWrappingSection";
import {
  arabicFontSelectOptions,
  categoryToServiceType,
  clearPersonalization,
  englishFontFromPrimary,
  savePersonalization,
  writingColorSelectOptions,
  type ArabicFont,
  type WritingColor,
  type WritingPosition,
} from "@/lib/personalization";
import { clearGiftOptions, saveGiftOptions } from "@/lib/gift";
import { giftOptionsSchema } from "@/lib/validations/gift";
import { productPersonalizationSchema } from "@/lib/validations/personalization";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n";

interface PersonalizationFormProps {
  dress: Dress;
  productType: "veils" | "robes";
}

export function PersonalizationForm({
  dress,
  productType,
}: PersonalizationFormProps) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const [text, setText] = useState("");
  const [fontAr, setFontAr] = useState<ArabicFont>("classic_ar");
  const [color, setColor] = useState<WritingColor>("gold");
  const position: WritingPosition =
    productType === "robes" ? "back" : "bottom_corner";
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [gift, setGift] = useState<GiftWrappingState>(DEFAULT_GIFT_STATE);

  const arFontOptions = useMemo(() => arabicFontSelectOptions(locale), [locale]);
  const colorOptions = useMemo(() => writingColorSelectOptions(locale), [locale]);

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
        form: t.personalizationUi.saveGiftFailed,
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
        writing_language: "ar",
        text_ar: text,
        text_en: "",
        font_ar: fontAr,
        font_en: englishFontFromPrimary(fontAr),
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
        setErrors({ form: t.personalizationUi.saveFailed });
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
          {t.personalizationUi.formTitle}
        </div>
        <h2 className="text-2xl font-bold text-charcoal md:text-3xl">
          {t.personalizationUi.formTitle}{" "}
          {productType === "veils"
            ? t.personalizationUi.formSubtitleVeil
            : t.personalizationUi.formSubtitleRobe}
        </h2>
        <p className="mt-2 text-muted">{t.personalizationUi.formHint}</p>
      </div>

      <div className="decorative-line w-full" />

      <Textarea
        label={t.personalizationUi.textRequired}
        value={text}
        maxLength={25}
        rows={4}
        dir="auto"
        onChange={(e) => setText(e.target.value.slice(0, 25))}
        error={errors.text_ar}
        placeholder={t.personalizationUi.textPlaceholder}
      />
      <p className="text-xs text-muted">{t.personalizationUi.freeTextHint}</p>
      <p className="text-xs text-muted">
        {formatMessage(t.personalizationUi.maxChars, { count: 25 })}
      </p>

      <Select
        label={`${t.personalizationUi.font} *`}
        value={fontAr}
        onChange={(e) => setFontAr(e.target.value as ArabicFont)}
        options={arFontOptions}
      />

      <div>
        <p className="mb-3 text-sm font-medium text-charcoal">
          {t.personalizationUi.writingColor} *
        </p>
        <div className="flex flex-wrap gap-3">
          {colorOptions.map((opt) => (
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

      <PersonalizationPreview
        writingLanguage="ar"
        textAr={text}
        textEn=""
        fontAr={fontAr}
        fontEn={englishFontFromPrimary(fontAr)}
        color={color}
      />

      <GiftWrappingSection value={gift} onChange={setGift} errors={errors} />

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
          {t.personalizationUi.bookWith}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => goToBooking(false)}
        >
          {t.personalizationUi.bookWithout}
        </Button>
      </div>
    </PersonalizationFonts>
  );
}
