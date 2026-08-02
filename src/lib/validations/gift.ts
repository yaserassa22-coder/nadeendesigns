import { z } from "zod";

export const giftBoxSchema = z.enum([
  "standard",
  "luxury_box",
  "luxury_ribbon",
]);

export const giftOptionsSchema = z
  .object({
    enabled: z.literal(true),
    gift_box: giftBoxSchema,
    gift_card: z.boolean(),
    gift_message: z.string().max(250).default(""),
    sender_name: z.string().max(80).default(""),
    recipient_name: z.string().max(80).default(""),
    hide_price: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.gift_card && !data.gift_message.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "رسالة الإهداء مطلوبة عند تفعيل بطاقة الإهداء",
        path: ["gift_message"],
      });
    }
  });
