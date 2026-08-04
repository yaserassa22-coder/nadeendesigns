/** Cookie holds only the opaque guest UUID — never secrets or PII. */
export const GUEST_COOKIE_NAME = "guest_id";

/** 365 days in seconds */
export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const GUEST_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
