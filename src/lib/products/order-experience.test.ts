import { describe, expect, it } from "vitest";
import {
  effectiveServiceUnitPrice,
  formatExtraServicePriceLabel,
  normalizeExtraServices,
  normalizeOrderOptions,
  productNeedsExperienceModal,
  resolveProductExtraServices,
  resolveProductOrderOptions,
  resolveServicePricingMode,
} from "./order-experience";

describe("normalizeOrderOptions", () => {
  it("fills defaults and preserves admin toggles", () => {
    const normalized = normalizeOrderOptions({
      options: [
        {
          key: "gift_message",
          enabled: true,
          required: true,
        },
      ],
    });
    expect(normalized.options).toHaveLength(6);
    const gift = normalized.options.find((o) => o.key === "gift_message");
    expect(gift?.enabled).toBe(true);
    expect(gift?.required).toBe(true);
    expect(gift?.label_ar).toBe("رسالة هدية");
  });
});

describe("normalizeExtraServices", () => {
  it("keeps known services and merges prices", () => {
    const normalized = normalizeExtraServices({
      services: [{ id: "luxury_box", enabled: true, price: 45 }],
    });
    const box = normalized.services.find((s) => s.id === "luxury_box");
    expect(box?.enabled).toBe(true);
    expect(box?.price).toBe(45);
    expect(box?.pricing_mode).toBe("FIXED_PRICE");
    expect(normalized.services).toHaveLength(4);
  });

  it("migrates legacy price=0 → FREE and price>0 → FIXED_PRICE", () => {
    const normalized = normalizeExtraServices({
      services: [
        { id: "gift_wrap", enabled: true, price: 0 },
        { id: "express_delivery", enabled: true, price: 40 },
      ],
    });
    const wrap = normalized.services.find((s) => s.id === "gift_wrap");
    const express = normalized.services.find((s) => s.id === "express_delivery");
    expect(wrap?.pricing_mode).toBe("FREE");
    expect(wrap?.price).toBe(0);
    expect(express?.pricing_mode).toBe("FIXED_PRICE");
    expect(express?.price).toBe(40);
  });

  it("FREE forces price to 0 even if a price was stored", () => {
    const normalized = normalizeExtraServices({
      services: [
        { id: "gift_wrap", pricing_mode: "FREE", price: 99, enabled: true },
      ],
    });
    const wrap = normalized.services.find((s) => s.id === "gift_wrap");
    expect(wrap?.pricing_mode).toBe("FREE");
    expect(wrap?.price).toBe(0);
  });
});

describe("pricing mode helpers", () => {
  it("resolveServicePricingMode migrates from price", () => {
    expect(resolveServicePricingMode(undefined, 0)).toBe("FREE");
    expect(resolveServicePricingMode(undefined, 12)).toBe("FIXED_PRICE");
    expect(resolveServicePricingMode("FREE", 12)).toBe("FREE");
  });

  it("effectiveServiceUnitPrice respects FREE vs FIXED", () => {
    expect(
      effectiveServiceUnitPrice({ pricing_mode: "FREE", price: 50 })
    ).toBe(0);
    expect(
      effectiveServiceUnitPrice({ pricing_mode: "FIXED_PRICE", price: 40 })
    ).toBe(40);
  });

  it("formatExtraServicePriceLabel shows FREE or +₪", () => {
    expect(
      formatExtraServicePriceLabel({ pricing_mode: "FREE", price: 0 })
    ).toBe("مجاني");
    expect(
      formatExtraServicePriceLabel({ pricing_mode: "FIXED_PRICE", price: 40 })
    ).toContain("40");
  });

  it("productNeedsExperienceModal gates modal", () => {
    expect(
      productNeedsExperienceModal({
        supportsPersonalization: false,
        orderOptions: [],
        extraServices: [],
      })
    ).toBe(false);
    expect(
      productNeedsExperienceModal({
        supportsPersonalization: true,
        orderOptions: [],
        extraServices: [],
      })
    ).toBe(true);
    expect(
      productNeedsExperienceModal({
        supportsPersonalization: false,
        orderOptions: [],
        extraServices: [
          {
            id: "x",
            name: "X",
            name_ar: "س",
            description: "",
            description_ar: "",
            pricing_mode: "FREE",
            price: 0,
            enabled: true,
            sort_order: 0,
          },
        ],
      })
    ).toBe(true);
  });
});

describe("resolve helpers", () => {
  it("inherits store defaults when product override is off", () => {
    const store = normalizeOrderOptions({
      options: [{ key: "order_notes", enabled: true, required: true }],
    });
    const resolved = resolveProductOrderOptions(store, null);
    expect(resolved.find((o) => o.key === "order_notes")?.required).toBe(true);
  });

  it("filters extra services by product override ids", () => {
    const store = normalizeExtraServices({
      services: [
        { id: "gift_wrap", enabled: true, price: 10 },
        { id: "express_delivery", enabled: true, price: 30 },
      ],
    });
    const resolved = resolveProductExtraServices(store, {
      use_custom: true,
      enabled_ids: ["express_delivery"],
      price_overrides: { express_delivery: 55 },
    });
    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe("express_delivery");
    expect(resolved[0].price).toBe(55);
    expect(resolved[0].pricing_mode).toBe("FIXED_PRICE");
  });
});

describe("line pricing", () => {
  it("sums extras into charged unit and line total", async () => {
    const { chargedUnitPrice, lineChargedTotal, buildLineExtraServices } =
      await import("./order-experience");
    const extras = buildLineExtraServices(
      [
        {
          id: "gift_wrap",
          name: "Gift Wrap",
          name_ar: "تغليف",
          description: "",
          description_ar: "",
          pricing_mode: "FIXED_PRICE",
          price: 15,
          enabled: true,
          sort_order: 0,
        },
      ],
      ["gift_wrap"]
    );
    expect(chargedUnitPrice({ baseUnitPrice: 100, extraServices: extras })).toBe(
      115
    );
    expect(
      lineChargedTotal({
        baseUnitPrice: 100,
        quantity: 2,
        extraServices: extras,
      })
    ).toBe(230);
  });

  it("FREE services do not add to charged total", async () => {
    const { chargedUnitPrice, buildLineExtraServices } = await import(
      "./order-experience"
    );
    const extras = buildLineExtraServices(
      [
        {
          id: "gift_wrap",
          name: "Gift Wrap",
          name_ar: "تغليف",
          description: "",
          description_ar: "",
          pricing_mode: "FREE",
          price: 0,
          enabled: true,
          sort_order: 0,
        },
      ],
      ["gift_wrap"]
    );
    expect(chargedUnitPrice({ baseUnitPrice: 100, extraServices: extras })).toBe(
      100
    );
  });
});
