import { describe, expect, it } from "vitest";
import {
  CHECKOUT_ONLY_SECTION_IDS,
  defaultProductExperienceConfig,
  enabledExperienceSections,
  isCheckoutOnlyExperienceSection,
  moveExperienceSection,
  normalizeProductExperienceConfig,
  reorderJourneySection,
  storefrontExperienceSections,
} from "./experience-designer";
import {
  defaultSelectedServiceIds,
  enforceRequiredServiceIds,
  serviceMatchesVisibility,
  type ExtraServiceConfig,
} from "./order-experience";

describe("experience designer", () => {
  it("fills default sections with checkout-only disabled", () => {
    const cfg = normalizeProductExperienceConfig({});
    expect(cfg.sections.length).toBe(7);
    expect(cfg.sections.map((s) => s.id)).toContain("summary");
    for (const id of CHECKOUT_ONLY_SECTION_IDS) {
      const section = cfg.sections.find((s) => s.id === id);
      expect(section?.enabled).toBe(false);
      expect(isCheckoutOnlyExperienceSection(id)).toBe(true);
    }
  });

  it("storefrontExperienceSections strips checkout-only even if enabled in legacy config", () => {
    const cfg = normalizeProductExperienceConfig({
      sections: [
        {
          id: "extra_services",
          enabled: true,
          sort_order: 0,
          title_ar: "خدمات",
        },
        {
          id: "order_options",
          enabled: true,
          sort_order: 1,
          title_ar: "خيارات",
        },
        {
          id: "delivery",
          enabled: true,
          sort_order: 2,
        },
        {
          id: "order_notes",
          enabled: true,
          sort_order: 3,
        },
        {
          id: "summary",
          enabled: true,
          sort_order: 4,
          title_ar: "الإجمالي",
        },
      ],
    });
    const storefront = storefrontExperienceSections(cfg);
    expect(storefront.map((s) => s.id)).toEqual(["extra_services", "summary"]);
    expect(storefront.some((s) => CHECKOUT_ONLY_SECTION_IDS.includes(s.id))).toBe(
      false
    );
    // Admin-facing list may still include them when enabled
    expect(
      enabledExperienceSections(cfg).some((s) => s.id === "order_options")
    ).toBe(true);
  });

  it("preserves custom titles and order for storefront sections", () => {
    const cfg = normalizeProductExperienceConfig({
      sections: [
        {
          id: "summary",
          enabled: true,
          sort_order: 0,
          title_ar: "الإجمالي",
        },
        {
          id: "extra_services",
          enabled: true,
          sort_order: 1,
          title_ar: "خدمات",
        },
      ],
    });
    const enabled = storefrontExperienceSections(cfg);
    expect(enabled[0].id).toBe("summary");
    expect(enabled[0].title_ar).toBe("الإجمالي");
  });

  it("moves sections up/down", () => {
    const base = defaultProductExperienceConfig().sections;
    const moved = moveExperienceSection(base, "summary", "up");
    const summaryIdx = moved.findIndex((s) => s.id === "summary");
    expect(summaryIdx).toBeLessThan(
      base.findIndex((s) => s.id === "summary")
    );
  });

  it("reorders journey sections via drag target", () => {
    const base = defaultProductExperienceConfig().sections;
    const next = reorderJourneySection(base, "summary", "personalization");
    const journey = next.filter((s) =>
      ["personalization", "extra_services", "gift_options", "summary"].includes(
        s.id
      )
    );
    expect(journey[0].id).toBe("summary");
    expect(journey.map((s) => s.id)).toContain("personalization");
  });

  it("normalizes personalization_ui defaults", () => {
    const cfg = normalizeProductExperienceConfig({
      personalization_ui: { required: true, max_characters: 12, extra_price: 5 },
    });
    expect(cfg.personalization_ui).toEqual({
      required: true,
      max_characters: 12,
      extra_price: 5,
    });
  });
});

describe("service visibility + defaults", () => {
  const svc = (partial: Partial<ExtraServiceConfig>): ExtraServiceConfig => ({
    id: "gift_wrap",
    name: "Gift Wrap",
    name_ar: "تغليف",
    description: "",
    description_ar: "",
    pricing_mode: "FREE",
    price: 0,
    enabled: true,
    visible: true,
    required: false,
    default_selected: false,
    available_online: true,
    available_in_store: false,
    sort_order: 0,
    visibility: { scope: "all" },
    ...partial,
  });

  it("matches all / product_types / product ids", () => {
    expect(
      serviceMatchesVisibility(svc({}), {
        productId: "p1",
        productType: "ready_to_buy",
        channel: "online",
      })
    ).toBe(true);

    expect(
      serviceMatchesVisibility(
        svc({
          visibility: {
            scope: "product_types",
            product_types: ["bridal_accessory"],
          },
        }),
        { productId: "p1", productType: "ready_to_buy", channel: "online" }
      )
    ).toBe(false);

    expect(
      serviceMatchesVisibility(
        svc({
          visibility: { scope: "products", product_ids: ["p1"] },
        }),
        { productId: "p1", productType: "ready_to_buy", channel: "online" }
      )
    ).toBe(true);
  });

  it("enforces required + default selected", () => {
    const services = [
      svc({ id: "a", required: true }),
      svc({ id: "b", default_selected: true }),
      svc({ id: "c" }),
    ];
    expect(defaultSelectedServiceIds(services).sort()).toEqual(["a", "b"]);
    expect(enforceRequiredServiceIds(services, ["c"]).sort()).toEqual([
      "a",
      "c",
    ]);
  });
});
