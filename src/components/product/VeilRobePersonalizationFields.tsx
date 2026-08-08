"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { Select, Textarea } from "@/components/ui/Input";
import { PersonalizationPreview } from "@/components/dresses/PersonalizationPreview";
import {
  arabicFontSelectOptions,
  englishFontFromPrimary,
  writingColorSelectOptions,
  type ArabicFont,
  type EnglishFont,
  type PersonalizationProductType,
  type WritingColor,
  type WritingLanguage,
  type WritingPosition,
} from "@/lib/products/personalization";
import { cn, formatPrice } from "@/lib/utils";
import { useLocale } from "@/components/i18n/LocaleProvider";

export type VeilRobePersonalizationState = {
  enabled: boolean;
  /** Stored for payload compatibility — UI no longer asks the customer. */
  writingLanguage: WritingLanguage;
  /** Free trilingual text (AR / HE / EN). Stored as text_ar in the payload. */
  textAr: string;
  textEn: string;
  fontAr: ArabicFont;
  fontEn: EnglishFont;
  color: WritingColor;
  /** Stored default — position picker removed from storefront. */
  position: WritingPosition;
};

type Props = {
  personalizationType: PersonalizationProductType;
  value: VeilRobePersonalizationState;
  onChange: (next: VeilRobePersonalizationState) => void;
  errors?: Record<string, string>;
  /** From experience_config.personalization_ui (Admin). */
  maxCharacters?: number;
  /** Admin personalization fee — shown when > 0. */
  extraPrice?: number;
  /** When true, personalization cannot be skipped. */
  required?: boolean;
  /** Feature library gates. */
  showFontSelection?: boolean;
  showColorSelection?: boolean;
  /** Hide sparkles title when parent accordion already shows it. */
  hideTitle?: boolean;
};

/**
 * Existing veil/robe personalization UI atoms — used inside ProductExperienceModal.
 * Storefront: one free-text field (trilingual). Language + position pickers removed;
 * payload still carries compatible defaults for cart / orders / admin.
 */
export function VeilRobePersonalizationFields({
  personalizationType,
  value,
  onChange,
  errors = {},
  maxCharacters = 25,
  extraPrice = 0,
  required = false,
  showFontSelection = true,
  showColorSelection = true,
  hideTitle = false,
}: Props) {
  const { t, locale } = useLocale();
  const maxLen = Math.max(1, Math.min(200, Math.floor(maxCharacters) || 25));
  const arFontOptions = useMemo(() => arabicFontSelectOptions(locale), [locale]);
  const colorOptions = useMemo(() => writingColorSelectOptions(locale), [locale]);
  const enabled = required ? true : value.enabled;

  const patch = (partial: Partial<VeilRobePersonalizationState>) =>
    onChange({
      ...value,
      ...partial,
      // Free-text mode: always persist as writing_language "ar" + text_ar.
      writingLanguage: "ar",
      textEn: "",
      ...(required ? { enabled: true } : {}),
    });

  const feeLabel =
    extraPrice > 0 ? `+${formatPrice(extraPrice)}` : null;

  return (
    <div className="space-y-5 rounded-3xl border border-beige-dark bg-ivory/70 p-5 md:p-6">
      {hideTitle ? (
        <p className="text-sm text-muted">
          {required ? t.personalizationUi.requiredHint : t.personalizationUi.optionalHint}
        </p>
      ) : (
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-gold">
            <Sparkles className="h-4 w-4" />
            <h3 className="text-lg font-semibold text-charcoal">
              {t.personalizationUi.formTitle}
            </h3>
          </div>
          <p className="text-sm text-muted">
            {required
              ? t.personalizationUi.requiredHint
              : t.personalizationUi.optionalHint}
          </p>
        </div>
      )}

      {!required ? (
        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-colors",
            value.enabled
              ? "border-gold/40 bg-gold/5"
              : "border-beige-dark bg-white hover:border-gold/30"
          )}
        >
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
            className="mt-1 h-4 w-4 accent-[var(--gold)]"
          />
          <span className="flex flex-1 flex-wrap items-baseline justify-between gap-2 text-sm font-medium text-charcoal md:text-base">
            <span>{t.personalizationUi.enableToggle}</span>
            {feeLabel ? (
              <span className="shrink-0 text-sm font-semibold text-gold" dir="ltr">
                {feeLabel}
              </span>
            ) : null}
          </span>
        </label>
      ) : feeLabel ? (
        <p className="rounded-2xl border border-gold/30 bg-gold/5 px-4 py-3 text-sm font-semibold text-gold" dir="ltr">
          {feeLabel}
        </p>
      ) : null}

      {enabled ? (
        <div className="space-y-5">
          <Textarea
            label={`${t.personalizationUi.textRequired} (${maxLen})`}
            value={value.textAr}
            maxLength={maxLen}
            rows={4}
            dir="auto"
            placeholder={t.personalizationUi.textPlaceholder}
            onChange={(e) => patch({ textAr: e.target.value.slice(0, maxLen) })}
            error={errors.text_ar}
          />
          <p className="text-xs text-muted">{t.personalizationUi.freeTextHint}</p>

          {showFontSelection ? (
            <Select
              label={t.personalizationUi.font}
              value={value.fontAr}
              onChange={(e) => {
                const fontAr = e.target.value as ArabicFont;
                patch({
                  fontAr,
                  fontEn: englishFontFromPrimary(fontAr),
                });
              }}
              options={arFontOptions}
            />
          ) : null}

          {showColorSelection ? (
            <div>
              <p className="mb-3 text-sm font-medium">{t.personalizationUi.writingColor}</p>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((opt) => (
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

          <PersonalizationPreview
            writingLanguage="ar"
            textAr={value.textAr}
            textEn=""
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
    enabled: false,
    writingLanguage: "ar",
    textAr: "",
    textEn: "",
    fontAr: "classic_ar",
    fontEn: "elegant_script",
    color: "gold",
    position: personalizationType === "robes" ? "back" : "bottom_corner",
  };
}
