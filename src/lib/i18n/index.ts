/** Client-safe i18n exports. Use `@/lib/i18n/server` for `getLocale()` in RSC. */
export type { Locale, LocaleDirection, Dictionary } from "./types";
export {
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_META,
  isLocale,
  parseLocale,
  normalizeEnabledLocales,
  resolveEnabledLocale,
  localeDir,
  localeHtmlLang,
  LOCALE_COOKIE_MAX_AGE,
} from "./config";
export { getDictionary, formatMessage } from "./dictionaries";
export { localizedName, localizedDescription } from "./localize";
export type { LocalizableNamed } from "./localize";
export {
  resolveCatalogLabel,
  resolveCategoryLabel,
  resolveCategoryDescription,
} from "./category-labels";
export {
  resolveDressColorLabel,
  resolveDressStyleLabel,
  resolveDressMaterialLabel,
  localizeArabicProductText,
} from "./attribute-labels";
export {
  getServiceTypeLabelLocalized,
} from "./service-labels";

export {
  getShopOrderStatusLabel,
  getDeliveryMethodLabel,
  shopOrderStatusLabels,
  deliveryMethodLabels,
  getOrderWorkflowActions,
} from "./order-labels";
export type { LocalizedWorkflowAction, OrderWorkflowActionKey } from "./order-labels";
