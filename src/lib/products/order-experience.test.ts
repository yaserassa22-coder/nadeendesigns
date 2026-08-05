import { describe, expect, it } from "vitest";
import {
  normalizeExtraServices,
  normalizeOrderOptions,
  resolveProductExtraServices,
  resolveProductOrderOptions,
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
    expect(normalized.services).toHaveLength(4);
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
  });
});
