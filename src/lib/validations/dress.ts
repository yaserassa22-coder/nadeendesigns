import { z } from "zod";
import { DRESS_COLORS, DRESS_STYLES } from "@/lib/constants";
import { normalizeDressColor } from "@/lib/colors";
import { normalizeDressStyle } from "@/lib/styles";
import { PRODUCT_COMMERCE_TYPES, resolveProductCommerceType } from "@/lib/products/primary-action";
import type {
  ProductExtraServicesConfig,
  ProductOrderOptionsConfig,
} from "@/lib/products/order-experience";

const optionalUuid = z
  .union([z.string().uuid("معرّف التصنيف غير صالح"), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

/** Free-text category key (legacy_key / slug) — resolved against DB at write time. */
export const dressCategoryTextSchema = z
  .string()
  .min(1, "التصنيف مطلوب")
  .transform((value) => value.trim());

function optionalNullableNumber(label: string) {
  return z.preprocess((value) => {
    if (value === "" || value === undefined || value === null) return null;
    if (typeof value === "number" && Number.isNaN(value)) return value;
    if (typeof value === "string") {
      const n = Number(value);
      return Number.isFinite(n) ? n : value;
    }
    return value;
  }, z.union([z.number(), z.null()]).refine(
    (v) => v === null || Number.isFinite(v),
    { message: `${label} يجب أن يكون رقمًا صالحًا` }
  ));
}

function optionalStyleOrColor(
  kind: "style" | "color"
): z.ZodType<string | null> {
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return null;
    return value;
  }, z.union([z.string(), z.null()]).transform((value, ctx) => {
    if (value == null || value === "") return null;
    if (kind === "style") {
      const normalized = normalizeDressStyle(value);
      if (
        !normalized ||
        !(DRESS_STYLES as readonly string[]).includes(normalized)
      ) {
        ctx.addIssue({
          code: "custom",
          message: `نمط غير صالح: "${value}"`,
        });
        return z.NEVER;
      }
      return normalized;
    }
    const normalized = normalizeDressColor(value);
    if (
      !normalized ||
      !(DRESS_COLORS as readonly string[]).includes(normalized)
    ) {
      ctx.addIssue({
        code: "custom",
        message: `لون غير صالح: "${value}"`,
      });
      return z.NEVER;
    }
    return normalized;
  })) as z.ZodType<string | null>;
}

export const dressStyleSchema = optionalStyleOrColor("style");
export const dressColorSchema = optionalStyleOrColor("color");

const productStatusSchema = z.enum(["published", "draft", "hidden"]);

/** Accepts Sprint 2 enums + legacy accessory/rental aliases. */
const productCommerceTypeSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return undefined;
    return resolveProductCommerceType(value, "ready_to_buy");
  },
  z.enum(PRODUCT_COMMERCE_TYPES).optional()
);

const orderOptionsConfigSchema = z
  .union([
    z.null(),
    z.object({
      use_custom: z.boolean().optional(),
      options: z.record(z.string(), z.object({
        enabled: z.boolean().optional(),
        required: z.boolean().optional(),
      })).optional(),
    }),
  ])
  .optional() as z.ZodType<ProductOrderOptionsConfig | null | undefined>;

const extraServicesConfigSchema = z
  .union([
    z.null(),
    z.object({
      use_custom: z.boolean().optional(),
      enabled_ids: z.array(z.string()).optional(),
      price_overrides: z.record(z.string(), z.number()).optional(),
    }),
  ])
  .optional() as z.ZodType<ProductExtraServicesConfig | null | undefined>;

const optionalTags = z.preprocess((value) => {
  if (value === undefined || value === null) return [];
  if (typeof value === "string") {
    return value
      .split(/[,،]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value
      .map((t) => (typeof t === "string" ? t.trim() : ""))
      .filter(Boolean);
  }
  return value;
}, z.array(z.string()));

/** Base object (supports .partial() for PUT). */
export const dressPayloadBaseSchema = z.object({
  name_ar: z.string().trim().min(2, "اسم الفستان يجب أن يكون حرفين على الأقل"),
  name_en: z.union([z.string(), z.null()]).optional(),
  description_ar: z.string().optional().default(""),
  short_description: z.union([z.string(), z.null()]).optional(),
  slug: z.union([z.string(), z.null()]).optional(),
  sku: z.union([z.string(), z.null()]).optional(),
  category_id: optionalUuid,
  category: dressCategoryTextSchema.optional(),
  collection_id: optionalUuid,
  product_type: productCommerceTypeSchema.optional(),
  order_options_config: orderOptionsConfigSchema,
  extra_services_config: extraServicesConfigSchema,
  /** Product Experience Designer layout JSON — validated loosely, normalized in app. */
  experience_config: z
    .union([z.null(), z.record(z.string(), z.unknown())])
    .optional(),
  /** Feature library assignment — { use_custom, enabled_ids } */
  features_config: z
    .union([
      z.null(),
      z.object({
        use_custom: z.boolean().optional(),
        enabled_ids: z.array(z.string()).optional(),
      }),
    ])
    .optional(),
  price: optionalNullableNumber("السعر").optional(),
  sale_price: optionalNullableNumber("سعر التخفيض").optional(),
  cost_price: optionalNullableNumber("سعر التكلفة").optional(),
  rental_price: optionalNullableNumber("سعر الإيجار").optional(),
  size: z.union([z.string(), z.null()]).optional(),
  color: dressColorSchema.optional(),
  style: dressStyleSchema.optional(),
  tags: optionalTags.optional(),
  status: productStatusSchema.optional(),
  is_featured: z.boolean().optional(),
  is_available: z.boolean().optional(),
  images: z.array(z.string()).optional().default([]),
});

/**
 * Dress create payload — prefer category_id; category TEXT accepted for transition.
 * At least one of category_id / category required.
 */
export const dressPayloadSchema = dressPayloadBaseSchema.superRefine(
  (data, ctx) => {
    if (!data.category_id && !data.category) {
      ctx.addIssue({
        code: "custom",
        path: ["category_id"],
        message: "التصنيف مطلوب",
      });
    }
  }
);

/** @deprecated Use dressCategoryTextSchema */
export const dressCategorySchema = dressCategoryTextSchema;
