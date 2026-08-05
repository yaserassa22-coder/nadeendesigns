/** localStorage draft key for dress product editor (P1.1). */
export function productDraftStorageKey(productId: string | "new"): string {
  return `nadeen:dress-draft:${productId}`;
}

export type AutosaveUiStatus = "idle" | "saving" | "saved" | "failed";

export const AUTOSAVE_STATUS_LABEL: Record<AutosaveUiStatus, string> = {
  idle: "",
  saving: "جاري الحفظ…",
  saved: "تم الحفظ",
  failed: "فشل الحفظ",
};
