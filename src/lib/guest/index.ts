export {
  GUEST_COOKIE_NAME,
  GUEST_COOKIE_MAX_AGE,
  GUEST_UUID_RE,
} from "./constants";
export {
  generateGuestId,
  isValidGuestId,
  normalizeGuestId,
} from "./id";
export {
  ensureGuestCustomer,
  readGuestIdFromCookies,
  readGuestIdFromRequest,
  applyGuestCookie,
  clearGuestCookie,
  markGuestConverted,
  guestCookieOptions,
  type GuestRow,
} from "./session";
export {
  mergeGuestIntoCustomer,
  takeGuestCartItems,
  type GuestMergeDetail,
} from "./merge";
export { rateLimitGuest, guestRateKey } from "./rate-limit";
