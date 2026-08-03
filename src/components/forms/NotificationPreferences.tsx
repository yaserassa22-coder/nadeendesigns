"use client";

import { isValidCheckoutPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

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

/** Shared RTL notification channel picker for Checkout and Booking only. */
export function NotificationPreferences({
  value,
  onChange,
  error,
  idPrefix = "notify",
  className,
}: NotificationPreferencesProps) {
  return (
    <fieldset className={cn("space-y-3", className)}>
      <legend className="text-lg font-semibold text-charcoal">
        كيف ترغب باستلام تحديثات طلبك؟
      </legend>
      <p className="text-sm text-muted">اختاري قناة واحدة أو الاثنتين معًا.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <ChannelCheckbox
          id={`${idPrefix}-whatsapp`}
          checked={value.notify_whatsapp}
          onChange={(checked) =>
            onChange({ ...value, notify_whatsapp: checked })
          }
          label="WhatsApp"
        />
        <ChannelCheckbox
          id={`${idPrefix}-email`}
          checked={value.notify_email}
          onChange={(checked) => onChange({ ...value, notify_email: checked })}
          label="Email"
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

/** Client-side validation for selected channels. Returns Arabic error or null. */
export function validateNotificationPreferences(
  prefs: NotificationPreferenceValue,
  contact: { phone: string; email: string }
): string | null {
  if (!prefs.notify_whatsapp && !prefs.notify_email) {
    return "يرجى اختيار قناة واحدة على الأقل لاستلام التحديثات (WhatsApp أو Email)";
  }
  if (prefs.notify_whatsapp && !isValidCheckoutPhone(contact.phone)) {
    return "رقم واتساب غير صالح — أدخلي رقم هاتف صحيح لاستلام التحديثات عبر WhatsApp";
  }
  if (prefs.notify_email) {
    const email = contact.email.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "البريد الإلكتروني مطلوب وصالح عند اختيار التحديثات عبر Email";
    }
  }
  return null;
}
