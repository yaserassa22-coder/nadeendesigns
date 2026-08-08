"use client";

import { Sparkles } from "lucide-react";
import type { ProductPersonalization } from "@/types";
import {
  getArabicFontLabel,
  getEnglishFontLabel,
  getWritingColorHex,
  getWritingColorLabel,
  ARABIC_FONT_CLASS,
  ENGLISH_FONT_CLASS,
} from "@/lib/personalization";
import { cn } from "@/lib/utils";
import { PersonalizationFonts } from "@/components/dresses/PersonalizationFonts";
import { PersonalizationPreview } from "@/components/dresses/PersonalizationPreview";
import { useLocale } from "@/components/i18n/LocaleProvider";

interface PersonalizationSummaryProps {
  personalization: ProductPersonalization;
  title?: string;
  compact?: boolean;
}

export function PersonalizationSummary({
  personalization,
  title,
  compact = false,
}: PersonalizationSummaryProps) {
  const { t, locale } = useLocale();
  const heading = title ?? t.personalizationUi.summaryTitle;
  const {
    dress_name_ar,
    writing_language,
    text_ar,
    text_en,
    font_ar,
    font_en,
    color,
  } = personalization;

  const displayText = (text_ar || text_en || "").trim();

  return (
    <PersonalizationFonts className="rounded-2xl border border-gold/25 bg-beige/30 p-5 md:p-6">
      <div className="mb-4 flex items-center gap-2 text-gold">
        <Sparkles className="h-5 w-5" />
        <h3 className="font-semibold text-charcoal">{heading}</h3>
      </div>

      <p className="mb-4 text-sm text-muted">
        {t.personalizationUi.product}{" "}
        <span className="font-medium text-charcoal">{dress_name_ar}</span>
      </p>

      {!compact && (
        <div className="mb-5">
          <PersonalizationPreview
            writingLanguage={writing_language}
            textAr={text_ar}
            textEn={text_en}
            fontAr={font_ar}
            fontEn={font_en}
            color={color}
          />
        </div>
      )}

      {compact && displayText ? (
        <div className="mb-4 text-center">
          {text_ar ? (
            <p
              dir="auto"
              className={cn("whitespace-pre-wrap text-xl", ARABIC_FONT_CLASS[font_ar])}
              style={{ color: getWritingColorHex(color) }}
            >
              {text_ar}
            </p>
          ) : null}
          {text_en && writing_language !== "ar" ? (
            <p
              dir="ltr"
              className={cn("whitespace-pre-wrap text-xl", ENGLISH_FONT_CLASS[font_en])}
              style={{ color: getWritingColorHex(color) }}
            >
              {text_en}
            </p>
          ) : null}
        </div>
      ) : null}

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {displayText ? (
          <div className="sm:col-span-2">
            <dt className="text-muted">{t.personalizationUi.text}</dt>
            <dd className="whitespace-pre-wrap font-medium text-charcoal" dir="auto">
              {displayText}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted">{t.personalizationUi.font}</dt>
          <dd className="font-medium text-charcoal">
            {text_ar || writing_language === "ar" || writing_language === "both"
              ? getArabicFontLabel(font_ar, locale)
              : getEnglishFontLabel(font_en, locale)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t.personalizationUi.writingColor}</dt>
          <dd className="flex items-center gap-2 font-medium text-charcoal">
            <span
              className="inline-block h-3.5 w-3.5 rounded-full border border-beige-dark"
              style={{ backgroundColor: getWritingColorHex(color) }}
            />
            {getWritingColorLabel(color, locale)}
          </dd>
        </div>
      </dl>
    </PersonalizationFonts>
  );
}
