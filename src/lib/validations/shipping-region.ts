import { z } from "zod";

const optionalNonNegInt = z
  .number()
  .int()
  .min(0)
  .nullable()
  .optional();

export const shippingRegionCreateSchema = z.object({
  name_ar: z.string().min(2, "اسم المنطقة بالعربية مطلوب"),
  name_en: z.string().optional().default(""),
  shipping_fee: z.number().min(0, "رسوم الشحن غير صالحة").default(0),
  is_active: z.boolean().optional().default(true),
  sort_order: z.number().int().optional().default(0),
  estimated_days: z.number().int().positive().nullable().optional(),
  estimated_days_min: optionalNonNegInt,
  estimated_days_max: optionalNonNegInt,
  estimated_delivery_ar: z.string().nullable().optional(),
  carrier_code: z.string().nullable().optional(),
  free_shipping_override: z.number().min(0).nullable().optional(),
  discount: z.number().min(0).nullable().optional(),
  meta: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const shippingRegionUpdateSchema = shippingRegionCreateSchema.partial();
