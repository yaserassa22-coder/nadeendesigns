import { GUEST_UUID_RE } from "./constants";

/** Cryptographically secure UUID v4 for guest identity. */
export function generateGuestId(): string {
  return crypto.randomUUID();
}

export function isValidGuestId(value: unknown): value is string {
  return typeof value === "string" && GUEST_UUID_RE.test(value.trim());
}

export function normalizeGuestId(value: unknown): string | null {
  if (!isValidGuestId(value)) return null;
  return value.trim().toLowerCase();
}
