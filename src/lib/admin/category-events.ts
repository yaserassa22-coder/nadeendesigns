/** Fired after admin category create/update/delete so the sidebar tree refetches. */
export const ADMIN_CATEGORIES_CHANGED_EVENT = "admin:categories-changed";

export function notifyAdminCategoriesChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ADMIN_CATEGORIES_CHANGED_EVENT));
}
