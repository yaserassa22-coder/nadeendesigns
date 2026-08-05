"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { PersonalizationPreview } from "@/components/dresses/PersonalizationPreview";
import {
  ARABIC_FONT_OPTIONS,
  ENGLISH_FONT_OPTIONS,
  getPersonalizationPositionOptions,
  WRITING_COLOR_OPTIONS,
  WRITING_LANGUAGE_OPTIONS,
  type ArabicFont,
  type EnglishFont,
  type PersonalizationProductType,
  type WritingColor,
  type WritingLanguage,
  type WritingPosition,
} from "@/lib/products/personalization";
import { cn } from "@/lib/utils";

export type VeilRobePersonalizationState = {
  enabled: boolean;
  writingLanguage: WritingLanguage;
  textAr: string;
  textEn: string;
  fontAr: ArabicFont;
  fontEn: EnglishFont;
  color: WritingColor;
  position: WritingPosition;
};

type Props = {
  personalizationType: PersonalizationProductType;
  value: VeilRobePersonalizationState;
  onChange: (next: VeilRobePersonalizationState) => void;
  errors?: Record<string, string>;
  /** From experience_config.personalization_ui (Admin). */
  maxCharacters?: number;
  /** When true, personalization cannot be skipped. */
  required?: boolean;
  /** Feature library gates. */
  showFontSelection?: boolean;
  showColorSelection?: boolean;
};

/**
 * Existing veil/robe personalization UI atoms — used inside ProductExperienceModal.
 * Does not rewrite validation/business logic (validate via validatePersonalization).
 */
export function VeilRobePersonalizationFields({
  personalizationType,
  value,
  onChange,
  errors = {},
  maxCharacters = 25,
  required = false,
  showFontSelection = true,
  showColorSelection = true,
}: Props) {
  const maxLen = Math.max(1, Math.min(200, Math.floor(maxCharacters) || 25));
  const positionOptions = useMemo(
    () => getPersonalizationPositionOptions(personalizationType),
    [personalizationType]
  );
  const showArabic =
    value.writingLanguage === "ar" || value.writingLanguage === "both";
  const showEnglish =
    value.writingLanguage === "en" || value.writingLanguage === "both";
  const enabled = required ? true : value.enabled;

  const patch = (partial: Partial<VeilRobePersonalizationState>) =>
    onChange({
      ...value,
      ...partial,
      ...(required ? { enabled: true } : {}),
    });

  return (
    <div className="space-y-5 rounded-3xl border border-beige-dark bg-ivory/70 p-5 md:p-6">
      <div>
        <div className="mb-1 inline-flex items-center gap-2 text-gold">
          <Sparkles className="h-4 w-4" />
          <h3 className="text-lg font-semibold text-charcoal">تخصيص الكتابة</h3>
        </div>
        <p className="text-sm text-muted">
          {required
            ? "التخصيص مطلوب لهذا المنتج."
            : "خصّصي النص على المنتج إن رغبتِ — أو أكملي الشراء بدون تخصيص."}
        </p>
      </div>

      {!required ? (
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-beige-dark bg-white px-4 py-3">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
            className="accent-[var(--gold)]"
          />
          <span className="text-sm font-medium">
            أريد تخصيص الكتابة على المنتج
          </span>
        </label>
      ) : null}

      {enabled ? (
        <div className="space-y-5">
          <Select
            label="لغة الكتابة *"
            value={value.writingLanguage}
            onChange={(e) =>
              patch({ writingLanguage: e.target.value as WritingLanguage })
            }
            options={WRITING_LANGUAGE_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />

          {value.writingLanguage === "both" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={`الاسم أو النص بالعربية (حتى ${maxLen})`}
                value={value.textAr}
                maxLength={maxLen}
                dir="rtl"
                onChange={(e) =>
                  patch({ textAr: e.target.value.slice(0, maxLen) })
                }
                error={errors.text_ar}
              />
              <Input
                label={`Name or Text in English (max ${maxLen})`}
                value={value.textEn}
                maxLength={maxLen}
                dir="ltr"
                onChange={(e) =>
                  patch({ textEn: e.target.value.slice(0, maxLen) })
                }
                error={errors.text_en}
              />
            </div>
          ) : value.writingLanguage === "ar" ? (
            <Input
              label={`الاسم أو النص بالعربية * (حتى ${maxLen})`}
              value={value.textAr}
              maxLength={maxLen}
              dir="rtl"
              onChange={(e) =>
                patch({ textAr: e.target.value.slice(0, maxLen) })
              }
              error={errors.text_ar}
            />
          ) : (
            <Input
              label={`Name or Text in English * (max ${maxLen})`}
              value={value.textEn}
              maxLength={maxLen}
              dir="ltr"
              onChange={(e) =>
                patch({ textEn: e.target.value.slice(0, maxLen) })
              }
              error={errors.text_en}
            />
          )}

          {showFontSelection ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {showArabic ? (
                <Select
                  label="خط العربية"
                  value={value.fontAr}
                  onChange={(e) =>
                    patch({ fontAr: e.target.value as ArabicFont })
                  }
                  options={ARABIC_FONT_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                />
              ) : null}
              {showEnglish ? (
                <Select
                  label="English Font"
                  value={value.fontEn}
                  dir="ltr"
                  onChange={(e) =>
                    patch({ fontEn: e.target.value as EnglishFont })
                  }
                  options={ENGLISH_FONT_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                />
              ) : null}
            </div>
          ) : null}

          {showColorSelection ? (
            <div>
              <p className="mb-3 text-sm font-medium">لون الكتابة</p>
              <div className="flex flex-wrap gap-2">
                {WRITING_COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => patch({ color: opt.value })}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-2 text-sm",
                      value.color === opt.value
                        ? "border-gold bg-gold/10"
                        : "border-beige-dark bg-white"
                    )}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border"
                      style={{ backgroundColor: opt.hex }}
                    />
                    <span dir="ltr">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <Select
            label="موضع الكتابة"
            value={value.position}
            dir="ltr"
            onChange={(e) =>
              patch({ position: e.target.value as WritingPosition })
            }
            options={positionOptions.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />

          <PersonalizationPreview
            writingLanguage={value.writingLanguage}
            textAr={value.textAr}
            textEn={value.textEn}
            fontAr={value.fontAr}
            fontEn={value.fontEn}
            color={value.color}
          />
        </div>
      ) : null}
    </div>
  );
}

export function defaultVeilRobePersonalizationState(
  personalizationType: PersonalizationProductType
): VeilRobePersonalizationState {
  return {
    enabled: true,
    writingLanguage: "ar",
    textAr: "",
    textEn: "",
    fontAr: "classic_ar",
    fontEn: "elegant_script",
    color: "gold",
    position: personalizationType === "robes" ? "back" : "bottom_corner",
  };
}
