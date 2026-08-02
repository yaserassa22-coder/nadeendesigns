"use client";

import { Gift } from "lucide-react";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { GIFT_BOX_OPTIONS, type GiftBoxType } from "@/lib/gift";
import { cn } from "@/lib/utils";

export interface GiftWrappingState {
  enabled: boolean;
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
}

function CheckboxRow({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id: string;
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
      <span className="text-sm font-medium text-charcoal md:text-base">
        {label}
      </span>
    </label>
  );
}

export function GiftWrappingSection({
  value,
  onChange,
  errors = {},
}: GiftWrappingSectionProps) {
  const update = <K extends keyof GiftWrappingState>(
    key: K,
    next: GiftWrappingState[K]
  ) => onChange({ ...value, [key]: next });

  return (
    <div className="space-y-5 rounded-3xl border border-beige-dark bg-ivory/80 p-5 md:p-7">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 text-gold">
          <Gift className="h-5 w-5" />
          <h3 className="text-xl font-bold text-charcoal md:text-2xl">
            🎁 تغليف وإهداء
          </h3>
        </div>
        <p className="text-sm text-muted">
          أضيفي لمسة فاخرة لطلبكِ — تغليف هدية وبطاقة إهداء اختياريان.
        </p>
      </div>

      <CheckboxRow
        id="gift-enabled"
        checked={value.enabled}
        onChange={(enabled) => update("enabled", enabled)}
        label="أرغب بإضافة تغليف هدية فاخر"
      />

      {value.enabled && (
        <div className="space-y-5 border-t border-beige-dark/80 pt-5">
          <Select
            label="نوع التغليف *"
            value={value.giftBox}
            onChange={(e) => update("giftBox", e.target.value as GiftBoxType)}
            options={GIFT_BOX_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            error={errors.gift_box}
          />

          <CheckboxRow
            id="gift-card"
            checked={value.giftCard}
            onChange={(giftCard) => update("giftCard", giftCard)}
            label="أريد إضافة بطاقة إهداء"
          />

          {value.giftCard && (
            <div>
              <Textarea
                label="رسالة الإهداء *"
                rows={4}
                maxLength={250}
                value={value.giftMessage}
                onChange={(e) =>
                  update("giftMessage", e.target.value.slice(0, 250))
                }
                placeholder="اكتبي رسالة الإهداء التي ترغبين بإرفاقها مع الطلب..."
                error={errors.gift_message}
              />
              <p className="mt-1 text-xs text-muted">
                {value.giftMessage.length}/250
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="من:"
              value={value.senderName}
              onChange={(e) => update("senderName", e.target.value)}
              placeholder="اسم المرسل"
              error={errors.sender_name}
            />
            <Input
              label="إلى:"
              value={value.recipientName}
              onChange={(e) => update("recipientName", e.target.value)}
              placeholder="اسم المستلم"
              error={errors.recipient_name}
            />
          </div>

          <CheckboxRow
            id="hide-price"
            checked={value.hidePrice}
            onChange={(hidePrice) => update("hidePrice", hidePrice)}
            label="لا تعرض الأسعار داخل الهدية"
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
