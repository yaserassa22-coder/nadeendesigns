/** Fired when Admin inbox counters should refresh (mark read / delete / archive). */
export const ADMIN_INBOX_CHANGED_EVENT = "nadeen:admin-inbox-changed";

export function notifyAdminInboxChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_INBOX_CHANGED_EVENT));
}
