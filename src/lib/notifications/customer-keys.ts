import { phoneDigits } from "@/lib/phone";

/** Client-safe notification row shape (no server / Node imports). */
export type CustomerNotification = {
  id: string;
  order_id: string | null;
  customer_key: string | null;
  title_ar: string;
  body_ar: string;
  order_status: string | null;
  href: string | null;
  is_read: boolean;
  created_at: string;
};

/** Matches admin overlay keys: `p:{phone}` or `e:{email}`. */
function contactKey(
  phone?: string | null,
  email?: string | null
): string | null {
  const p = phone?.trim();
  if (p) return `p:${p}`;
  const e = email?.trim()?.toLowerCase();
  if (e) return `e:${e}`;
  return null;
}

/** All keys Account / bell may look up for a booking contact. */
export function bookingNotificationKeys(input: {
  phone?: string | null;
  email?: string | null;
  customerKey?: string | null;
}): string[] {
  const keys = new Set<string>();
  const add = (k: string | null | undefined) => {
    const v = k?.trim();
    if (v) keys.add(v);
  };

  add(input.customerKey);
  add(contactKey(input.phone, input.email));
  add(contactKey(input.phone, null));
  add(contactKey(null, input.email));

  const digits = phoneDigits(input.phone || "");
  if (digits.length >= 9) {
    add(`p:${digits}`);
    if (digits.startsWith("05") && digits.length === 10) {
      add(`p:972${digits.slice(1)}`);
    }
    if (digits.startsWith("972") && digits.length >= 11) {
      add(`p:0${digits.slice(3)}`);
    }
    if (digits.startsWith("5") && digits.length === 9) {
      add(`p:0${digits}`);
      add(`p:972${digits}`);
    }
  }

  return [...keys];
}
