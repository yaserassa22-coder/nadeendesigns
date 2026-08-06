import { describe, expect, it } from "vitest";
import {
  SEED_CATEGORIES,
  buildAdminProductSidebarGroups,
  isRentalGroupCategory,
} from "../../types/category";

describe("admin rental sidebar groups", () => {
  it("treats rental as parent and lists wedding/nouf as children", () => {
    const g = buildAdminProductSidebarGroups(SEED_CATEGORIES);
    expect(g.rentalParent).toBeTruthy();
    expect(isRentalGroupCategory(g.rentalParent!)).toBe(true);
    const childKeys = g.rentalChildren.map((c) => c.legacy_key);
    expect(childKeys).toContain("wedding");
    expect(childKeys).toContain("nouf_dresses");
    expect(childKeys).not.toContain("rental");
  });

  it("includes a newly parented rental child automatically", () => {
    const rental = SEED_CATEGORIES.find((c) => c.legacy_key === "rental")!;
    const evening = {
      ...SEED_CATEGORIES[0]!,
      id: "evening-test-id",
      name_ar: "فساتين سهرة",
      slug: "evening-dresses",
      legacy_key: "evening_dresses",
      parent_id: rental.id,
      product_kind: "dress" as const,
    };
    const g = buildAdminProductSidebarGroups([...SEED_CATEGORIES, evening]);
    expect(g.rentalChildren.some((c) => c.slug === "evening-dresses")).toBe(
      true
    );
  });
});
