"use client";

import { isValidCheckoutPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

export type NotificationPreferenceValue = {
  notify_whatsapp: boolean;
  notify_email: boolean;
};

interface NotificationPreferencesProps {
  value: NotificationPreferenceValue;
  onChange: (next: NotificationPreferenceValue) => void;
  error?: string;
  /** Prefix for checkbox ids when multiple forms could mount */
  idPrefix?: string;
  className?: string;
}

function ChannelCheckbox({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
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
        className="h-4 w-4 shrink-0 accent-[var(--gold)]"
      />
      <span className="text-sm font-medium text-charcoal">{label}</span>
    </label>
  );
}

/** Shared notification channel picker for Checkout and Booking. */
export function NotificationPreferences({
  value,
  onChange,
  error,
  idPrefix = "notify",
  className,
}: NotificationPreferencesProps) {
  const { t } = useLocale();
  return (
    <fieldset className={cn("space-y-3", className)}>
      <legend className="text-lg font-semibold text-charcoal">
        {t.notify.title}
      </legend>
      <p className="text-sm text-muted">{t.notify.hint}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <ChannelCheckbox
          id={`${idPrefix}-whatsapp`}
          checked={value.notify_whatsapp}
          onChange={(checked) =>
            onChange({ ...value, notify_whatsapp: checked })
          }
          label={t.notify.whatsapp}
        />
        <ChannelCheckbox
          id={`${idPrefix}-email`}
          checked={value.notify_email}
          onChange={(checked) => onChange({ ...value, notify_email: checked })}
          label={t.notify.email}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Client-side validation for selected channels. Returns localized error or null. */
export function validateNotificationPreferences(
  prefs: NotificationPreferenceValue,
  contact: { phone: string; email: string },
  locale: Locale = "ar"
): string | null {
  const t = getDictionary(locale).notify.errors;
  if (!prefs.notify_whatsapp && !prefs.notify_email) {
    return t.channelRequired;
  }
  if (prefs.notify_whatsapp && !isValidCheckoutPhone(contact.phone)) {
    return t.invalidWhatsapp;
  }
  if (prefs.notify_email) {
    const email = contact.email.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return t.emailRequired;
    }
  }
  return null;
}
