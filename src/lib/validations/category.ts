import { z } from "zod";

const optionalUrl = z
  .union([z.string().url("رابط غير صالح"), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

const optionalHref = z
  .union([
    z.string().regex(/^\/[a-z0-9\-/]*$/i, "المسار يجب أن يبدأ بـ /"),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

const optionalLegacy = z
  .union([z.string().min(1), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

const optionalSeoText = z
  .union([z.string(), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

const productKindSchema = z
  .union([
    z.enum(["dress", "veil", "bridal_robe", "accessories_group", "accessory_item"]),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

/** Fields shared by create/update — no defaults (avoids wiping on partial PUT). */
export const categoryFieldsSchema = z.object({
  name_ar: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  name_en: z
    .union([z.string(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined || v === null ? null : v)),
  name_he: z
    .union([z.string(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined || v === null ? null : v)),
  slug: z
    .string()
    .min(2, "المعرّف (slug) مطلوب")
    .regex(
      /^[a-z0-9\u0600-\u06FF]+(?:-[a-z0-9\u0600-\u06FF]+)*$/i,
      "صيغة المعرّف غير صالحة"
    ),
  parent_id: z.union([z.string().uuid(), z.null()]).optional(),
  sort_order: z.number().int().optional(),
  is_visible: z.boolean().optional(),
  visible_in_navigation: z.boolean().optional(),
  show_on_homepage: z.boolean().optional(),
  featured_collection: z.boolean().optional(),
  icon_url: optionalUrl,
  cover_image_url: optionalUrl,
  description_ar: z.string().optional(),
  href: optionalHref,
  legacy_key: optionalLegacy,
  product_kind: productKindSchema,
  seo_title_ar: optionalSeoText,
  seo_description_ar: optionalSeoText,
  seo_og_image_url: optionalUrl,
});

export const categoryCreateSchema = categoryFieldsSchema.extend({
  name_ar: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  slug: z
    .string()
    .min(2, "المعرّف (slug) مطلوب")
    .regex(
      /^[a-z0-9\u0600-\u06FF]+(?:-[a-z0-9\u0600-\u06FF]+)*$/i,
      "صيغة المعرّف غير صالحة"
    ),
});

export const categoryUpdateSchema = categoryFieldsSchema.partial();

export type CategoryPayload = z.infer<typeof categoryCreateSchema>;
