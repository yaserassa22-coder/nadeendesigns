import { describe, expect, it } from "vitest";
import {
  allowedFeatureIdsForProduct,
  resolveEnabledFeatureIds,
  sanitizeProductFeaturesConfig,
} from "./feature-allowlist";

describe("product-type feature allowlist", () => {
  it("rental allows appointment + wishlist only", () => {
    const allowed = allowedFeatureIdsForProduct({
      productType: "rental_dress",
    });
    expect(allowed).toEqual(["appointment_booking", "wishlist"]);
    expect(allowed).not.toContain("add_to_cart");
    expect(allowed).not.toContain("buy_now");
  });

  it("bridal accessory allows cart actions, not appointment", () => {
    const allowed = allowedFeatureIdsForProduct({
      productType: "bridal_accessory",
    });
    expect(allowed).toContain("add_to_cart");
    expect(allowed).toContain("buy_now");
    expect(allowed).not.toContain("appointment_booking");
    expect(allowed).not.toContain("request_design");
  });

  it("custom design allows request_design only (+ wishlist)", () => {
    const allowed = allowedFeatureIdsForProduct({
      productType: "custom_design",
    });
    expect(allowed).toEqual(["request_design", "wishlist"]);
  });

  it("sanitize strips invalid rental + cart combo", () => {
    const cleaned = sanitizeProductFeaturesConfig(
      {
        use_custom: true,
        enabled_ids: [
          "add_to_cart",
          "buy_now",
          "appointment_booking",
          "wishlist",
        ],
      },
      { productType: "rental_dress" }
    );
    expect(cleaned?.enabled_ids).toEqual([
      "appointment_booking",
      "wishlist",
    ]);
  });

  it("resolveEnabledFeatureIds never returns cart for rental", () => {
    const ids = resolveEnabledFeatureIds({
      productType: "rental_dress",
      features_config: {
        use_custom: true,
        enabled_ids: ["add_to_cart", "buy_now", "appointment_booking"],
      },
    });
    expect(ids).toEqual(["appointment_booking"]);
    expect(ids).not.toContain("add_to_cart");
  });
});
