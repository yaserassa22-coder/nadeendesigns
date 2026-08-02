"use client";

import { Sparkles } from "lucide-react";
import type { ProductPersonalization } from "@/types";
import {
  getArabicFontLabel,
  getEnglishFontLabel,
  getPositionLabel,
  getWritingColorHex,
  getWritingColorLabel,
  getWritingLanguageLabel,
  ARABIC_FONT_CLASS,
  ENGLISH_FONT_CLASS,
} from "@/lib/personalization";
import { cn } from "@/lib/utils";
import { PersonalizationFonts } from "@/components/dresses/PersonalizationFonts";
import { PersonalizationPreview } from "@/components/dresses/PersonalizationPreview";

interface PersonalizationSummaryProps {
  personalization: ProductPersonalization;
  title?: string;
  compact?: boolean;
}

export function PersonalizationSummary({
  personalization,
  title = "تفاصيل التخصيص",
  compact = false,
}: PersonalizationSummaryProps) {
  const {
    dress_name_ar,
    writing_language,
    text_ar,
    text_en,
    font_ar,
    font_en,
    color,
    position,
    product_type,
  } = personalization;

  return (
    <PersonalizationFonts className="rounded-2xl border border-gold/25 bg-beige/30 p-5 md:p-6">
      <div className="mb-4 flex items-center gap-2 text-gold">
        <Sparkles className="h-5 w-5" />
        <h3 className="font-semibold text-charcoal">{title}</h3>
      </div>

      <p className="mb-4 text-sm text-muted">
        المنتج:{" "}
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

      {compact && (text_ar || text_en) && (
        <div className="mb-4 text-center">
          {text_ar &&
            (writing_language === "ar" || writing_language === "both") && (
              <p
                dir="rtl"
                className={cn("text-xl", ARABIC_FONT_CLASS[font_ar])}
                style={{ color: getWritingColorHex(color) }}
              >
                {text_ar}
              </p>
            )}
          {text_en &&
            (writing_language === "en" || writing_language === "both") && (
              <p
                dir="ltr"
                className={cn("text-xl", ENGLISH_FONT_CLASS[font_en])}
                style={{ color: getWritingColorHex(color) }}
              >
                {text_en}
              </p>
            )}
        </div>
      )}

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">لغة الكتابة</dt>
          <dd className="font-medium text-charcoal">
            {getWritingLanguageLabel(writing_language)}
          </dd>
        </div>
        {(writing_language === "ar" || writing_language === "both") && (
          <div>
            <dt className="text-muted">خط العربية</dt>
            <dd className="font-medium text-charcoal">
              {getArabicFontLabel(font_ar)}
            </dd>
          </div>
        )}
        {(writing_language === "en" || writing_language === "both") && (
          <div>
            <dt className="text-muted">English Font</dt>
            <dd className="font-medium text-charcoal" dir="ltr">
              {getEnglishFontLabel(font_en)}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-muted">لون الكتابة</dt>
          <dd className="flex items-center gap-2 font-medium text-charcoal">
            <span
              className="inline-block h-3.5 w-3.5 rounded-full border border-beige-dark"
              style={{ backgroundColor: getWritingColorHex(color) }}
            />
            {getWritingColorLabel(color)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">موضع الكتابة</dt>
          <dd className="font-medium text-charcoal" dir="ltr">
            {getPositionLabel(position, product_type)}
          </dd>
        </div>
      </dl>
    </PersonalizationFonts>
  );
}
