import { z } from "zod";

export const writingLanguageSchema = z.enum(["ar", "en", "both"]);
export const arabicFontSchema = z.enum([
  "classic_ar",
  "diwani",
  "naskh",
  "signature_ar",
]);
export const englishFontSchema = z.enum([
  "elegant_script",
  "modern_script",
  "luxury_serif",
  "classic_serif",
]);
export const writingColorSchema = z.enum([
  "gold",
  "silver",
  "white",
  "black",
  "champagne",
  "rose_gold",
]);
export const writingPositionSchema = z.enum([
  "back",
  "chest",
  "sleeve",
  "bottom_corner",
  "center",
  "custom",
]);

export const productPersonalizationSchema = z
  .object({
    product_type: z.enum(["veils", "robes"]),
    dress_id: z.string().min(1),
    dress_name_ar: z.string().min(1),
    writing_language: writingLanguageSchema,
    text_ar: z.string().max(25).default(""),
    text_en: z.string().max(25).default(""),
    font_ar: arabicFontSchema,
    font_en: englishFontSchema,
    color: writingColorSchema,
    position: writingPositionSchema,
  })
  .superRefine((data, ctx) => {
    const ar = data.text_ar.trim();
    const en = data.text_en.trim();

    if (data.writing_language === "ar" && !ar) {
      ctx.addIssue({
        code: "custom",
        message: "النص بالعربية مطلوب",
        path: ["text_ar"],
      });
    }
    if (data.writing_language === "en" && !en) {
      ctx.addIssue({
        code: "custom",
        message: "English text is required",
        path: ["text_en"],
      });
    }
    if (data.writing_language === "both" && !ar && !en) {
      ctx.addIssue({
        code: "custom",
        message: "أدخلي النص بالعربية أو الإنجليزية على الأقل",
        path: ["text_ar"],
      });
    }

    if (data.product_type === "robes") {
      if (!["back", "chest", "sleeve"].includes(data.position)) {
        ctx.addIssue({
          code: "custom",
          message: "موضع الكتابة غير صالح للبرنص",
          path: ["position"],
        });
      }
    }
    if (data.product_type === "veils") {
      if (!["bottom_corner", "center", "custom"].includes(data.position)) {
        ctx.addIssue({
          code: "custom",
          message: "موضع الكتابة غير صالح للطرحة",
          path: ["position"],
        });
      }
    }
  });
