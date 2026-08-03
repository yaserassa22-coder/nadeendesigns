import { z } from "zod";
import { DRESS_COLORS, DRESS_STYLES } from "@/lib/constants";
import { normalizeDressColor } from "@/lib/colors";
import { normalizeDressStyle } from "@/lib/styles";
import { DRESS_CATEGORIES, normalizeDressCategory } from "@/types";

const ALLOWED_CATEGORIES_MSG = DRESS_CATEGORIES.join(", ");

/** Accept canonical + legacy category values, always output canonical. */
export const dressCategorySchema = z
  .string()
  .min(1, "التصنيف مطلوب")
  .transform((value, ctx) => {
    const normalized = normalizeDressCategory(value.trim());
    if (!normalized) {
      ctx.addIssue({
        code: "custom",
        message: `تصنيف غير صالح: "${value}". المسموح: ${ALLOWED_CATEGORIES_MSG}`,
      });
      return z.NEVER;
    }
    return normalized;
  });

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

export const dressPayloadSchema = z.object({
  name_ar: z.string().trim().min(2, "اسم الفستان يجب أن يكون حرفين على الأقل"),
  /** Unlimited multiline TEXT — no .max(); trim ends in admin save handlers */
  description_ar: z.string().optional().default(""),
  category: dressCategorySchema,
  price: optionalNullableNumber("السعر").optional(),
  rental_price: optionalNullableNumber("سعر الإيجار").optional(),
  size: z.union([z.string(), z.null()]).optional(),
  color: dressColorSchema.optional(),
  style: dressStyleSchema.optional(),
  is_featured: z.boolean().optional(),
  is_available: z.boolean().optional(),
  images: z.array(z.string()).optional().default([]),
});
