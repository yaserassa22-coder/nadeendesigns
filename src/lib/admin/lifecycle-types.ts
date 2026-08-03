export type LifecycleModule =
  | "orders"
  | "bookings"
  | "dresses"
  | "veils"
  | "bridal_robes"
  | "categories"
  | "messages"
  | "notification_logs"
  | "customer_notifications"
  | "shipping_regions"
  | "gallery"
  | "customers";

export type LifecycleAction =
  | "create"
  | "edit"
  | "archive"
  | "unarchive"
  | "soft_delete"
  | "restore"
  | "permanent_delete";

export type ListVisibility = "active" | "archived" | "deleted" | "all";

export const MODULE_TABLE: Record<LifecycleModule, string> = {
  orders: "shop_orders",
  bookings: "bookings",
  dresses: "dresses",
  veils: "veils",
  bridal_robes: "bridal_robes",
  categories: "categories",
  messages: "contact_messages",
  notification_logs: "notification_logs",
  customer_notifications: "customer_notifications",
  shipping_regions: "shipping_regions",
  gallery: "gallery_items",
  customers: "customer_admin_state",
};

export const MODULE_LABEL_AR: Record<LifecycleModule, string> = {
  orders: "الطلبات",
  bookings: "الحجوزات",
  dresses: "الفساتين",
  veils: "طرحة العروس",
  bridal_robes: "برنص العروس",
  categories: "التصنيفات",
  messages: "الرسائل",
  notification_logs: "سجل الإشعارات",
  customer_notifications: "إشعارات العملاء",
  shipping_regions: "مناطق الشحن",
  gallery: "المعرض",
  customers: "العملاء",
};

export const CUSTOMER_KEY_COLUMN = "customer_key";
