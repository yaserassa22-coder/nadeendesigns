"use client";

import { Gift } from "lucide-react";
import type { GiftOptions } from "@/types";
import { getGiftBoxLabel } from "@/lib/gift";
import { useLocale } from "@/components/i18n/LocaleProvider";

interface GiftOptionsSummaryProps {
  giftOptions: GiftOptions | null;
  title?: string;
}

export function GiftOptionsSummary({
  giftOptions,
  title,
}: GiftOptionsSummaryProps) {
  const { t, locale } = useLocale();
  const enabled = Boolean(giftOptions?.enabled);
  const heading = title ?? t.gift.summaryTitle;

  return (
    <div className="rounded-2xl border border-gold/25 bg-beige/30 p-5 md:p-6">
      <div className="mb-4 flex items-center gap-2 text-gold">
        <Gift className="h-5 w-5" />
        <h3 className="font-semibold text-charcoal">{heading}</h3>
      </div>

      <dl className="space-y-4 text-sm">
        <div>
          <dt className="text-muted">{t.gift.wrapping}</dt>
          <dd className="mt-1 font-medium text-charcoal">
            {enabled ? t.gift.yes : t.gift.no}
            {enabled && giftOptions ? (
              <span className="mt-1 block text-muted">
                {getGiftBoxLabel(giftOptions.gift_box, locale)}
              </span>
            ) : null}
          </dd>
        </div>

        {enabled && giftOptions ? (
          <>
            <div>
              <dt className="text-muted">{t.gift.giftCard}</dt>
              <dd className="mt-1 font-medium text-charcoal">
                {giftOptions.gift_card ? (
                  giftOptions.gift_message.trim() ? (
                    <p className="whitespace-pre-line leading-relaxed">
                      {giftOptions.gift_message}
                    </p>
                  ) : (
                    t.gift.yes
                  )
                ) : (
                  t.gift.no
                )}
              </dd>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-muted">{t.gift.from}</dt>
                <dd className="mt-1 font-medium text-charcoal">
                  {giftOptions.sender_name.trim() || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">{t.gift.to}</dt>
                <dd className="mt-1 font-medium text-charcoal">
                  {giftOptions.recipient_name.trim() || "—"}
                </dd>
              </div>
            </div>

            <div>
              <dt className="text-muted">{t.gift.hidePrices}</dt>
              <dd className="mt-1 font-medium text-charcoal">
                {giftOptions.hide_price ? t.gift.yes : t.gift.no}
              </dd>
            </div>
          </>
        ) : null}
      </dl>
    </div>
  );
}
