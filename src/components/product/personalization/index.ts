/**
 * Personalization UI atoms — re-exported for the product personalization engine.
 * Existing components are unchanged; this barrel is the extension point for
 * future product types that reuse veil/robe personalization UI.
 *
 * Cart orchestrator remains `ShopCustomizeAndBuy` (wraps these atoms — do not replace).
 */

export { PersonalizationFonts } from "@/components/dresses/PersonalizationFonts";
export { PersonalizationPreview } from "@/components/dresses/PersonalizationPreview";
export { PersonalizationSummary } from "@/components/dresses/PersonalizationSummary";
export { PersonalizationForm } from "@/components/dresses/PersonalizationForm";
export {
  GiftWrappingSection,
  DEFAULT_GIFT_STATE,
  type GiftWrappingState,
} from "@/components/dresses/GiftWrappingSection";
