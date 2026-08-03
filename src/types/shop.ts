import type { GiftOptions, ProductPersonalization } from "@/types/customization";

export interface Veil {
  id: string;
  name_ar: string;
  description_ar: string;
  price: number;
  images: string[];
  category: string;
  color: string | null;
  material: string | null;
  stock_quantity: number;
  is_available: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface BridalRobe {
  id: string;
  name_ar: string;
  description_ar: string;
  price: number;
  images: string[];
  color: string | null;
  size: string | null;
  material: string | null;
  stock_quantity: number;
  is_featured: boolean;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export type ShopProductType = "veil" | "bridal_robe" | "dress";

export interface CartItem {
  line_id: string;
  product_type: ShopProductType;
  product_id: string;
  name_ar: string;
  unit_price: number;
  quantity: number;
  image?: string;
  personalization: ProductPersonalization | null;
  gift_options: GiftOptions | null;
  /**
   * Explicit shipping flag for future accessory products.
   * Defaults via product_type when omitted (veil/bridal_robe → ship).
   */
  requires_shipping?: boolean;
}

/** Full boutique order workflow */
export type ShopOrderStatus =
  | "pending"
  | "under_review"
  | "confirmed"
  | "awaiting_payment"
  | "payment_received"
  | "in_production"
  | "ready_for_pickup"
  | "shipped"
  | "delivered"
  | "cancelled"
  /** legacy */
  | "completed";

export const SHOP_ORDER_STATUSES: ShopOrderStatus[] = [
  "pending",
  "under_review",
  "confirmed",
  "awaiting_payment",
  "payment_received",
  "in_production",
  "ready_for_pickup",
  "shipped",
  "delivered",
  "cancelled",
];

export const SHOP_ORDER_STATUS_LABELS: Record<ShopOrderStatus, string> = {
  pending: "تم استلام الطلب",
  under_review: "قيد المراجعة",
  confirmed: "تم تأكيد الطلب",
  awaiting_payment: "بانتظار الدفعة",
  payment_received: "تم استلام الدفعة",
  in_production: "قيد التنفيذ",
  ready_for_pickup: "جاهز للاستلام",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "تم الإلغاء",
  completed: "مكتمل",
};

/** Statuses that trigger a dedicated customer email template */
export const CUSTOMER_EMAIL_STATUSES: ShopOrderStatus[] = [
  "pending",
  "confirmed",
  "payment_received",
  "in_production",
  "ready_for_pickup",
  "shipped",
  "delivered",
  "cancelled",
];

export type OrderWorkflowAction =
  | "under_review"
  | "confirm"
  | "request_payment"
  | "payment_received"
  | "start_production"
  | "ready"
  | "ship"
  | "deliver"
  | "cancel";

export const ORDER_WORKFLOW_ACTIONS: {
  action: OrderWorkflowAction;
  label: string;
  status: ShopOrderStatus;
  tone?: "default" | "danger" | "gold";
}[] = [
  { action: "under_review", label: "قيد المراجعة", status: "under_review" },
  { action: "confirm", label: "تأكيد الطلب", status: "confirmed", tone: "gold" },
  {
    action: "request_payment",
    label: "طلب الدفعة",
    status: "awaiting_payment",
    tone: "gold",
  },
  {
    action: "payment_received",
    label: "تم استلام الدفعة",
    status: "payment_received",
  },
  {
    action: "start_production",
    label: "بدء التنفيذ",
    status: "in_production",
  },
  { action: "ready", label: "جاهز للاستلام", status: "ready_for_pickup" },
  { action: "ship", label: "شحن", status: "shipped" },
  { action: "deliver", label: "تم التسليم", status: "delivered", tone: "gold" },
  { action: "cancel", label: "إلغاء", status: "cancelled", tone: "danger" },
];

export interface ShopOrderItem {
  product_type: ShopProductType;
  product_id: string;
  name_ar: string;
  unit_price: number;
  quantity: number;
  image?: string;
  personalization?: ProductPersonalization | null;
  requires_shipping?: boolean;
}

export interface ShopOrder {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  items: ShopOrderItem[];
  gift_options: GiftOptions | null;
  total: number;
  status: ShopOrderStatus;
  created_at: string;
  /** Accessory delivery — null/false on legacy orders */
  shipping_required?: boolean;
  shipping_full_name?: string | null;
  shipping_phone?: string | null;
  shipping_city?: string | null;
  shipping_region?: string | null;
  shipping_address?: string | null;
  shipping_postal_code?: string | null;
  shipping_notes?: string | null;
  shipping_cost?: number | null;
}

export const VEIL_CATEGORY_OPTIONS = [
  "كاتدرائية",
  "متوسطة",
  "قصيرة",
  "birdcage",
  "كلاسيكي",
  "حسب الطلب",
] as const;

export type NotificationChannel = "email" | "whatsapp";
export type NotificationSendStatus = "sent" | "failed" | "pending_retry";
export type NotificationType =
  | "customer_order_status"
  | "customer_order_submitted"
  | "customer_payment_request"
  | "customer_custom_message"
  | "admin_new_order";

export interface NotificationLog {
  id: string;
  order_id: string | null;
  customer_id: string | null;
  notification_type: NotificationType | string;
  channel: NotificationChannel;
  order_status: string | null;
  recipient: string | null;
  status: NotificationSendStatus;
  delivery_result: string | null;
  error_message: string | null;
  attempts: number;
  sent_at: string | null;
  created_at: string;
}

export interface NotificationSettings {
  sender_name: string;
  reply_email: string;
  business_phone: string;
  whatsapp_templates: Partial<Record<ShopOrderStatus, string>>;
  email_subjects: Partial<Record<ShopOrderStatus, string>>;
  payment_instructions: string;
  payment_link: string;
}

export const DEFAULT_WHATSAPP_BY_STATUS: Partial<
  Record<ShopOrderStatus, string>
> = {
  pending: "تم استلام طلبك بنجاح 💍",
  under_review: "طلبكِ قيد المراجعة حالياً ✨",
  confirmed: "تم تأكيد طلبك وبدأنا العمل عليه ✨",
  awaiting_payment: "بانتظار استلام الدفعة لإكمال طلبكِ 💳",
  payment_received: "تم استلام الدفعة بنجاح، شكراً لثقتكِ 💛",
  in_production: "طلبكِ قيد التنفيذ في الأتيليه 👗",
  ready_for_pickup: "طلبكِ جاهز للاستلام 🎁",
  shipped: "تم شحن طلبك ويمكنك تتبع عملية التوصيل 🚚",
  delivered: "تم تسليم طلبك، نتمنى أن ينال إعجابك ❤️",
  cancelled: "تم إلغاء طلبكِ. إن كان لديكِ استفسار، نحن هنا لمساعدتكِ.",
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  sender_name: "Nadeen Designs",
  reply_email: "hello@nadeendesigns.com",
  business_phone: "0525999010",
  whatsapp_templates: {},
  email_subjects: {},
  payment_instructions:
    "يرجى تحويل المبلغ إلى حساب البوتيك، ثم إرسال إيصال التحويل عبر واتساب.",
  payment_link: "",
};
