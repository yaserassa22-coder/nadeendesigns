/** Eastern Arabic (٠-٩) and Persian/Urdu (۰-۹) digits → Western 0-9. */
export function toWesternDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (ch) => {
    const code = ch.charCodeAt(0);
    // Eastern Arabic: U+0660–U+0669
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    // Persian: U+06F0–U+06F9
    if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);
    return ch;
  });
}

/** Digits only (Western), after converting Arabic/Persian numerals. */
export function phoneDigits(phone: string): string {
  return toWesternDigits(phone).replace(/\D/g, "");
}

/**
 * Accept Israeli mobiles (05x, +972, 972…) and other intl numbers with ≥9 digits.
 * Formatting (spaces, dashes, parentheses) is ignored.
 */
export function isValidCheckoutPhone(phone: string): boolean {
  const digits = phoneDigits(phone);
  if (digits.length < 9 || digits.length > 15) return false;

  // Israel local: 05xxxxxxxx
  if (digits.startsWith("05") && digits.length === 10) return true;
  // Israel / Palestine E.164 without +
  if (
    (digits.startsWith("972") || digits.startsWith("970")) &&
    digits.length >= 11 &&
    digits.length <= 13
  ) {
    return true;
  }
  // Mobile without leading 0: 5xxxxxxxx
  if (digits.startsWith("5") && digits.length === 9) return true;
  // Generic international
  return digits.length >= 9;
}

/** Whitespace-only trim — never strips Arabic/Hebrew letters. */
export function normalizePersonName(value: string): string {
  return value.replace(/^\s+|\s+$/gu, "");
}

export function isValidPersonName(value: string): boolean {
  return normalizePersonName(value).length >= 2;
}
