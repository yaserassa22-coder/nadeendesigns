import { z } from "zod";
import { isValidCheckoutPhone, isValidPersonName } from "@/lib/phone";
import { cartNeedsShipping } from "@/lib/shop/shipping";

/** Product descriptions are unlimited TEXT — no .max() / HTML maxlength. */
const unlimitedDescription = z.string().default("");

export const veilPayloadSchema = z.object({
  name_ar: z.string().min(2),
  description_ar: unlimitedDescription,
  price: z.number().min(0),
  sale_price: z.number().min(0).nullable().optional(),
  images: z.array(z.string()).default([]),
  category: z.string().min(1),
  color: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  stock_quantity: z.number().int().min(0).default(0),
  is_available: z.boolean().optional(),
  is_featured: z.boolean().optional(),
});

export const bridalRobePayloadSchema = z.object({
  name_ar: z.string().min(2),
  description_ar: unlimitedDescription,
  price: z.number().min(0),
  sale_price: z.number().min(0).nullable().optional(),
  images: z.array(z.string()).default([]),
  color: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  stock_quantity: z.number().int().min(0).default(0),
  is_featured: z.boolean().optional(),
  is_available: z.boolean().optional(),
});

export const shopOrderItemSchema = z.object({
  product_type: z.enum(["veil", "bridal_robe", "dress"]),
  product_id: z.string().min(1, "معرّف المنتج مطلوب"),
  name_ar: z.string().min(1, "اسم المنتج مطلوب"),
  unit_price: z.number().min(0, "سعر المنتج غير صالح"),
  quantity: z
    .number()
    .int()
    .min(1, "الكمية يجب أن تكون 1 على الأقل")
    .max(20, "الكمية كبيرة جدًا"),
  image: z.string().nullable().optional(),
  // Accept stored cart personalization without re-blocking checkout
  personalization: z.any().nullable().optional(),
  gift_options: z.any().nullable().optional(),
  order_options: z.any().nullable().optional(),
  extra_services: z.any().nullable().optional(),
  personalization_fee: z.number().min(0).nullable().optional(),
  gift_fee: z.number().min(0).nullable().optional(),
  requires_shipping: z.boolean().optional(),
});

export const shippingAddressSchema = z.object({
  full_name: z
    .string()
    .refine(isValidPersonName, "اسم المستلم مطلوب"),
  phone: z
    .string()
    .refine(isValidCheckoutPhone, "هاتف التوصيل غير صالح"),
  city: z.string().min(2, "البلدة / المدينة مطلوبة"),
  /** Configured region name or free-text city/region */
  region: z.string().min(2, "المنطقة مطلوبة"),
  address: z.string().min(5, "العنوان التفصيلي مطلوب"),
  postal_code: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  building_number: z.string().nullable().optional(),
  neighborhood: z.string().nullable().optional(),
  /** Optional — unknown regions checkout without a catalog id */
  shipping_region_id: z.string().uuid().nullable().optional(),
});

export const shopOrderCreateSchema = z
  .object({
    name: z
      .string()
      .refine(isValidPersonName, "الاسم يجب أن يكون حرفين على الأقل"),
    phone: z
      .string()
      .refine(isValidCheckoutPhone, "رقم الهاتف غير صالح"),
    email: z
      .union([
        z.string().email("البريد الإلكتروني غير صالح"),
        z.literal(""),
        z.null(),
      ])
      .optional(),
    notes: z.string().nullable().optional(),
    items: z
      .array(shopOrderItemSchema)
      .min(1, "السلة فارغة — أضيفي منتجًا قبل تأكيد الطلب"),
    gift_options: z.any().nullable().optional(),
    total: z.number().min(0, "المجموع غير صالح"),
    shipping_required: z.boolean().optional(),
    delivery_method: z.enum(["pickup", "delivery"]).nullable().optional(),
    shipping: shippingAddressSchema.nullable().optional(),
    /** Persisted as shop_orders.shipping_cost */
    shipping_cost: z.number().min(0).optional(),
    /** Legacy/alias — mapped to shipping_cost on the server */
    shipping_fee: z.number().min(0).optional(),
    notify_whatsapp: z.boolean().optional(),
    notify_email: z.boolean().optional(),
    /** Payment provider plugin id (cod, bit, credit_card, …) */
    payment_provider_id: z.string().trim().min(1).max(64).optional(),
  })
  .superRefine((data, ctx) => {
    const needs =
      data.shipping_required === true ||
      data.delivery_method === "delivery" ||
      data.delivery_method === "pickup" ||
      cartNeedsShipping(data.items);
    if (needs) {
      const method = data.delivery_method;
      if (method !== "pickup" && method !== "delivery") {
        ctx.addIssue({
          code: "custom",
          path: ["delivery_method"],
          message: "يرجى اختيار طريقة الاستلام (من البوتيك أو التوصيل)",
        });
      } else if (method === "delivery") {
        if (!data.shipping) {
          ctx.addIssue({
            code: "custom",
            path: ["shipping"],
            message: "بيانات التوصيل مطلوبة لطلب اكسسوارات العروس",
          });
        } else {
          const parsed = shippingAddressSchema.safeParse(data.shipping);
          if (!parsed.success) {
            for (const issue of parsed.error.issues) {
              ctx.addIssue({
                code: "custom",
                path: ["shipping", ...issue.path],
                message: issue.message,
              });
            }
          }
          const regionText = data.shipping.region?.trim() ?? "";
          if (
            !data.shipping.shipping_region_id &&
            regionText.length < 2
          ) {
            ctx.addIssue({
              code: "custom",
              path: ["shipping", "region"],
              message: "المنطقة / المدينة مطلوبة للتوصيل",
            });
          }
        }
      }
      // pickup: address not required
    }

    const wantWa = data.notify_whatsapp ?? true;
    const wantEmail = data.notify_email ?? true;
    if (!wantWa && !wantEmail) {
      ctx.addIssue({
        code: "custom",
        path: ["notify_whatsapp"],
        message:
          "يرجى اختيار قناة واحدة على الأقل لاستلام التحديثات (WhatsApp أو Email)",
      });
    }
    if (wantWa && !isValidCheckoutPhone(data.phone)) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message:
          "رقم واتساب غير صالح — أدخلي رقم هاتف صحيح لاستلام التحديثات عبر WhatsApp",
      });
    }
    if (wantEmail) {
      const email = (data.email ?? "").trim();
      if (!email || !z.string().email().safeParse(email).success) {
        ctx.addIssue({
          code: "custom",
          path: ["email"],
          message:
            "البريد الإلكتروني مطلوب وصالح عند اختيار التحديثات عبر Email",
        });
      }
    }
  });
