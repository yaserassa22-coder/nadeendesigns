import { createHash, randomInt, timingSafeEqual } from "crypto";
import { phoneDigits } from "@/lib/phone";

export function hashOtpCode(code: string, salt = "nadeen-otp"): string {
  return createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function safeEqualHash(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Build E.164-ish from country dial + local number. */
export function toE164(dialCode: string, localPhone: string): string | null {
  const dial = dialCode.replace(/\D/g, "");
  let local = phoneDigits(localPhone);
  if (!dial || local.length < 7) return null;

  // Drop leading 0 on local mobiles (IL/PS/JO common)
  if (local.startsWith("0")) local = local.slice(1);

  // Avoid double country code
  if (local.startsWith(dial)) {
    return `+${local}`;
  }
  return `+${dial}${local}`;
}

export function normalizeDestinationPhone(phone: string): string {
  const digits = phoneDigits(phone);
  if (digits.startsWith("0") && digits.length === 10) {
    return `+972${digits.slice(1)}`;
  }
  if (digits.startsWith("972") || digits.startsWith("970")) {
    return `+${digits}`;
  }
  if (phone.trim().startsWith("+")) return `+${digits}`;
  return `+${digits}`;
}

/** Synthetic email so phone-only customers can use Supabase Auth sessions. */
export function syntheticEmailFromPhone(e164: string): string {
  const digits = phoneDigits(e164);
  return `phone.${digits}@customers.nadeendesigns.local`;
}

/** Matches admin overlay keys: `p:{phone}` or `e:{email}`. */
export function customerKeyFromContact(
  phone?: string | null,
  email?: string | null
): string | null {
  const p = phone?.trim();
  if (p) return `p:${p}`;
  const e = email?.trim()?.toLowerCase();
  if (e) return `e:${e}`;
  return null;
}

export function referralCodeFromId(id: string): string {
  return `ND${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}
