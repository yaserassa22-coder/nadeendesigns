"use client";

import {
  ARABIC_FONT_CLASS,
  ENGLISH_FONT_CLASS,
  getWritingColorHex,
  type ArabicFont,
  type EnglishFont,
  type WritingColor,
  type WritingLanguage,
} from "@/lib/personalization";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/LocaleProvider";

interface PersonalizationPreviewProps {
  writingLanguage: WritingLanguage;
  textAr: string;
  textEn: string;
  fontAr: ArabicFont;
  fontEn: EnglishFont;
  color: WritingColor;
}

export function PersonalizationPreview({
  writingLanguage,
  textAr,
  textEn,
  fontAr,
  fontEn,
  color,
}: PersonalizationPreviewProps) {
  const { t } = useLocale();
  const showAr =
    (writingLanguage === "ar" || writingLanguage === "both") && textAr.trim();
  const showEn =
    (writingLanguage === "en" || writingLanguage === "both") && textEn.trim();
  const hex = getWritingColorHex(color);
  const onDark = color === "white" || color === "champagne" || color === "silver";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-gold/25 px-6 py-10 text-center",
        onDark ? "bg-charcoal" : "bg-beige/50"
      )}
    >
      <p className="mb-6 font-[family-name:var(--font-cormorant)] text-xs tracking-[0.3em] text-gold uppercase">
        Preview
      </p>

      {!showAr && !showEn ? (
        <p className="text-sm text-muted">{t.personalizationUi.previewEmpty}</p>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3">
          {showAr && (
            <p
              dir="auto"
              className={cn(
                "whitespace-pre-wrap text-3xl leading-relaxed md:text-4xl",
                ARABIC_FONT_CLASS[fontAr]
              )}
              style={{ color: hex }}
            >
              {textAr}
            </p>
          )}
          {showEn && (
            <p
              dir="ltr"
              className={cn(
                "whitespace-pre-wrap text-3xl leading-relaxed tracking-wide md:text-4xl",
                ENGLISH_FONT_CLASS[fontEn]
              )}
              style={{ color: hex }}
            >
              {textEn}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
