import { z } from "zod";
import { cartNeedsShipping } from "@/lib/shop/shipping";

export const veilPayloadSchema = z.object({
  name_ar: z.string().min(2),
  description_ar: z.string().default(""),
  price: z.number().min(0),
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
  description_ar: z.string().default(""),
  price: z.number().min(0),
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
  requires_shipping: z.boolean().optional(),
});

export const shippingAddressSchema = z.object({
  full_name: z.string().min(2, "اسم المستلم مطلوب"),
  phone: z.string().min(9, "هاتف التوصيل غير صالح"),
  city: z.string().min(2, "المدينة مطلوبة"),
  region: z.string().min(2, "المنطقة مطلوبة"),
  address: z.string().min(5, "العنوان التفصيلي مطلوب"),
  postal_code: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const shopOrderCreateSchema = z
  .object({
    name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
    phone: z.string().min(9, "رقم الهاتف غير صالح"),
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
    shipping: shippingAddressSchema.nullable().optional(),
    shipping_cost: z.number().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    const needs =
      data.shipping_required === true || cartNeedsShipping(data.items);
    if (!needs) return;
    if (!data.shipping) {
      ctx.addIssue({
        code: "custom",
        path: ["shipping"],
        message: "بيانات التوصيل مطلوبة لطلب اكسسوارات العروس",
      });
      return;
    }
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
  });
