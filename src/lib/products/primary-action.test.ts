import { describe, expect, it } from "vitest";
import {
  getProductPrimaryAction,
  inferProductCommerceTypeFromLegacyCategory,
  resolveProductCommerceType,
} from "./primary-action";

describe("getProductPrimaryAction", () => {
  it("maps commerce types to correct Arabic CTAs", () => {
    expect(getProductPrimaryAction("ready_to_buy").label).toBe("أضف إلى السلة");
    expect(getProductPrimaryAction("bridal_accessory").label).toBe(
      "أضف إلى السلة"
    );
    expect(getProductPrimaryAction("rental_dress").label).toBe("احجزي موعد");
    expect(getProductPrimaryAction("custom_design").label).toBe("اطلبي تصميم");
    expect(getProductPrimaryAction("custom_design").kind).toBe(
      "request_design"
    );
    expect(getProductPrimaryAction("service").label).toBe("احجز الآن");
  });

  it("never uses category names — only product_type", () => {
    expect(getProductPrimaryAction("bridal_accessory").kind).toBe(
      "add_to_cart"
    );
    expect(getProductPrimaryAction("rental_dress").kind).toBe(
      "book_appointment"
    );
  });

  it("hides cart for rental and custom design", () => {
    expect(getProductPrimaryAction("rental_dress").hideCart).toBe(true);
    expect(getProductPrimaryAction("custom_design").hideCart).toBe(true);
    expect(getProductPrimaryAction("bridal_accessory").hideCart).toBe(false);
  });

  it("normalizes legacy accessory/rental aliases", () => {
    expect(getProductPrimaryAction("accessory").kind).toBe("add_to_cart");
    expect(getProductPrimaryAction("rental").isRentalPresentation).toBe(true);
  });
});

describe("inferProductCommerceTypeFromLegacyCategory", () => {
  it("backfills accessories / rental / custom for hydration only", () => {
    expect(
      inferProductCommerceTypeFromLegacyCategory("bridal_accessories")
    ).toBe("bridal_accessory");
    expect(inferProductCommerceTypeFromLegacyCategory("veils")).toBe(
      "bridal_accessory"
    );
    expect(inferProductCommerceTypeFromLegacyCategory("rental")).toBe(
      "rental_dress"
    );
    expect(inferProductCommerceTypeFromLegacyCategory("custom_design")).toBe(
      "custom_design"
    );
    // Wedding + Nouf → rental_dress (appointment behavior)
    expect(inferProductCommerceTypeFromLegacyCategory("wedding")).toBe(
      "rental_dress"
    );
    expect(inferProductCommerceTypeFromLegacyCategory("nouf_dresses")).toBe(
      "rental_dress"
    );
  });
});

describe("resolveProductCommerceType", () => {
  it("falls back when invalid", () => {
    expect(resolveProductCommerceType(null)).toBe("ready_to_buy");
    expect(resolveProductCommerceType("veil", "bridal_accessory")).toBe(
      "bridal_accessory"
    );
  });

  it("maps legacy aliases", () => {
    expect(resolveProductCommerceType("accessory")).toBe("bridal_accessory");
    expect(resolveProductCommerceType("rental")).toBe("rental_dress");
  });
});
