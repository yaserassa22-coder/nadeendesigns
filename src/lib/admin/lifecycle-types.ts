export type LifecycleModule =
  | "orders"
  | "bookings"
  | "dresses"
  | "veils"
  | "bridal_robes"
  | "accessory_items"
  | "categories"
  | "messages"
  | "notification_logs"
  | "customer_notifications"
  | "shipping_regions"
  | "gallery"
  | "worn_by_you"
  | "customers"
  | "reports"
  | "administrators";

export type LifecycleAction =
  | "create"
  | "edit"
  | "archive"
  | "unarchive"
  | "soft_delete"
  | "restore"
  | "permanent_delete"
  | "report_generated"
  | "report_exported"
  | "report_printed"
  | "report_emailed"
  | "force_override"
  | "appointment_status"
  | "promote"
  | "demote"
  | "disable"
  | "enable";

export type ListVisibility = "active" | "archived" | "deleted" | "all";

export const MODULE_TABLE: Record<LifecycleModule, string> = {
  orders: "shop_orders",
  bookings: "bookings",
  dresses: "dresses",
  veils: "veils",
  bridal_robes: "bridal_robes",
  accessory_items: "accessory_items",
  categories: "categories",
  messages: "contact_messages",
  notification_logs: "notification_logs",
  customer_notifications: "customer_notifications",
  shipping_regions: "shipping_regions",
  gallery: "gallery_items",
  worn_by_you: "worn_by_you_items",
  customers: "customer_admin_state",
  reports: "report_schedules",
  administrators: "profiles",
};

export const MODULE_LABEL_AR: Record<LifecycleModule, string> = {
  orders: "الطلبات",
  bookings: "الحجوزات",
  dresses: "الفساتين",
  veils: "طرحة العروس",
  bridal_robes: "برنص العروس",
  accessory_items: "إكسسوارات أخرى",
  categories: "التصنيفات",
  messages: "الرسائل",
  notification_logs: "سجل الإشعارات",
  customer_notifications: "إشعارات العملاء",
  shipping_regions: "مناطق الشحن",
  gallery: "المعرض",
  worn_by_you: "Worn by You",
  customers: "العملاء",
  reports: "التقارير",
  administrators: "المسؤولون",
};

export const CUSTOMER_KEY_COLUMN = "customer_key";
