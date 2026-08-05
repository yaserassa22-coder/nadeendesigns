"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import {
  DEFAULT_GIFT_STATE,
  GiftWrappingSection,
  type GiftWrappingState,
} from "@/components/dresses/GiftWrappingSection";
import { PersonalizationFonts } from "@/components/dresses/PersonalizationFonts";
import { PersonalizationPreview } from "@/components/dresses/PersonalizationPreview";
import { useCart } from "@/components/shop/CartProvider";
import {
  ARABIC_FONT_OPTIONS,
  ENGLISH_FONT_OPTIONS,
  getPersonalizationPositionOptions,
  shopTypeToPersonalizationType,
  validatePersonalization,
  WRITING_COLOR_OPTIONS,
  WRITING_LANGUAGE_OPTIONS,
  type ArabicFont,
  type EnglishFont,
  type WritingColor,
  type WritingLanguage,
  type WritingPosition,
} from "@/lib/products/personalization";
import { giftOptionsSchema } from "@/lib/validations/gift";
import type { GiftOptions, ProductPersonalization } from "@/types";
import type { ShopProductType } from "@/types/shop";
import { cn } from "@/lib/utils";
import { resolveProductPricing } from "@/lib/products/pricing";
import { getProductPrimaryAction } from "@/lib/products/primary-action";

interface ShopCustomizeAndBuyProps {
  productType: ShopProductType;
  productId: string;
  nameAr: string;
  price: number;
  /** Optional sale — when lower than price, cart charges sale and keeps compare-at. */
  salePrice?: number | null;
  image?: string;
}

