"use client";

import { Gift } from "lucide-react";
import type { GiftOptions } from "@/types";
import { getGiftBoxLabel } from "@/lib/gift";

interface GiftOptionsSummaryProps {
  giftOptions: GiftOptions | null;
  title?: string;
}

export function GiftOptionsSummary({
  giftOptions,
  title = "ملخص التغليف والإهداء",
}: GiftOptionsSummaryProps) {
  const enabled = Boolean(giftOptions?.enabled);

  return (
    <div className="rounded-2xl border border-gold/25 bg-beige/30 p-5 md:p-6">
      <div className="mb-4 flex items-center gap-2 text-gold">
        <Gift className="h-5 w-5" />
        <h3 className="font-semibold text-charcoal">{title}</h3>
      </div>

      <dl className="space-y-4 text-sm">
        <div>
          <dt className="text-muted">🎁 تغليف هدية</dt>
          <dd className="mt-1 font-medium text-charcoal">
            {enabled ? "✓ نعم" : "لا"}
            {enabled && giftOptions && (
              <span className="mt-1 block text-muted">
                {getGiftBoxLabel(giftOptions.gift_box)}
              </span>
            )}
          </dd>
        </div>

        {enabled && giftOptions && (
          <>
            <div>
              <dt className="text-muted">💌 بطاقة إهداء</dt>
              <dd className="mt-1 font-medium text-charcoal">
                {giftOptions.gift_card ? (
                  giftOptions.gift_message.trim() ? (
                    <p className="whitespace-pre-line leading-relaxed">
                      {giftOptions.gift_message}
                    </p>
                  ) : (
                    "✓ نعم"
                  )
                ) : (
                  "لا"
                )}
              </dd>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-muted">👤 من</dt>
                <dd className="mt-1 font-medium text-charcoal">
                  {giftOptions.sender_name.trim() || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">👤 إلى</dt>
                <dd className="mt-1 font-medium text-charcoal">
                  {giftOptions.recipient_name.trim() || "—"}
                </dd>
              </div>
            </div>

            <div>
              <dt className="text-muted">إخفاء الأسعار</dt>
              <dd className="mt-1 font-medium text-charcoal">
                {giftOptions.hide_price ? "✓ نعم" : "لا"}
              </dd>
            </div>
          </>
        )}
      </dl>
    </div>
  );
}
