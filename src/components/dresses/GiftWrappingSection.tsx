"use client";

import { Gift } from "lucide-react";
import { Input, Textarea } from "@/components/ui/Input";
import type { GiftBoxType } from "@/lib/gift";
import { cn, formatPrice } from "@/lib/utils";
import { useLocale } from "@/components/i18n/LocaleProvider";

export interface GiftWrappingState {
  enabled: boolean;
  /** Fixed default — wrapping-type picker removed from storefront. */
  giftBox: GiftBoxType;
  giftCard: boolean;
  giftMessage: string;
  senderName: string;
  recipientName: string;
  hidePrice: boolean;
}

interface GiftWrappingSectionProps {
  value: GiftWrappingState;
  onChange: (next: GiftWrappingState) => void;
  errors?: Record<string, string>;
  /** Admin-entered wrap fee (shown when > 0). */
  wrapPrice?: number;
  /** Admin-entered gift-card fee (shown when > 0). */
  cardPrice?: number;
}

function CheckboxRow({
  checked,
  onChange,
  label,
  id,
  feeLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id: string;
  feeLabel?: string | null;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-colors",
        checked
          ? "border-gold/40 bg-gold/5"
          : "border-beige-dark bg-white hover:border-gold/30"
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-[var(--gold)]"
      />
      <span className="flex flex-1 flex-wrap items-baseline justify-between gap-2 text-sm font-medium text-charcoal md:text-base">
        <span>{label}</span>
        {feeLabel ? (
          <span className="text-xs font-normal text-gold" dir="ltr">
            {feeLabel}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function GiftWrappingSection({
  value,
  onChange,
  errors = {},
  wrapPrice = 0,
  cardPrice = 0,
}: GiftWrappingSectionProps) {
  const { t } = useLocale();
  const update = <K extends keyof GiftWrappingState>(
    key: K,
    next: GiftWrappingState[K]
  ) => onChange({ ...value, [key]: next });

  const wrapFee =
    wrapPrice > 0 ? `+${formatPrice(wrapPrice)}` : null;
  const cardFee =
    cardPrice > 0 ? `+${formatPrice(cardPrice)}` : null;

  return (
    <div className="space-y-5 rounded-3xl border border-beige-dark bg-ivory/80 p-5 md:p-7">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 text-gold">
          <Gift className="h-5 w-5" />
          <h3 className="text-xl font-bold text-charcoal md:text-2xl">
            {t.gift.sectionTitle}
          </h3>
        </div>
        <p className="text-sm text-muted">{t.gift.sectionHint}</p>
      </div>

      <CheckboxRow
        id="gift-enabled"
        checked={value.enabled}
        onChange={(enabled) => update("enabled", enabled)}
        label={t.gift.enableWrapping}
        feeLabel={wrapFee}
      />

      {value.enabled && (
        <div className="space-y-5 border-t border-beige-dark/80 pt-5">
          <CheckboxRow
            id="gift-card"
            checked={value.giftCard}
            onChange={(giftCard) => update("giftCard", giftCard)}
            label={t.gift.enableGiftCard}
            feeLabel={cardFee}
          />

          {value.giftCard && (
            <div>
              <Textarea
                label={t.gift.giftMessage}
                rows={4}
                maxLength={250}
                value={value.giftMessage}
                onChange={(e) =>
                  update("giftMessage", e.target.value.slice(0, 250))
                }
                placeholder={t.gift.giftMessagePlaceholder}
                error={errors.gift_message}
              />
              <p className="mt-1 text-xs text-muted">
                {value.giftMessage.length}/250
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={`${t.gift.from}:`}
              value={value.senderName}
              onChange={(e) => update("senderName", e.target.value)}
              placeholder={t.gift.fromPlaceholder}
              error={errors.sender_name}
            />
            <Input
              label={`${t.gift.to}:`}
              value={value.recipientName}
              onChange={(e) => update("recipientName", e.target.value)}
              placeholder={t.gift.toPlaceholder}
              error={errors.recipient_name}
            />
          </div>

          <CheckboxRow
            id="hide-price"
            checked={value.hidePrice}
            onChange={(hidePrice) => update("hidePrice", hidePrice)}
            label={t.gift.hidePricesInside}
          />
        </div>
      )}
    </div>
  );
}

export const DEFAULT_GIFT_STATE: GiftWrappingState = {
  enabled: false,
  giftBox: "standard",
  giftCard: false,
  giftMessage: "",
  senderName: "",
  recipientName: "",
  hidePrice: false,
};