export function ShopCustomizeAndBuy({
  productType,
  productId,
  nameAr,
  price,
  salePrice,
  image,
}: ShopCustomizeAndBuyProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const personalizationType =
    shopTypeToPersonalizationType(productType) ?? "robes";
  const pricing = resolveProductPricing({ price, salePrice });
  /** Veils/robes are always bridal_accessory → Add to Cart label */
  const addToCartLabel = getProductPrimaryAction("bridal_accessory").label;

  const [quantity, setQuantity] = useState(1);
  const [withPersonalization, setWithPersonalization] = useState(true);
  const [writingLanguage, setWritingLanguage] =
    useState<WritingLanguage>("ar");
  const [textAr, setTextAr] = useState("");
  const [textEn, setTextEn] = useState("");
  const [fontAr, setFontAr] = useState<ArabicFont>("classic_ar");
  const [fontEn, setFontEn] = useState<EnglishFont>("elegant_script");
  const [color, setColor] = useState<WritingColor>("gold");
  const [position, setPosition] = useState<WritingPosition>(
    personalizationType === "robes" ? "back" : "bottom_corner"
  );
  const [gift, setGift] = useState<GiftWrappingState>(DEFAULT_GIFT_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const positionOptions = useMemo(
    () => getPersonalizationPositionOptions(personalizationType),
    [personalizationType]
  );

  const showArabic =
    writingLanguage === "ar" || writingLanguage === "both";
  const showEnglish =
    writingLanguage === "en" || writingLanguage === "both";

  const buildPersonalization = (): ProductPersonalization | null => {
    if (!withPersonalization) return null;
    const result = validatePersonalization({
      product_type: personalizationType,
      dress_id: productId,
      dress_name_ar: nameAr,
      writing_language: writingLanguage,
      text_ar: textAr,
      text_en: textEn,
      font_ar: fontAr,
      font_en: fontEn,
      color,
      position,
    });
    if (!result.ok) {
      setErrors(result.fieldErrors);
      return null;
    }
    setErrors({});
    return result.data;
  };

  const buildGift = (): GiftOptions | null | undefined => {
    if (!gift.enabled) return null;
    const parsed = giftOptionsSchema.safeParse({
      enabled: true as const,
      gift_box: gift.giftBox,
      gift_card: gift.giftCard,
      gift_message: gift.giftMessage,
      sender_name: gift.senderName,
      recipient_name: gift.recipientName,
      hide_price: gift.hidePrice,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors((prev) => ({ ...prev, ...next }));
      return undefined;
    }
    return parsed.data;
  };

  const addToCart = (goCheckout: boolean) => {
    setErrors({});
    setMessage("");

    let personalization: ProductPersonalization | null = null;
    if (withPersonalization) {
      personalization = buildPersonalization();
      if (!personalization) return;
    }

    const giftOptions = buildGift();
    if (giftOptions === undefined) return;

    addItem({
      product_type: productType,
      product_id: productId,
      name_ar: nameAr,
      unit_price: pricing.currentPrice ?? price,
      compare_at_price: pricing.onSale ? pricing.regularPrice : null,
      quantity,
      image,
      personalization,
      gift_options: giftOptions,
      requires_shipping: true,
    });

    setMessage("تمت الإضافة إلى السلة");
    if (goCheckout) router.push("/checkout");
    else router.push("/cart");
  };

  return (
    <PersonalizationFonts className="mt-10 space-y-6 rounded-3xl border border-beige-dark bg-white/80 p-6 shadow-sm md:p-8">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-sm text-gold">
          <Sparkles className="h-4 w-4" />
          تخصيص وشراء
        </div>
        <h2 className="text-2xl font-bold text-charcoal">خصّصي منتجكِ وأضيفيه للسلة</h2>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-beige-dark px-4 py-3">
        <input
          type="checkbox"
          checked={withPersonalization}
          onChange={(e) => setWithPersonalization(e.target.checked)}
          className="accent-[var(--gold)]"
        />
        <span className="text-sm font-medium">أريد تخصيص الكتابة على المنتج</span>
      </label>

      {withPersonalization && (
        <div className="space-y-5">
          <Select
            label="لغة الكتابة *"
            value={writingLanguage}
            onChange={(e) =>
              setWritingLanguage(e.target.value as WritingLanguage)
            }
            options={WRITING_LANGUAGE_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />

          {writingLanguage === "both" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="الاسم أو النص بالعربية"
                value={textAr}
                maxLength={25}
                dir="rtl"
                onChange={(e) => setTextAr(e.target.value.slice(0, 25))}
                error={errors.text_ar}
              />
              <Input
                label="Name or Text in English"
                value={textEn}
                maxLength={25}
                dir="ltr"
                onChange={(e) => setTextEn(e.target.value.slice(0, 25))}
                error={errors.text_en}
              />
            </div>
          ) : writingLanguage === "ar" ? (
            <Input
              label="الاسم أو النص بالعربية *"
              value={textAr}
              maxLength={25}
              dir="rtl"
              onChange={(e) => setTextAr(e.target.value.slice(0, 25))}
              error={errors.text_ar}
            />
          ) : (
            <Input
              label="Name or Text in English *"
              value={textEn}
              maxLength={25}
              dir="ltr"
              onChange={(e) => setTextEn(e.target.value.slice(0, 25))}
              error={errors.text_en}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {showArabic && (
              <Select
                label="خط العربية"
                value={fontAr}
                onChange={(e) => setFontAr(e.target.value as ArabicFont)}
                options={ARABIC_FONT_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
              />
            )}
            {showEnglish && (
              <Select
                label="English Font"
                value={fontEn}
                dir="ltr"
                onChange={(e) => setFontEn(e.target.value as EnglishFont)}
                options={ENGLISH_FONT_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
              />
            )}
          </div>

          <div>
            <p className="mb-3 text-sm font-medium">لون الكتابة</p>
            <div className="flex flex-wrap gap-2">
              {WRITING_COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-2 text-sm",
                    color === opt.value
                      ? "border-gold bg-gold/10"
                      : "border-beige-dark"
                  )}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full border"
                    style={{ backgroundColor: opt.hex }}
                  />
                  <span dir="ltr">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Select
            label="موضع الكتابة"
            value={position}
            dir="ltr"
            onChange={(e) => setPosition(e.target.value as WritingPosition)}
            options={positionOptions.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />

          <PersonalizationPreview
            writingLanguage={writingLanguage}
            textAr={textAr}
            textEn={textEn}
            fontAr={fontAr}
            fontEn={fontEn}
            color={color}
          />
        </div>
      )}

      <GiftWrappingSection value={gift} onChange={setGift} errors={errors} />

      <Input
        label="الكمية"
        type="number"
        min={1}
        max={20}
        dir="ltr"
        value={String(quantity)}
        onChange={(e) =>
          setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
        }
      />

      {message && (
        <p className="rounded-xl bg-gold/10 p-3 text-sm text-gold">{message}</p>
      )}
      {errors.form && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {errors.form}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={() => addToCart(false)}>
          <ShoppingBag className="h-4 w-4" />
          {addToCartLabel}
        </Button>
        <Button size="lg" variant="outline" onClick={() => addToCart(true)}>
          شراء الآن
        </Button>
      </div>
    </PersonalizationFonts>
  );
}
