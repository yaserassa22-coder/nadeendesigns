/**
 * Client cookie-consent helpers (storefront).
 * Necessary cookies are never blocked; analytics require Accept (or banner off).
 */

export const CONSENT_COOKIE = "nd_cookie_consent";
export const CONSENT_STORAGE_KEY = "nd_cookie_consent";
export const CONSENT_VERSION = 1;
export const CONSENT_CHANGED_EVENT = "nd-cookie-consent-changed";

export type CookieConsentChoice = "accepted" | "declined";

export type CookieConsentPayload = {
  v: number;
  necessary: true;
  analytics: boolean;
  choice: CookieConsentChoice;
  decidedAt: string;
};

function isValidConsent(raw: unknown): raw is CookieConsentPayload {
  if (!raw || typeof raw !== "object") return false;
  const p = raw as Partial<CookieConsentPayload>;
  if (p.v !== CONSENT_VERSION || p.necessary !== true) return false;
  if (p.choice !== "accepted" && p.choice !== "declined") return false;
  return typeof p.analytics === "boolean";
}

function isLegacyAccepted(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const p = raw as { v?: number; necessary?: boolean; acceptedAt?: string };
  return p.v === CONSENT_VERSION && p.necessary === true && Boolean(p.acceptedAt);
}

function tryParse(text: string | null): CookieConsentPayload | "legacy" | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (isValidConsent(parsed)) return parsed;
    if (isLegacyAccepted(parsed)) return "legacy";
  } catch {
    /* ignore */
  }
  return null;
}

export function readCookieConsent(): CookieConsentPayload | "legacy" | null {
  if (typeof window === "undefined") return null;
  try {
    const fromStorage = tryParse(
      window.localStorage.getItem(CONSENT_STORAGE_KEY)
    );
    if (fromStorage) return fromStorage;
  } catch {
    /* ignore */
  }
  try {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`)
    );
    if (!match?.[1]) return null;
    return tryParse(decodeURIComponent(match[1]));
  } catch {
    /* ignore */
  }
  return null;
}

export function persistCookieConsent(payload: CookieConsentPayload) {
  const raw = JSON.stringify(payload);
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, raw);
  } catch {
    /* ignore */
  }
  const maxAge = 365 * 24 * 60 * 60;
  document.cookie = [
    `${CONSENT_COOKIE}=${encodeURIComponent(raw)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "SameSite=Lax",
  ].join("; ");
  try {
    window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

/** True when visitor allowed analytics cookies (or legacy Accept). */
export function hasAnalyticsConsent(): boolean {
  const c = readCookieConsent();
  if (!c) return false;
  if (c === "legacy") return true;
  return c.choice === "accepted" && c.analytics === true;
}

/**
 * Whether storefront may load GA/Pixel scripts.
 * - Banner on: only after Accept
 * - Banner off: when admin activated the provider (merchant responsibility)
 */
export function mayLoadAnalyticsScripts(opts: {
  bannerEnabled: boolean;
}): boolean {
  if (opts.bannerEnabled) return hasAnalyticsConsent();
  return true;
}
