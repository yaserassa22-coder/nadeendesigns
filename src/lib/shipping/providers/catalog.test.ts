import { describe, expect, it } from "vitest";
import { createManualAdapter } from "../carriers/manual";
import {
  adapterCodeFromRow,
  catalogPublicConfig,
  isDismissedProvider,
  isReservedProviderCode,
  labelsFromRow,
  normalizeProviderCode,
  PROVIDER_CODE_RE,
} from "./catalog";
import type { ShippingProviderRow } from "./types";

function row(partial: Partial<ShippingProviderRow> & { code: string }): ShippingProviderRow {
  const t = new Date().toISOString();
  return {
    enabled: false,
    environment: "test",
    public_config: {},
    enabled_services: [],
    last_test_at: null,
    last_test_ok: null,
    last_test_message: null,
    is_active_provider: false,
    created_at: t,
    updated_at: t,
    ...partial,
  };
}

describe("provider catalog helpers", () => {
  it("normalizes codes for admin-created companies", () => {
    expect(normalizeProviderCode("HFD Courier")).toBe("hfd_courier");
    expect(PROVIDER_CODE_RE.test("hfd")).toBe(true);
    expect(isReservedProviderCode("manual")).toBe(true);
    expect(isReservedProviderCode("noop")).toBe(true);
    expect(isReservedProviderCode("hfd")).toBe(false);
  });

  it("stores labels and adapter on the row without extra columns", () => {
    const config = catalogPublicConfig({
      label: { ar: "إتش إف دي", he: "HFD", en: "HFD" },
      adapterCode: "manual",
    });
    const r = row({ code: "hfd", public_config: config });
    expect(adapterCodeFromRow(r)).toBe("manual");
    expect(labelsFromRow(r, { ar: "x", he: "x", en: "x" }).ar).toBe("إتش إف دي");
    expect(isDismissedProvider(r)).toBe(false);
  });

  it("marks catalog adapters as dismissed after delete", () => {
    const config = catalogPublicConfig({
      label: { ar: "بريد إسرائيل", he: "דואר ישראל", en: "Israel Post" },
      adapterCode: "israel_post",
      dismissed: true,
    });
    expect(isDismissedProvider(row({ code: "israel_post", public_config: config }))).toBe(
      true
    );
  });
});

describe("manual adapter", () => {
  it("never invents tracking numbers", async () => {
    const adapter = createManualAdapter({
      code: "hfd",
      label: { ar: "HFD", he: "HFD", en: "HFD" },
    });
    const bound = adapter.bind({
      secrets: {},
      publicConfig: {},
      environment: "test",
      enabledServices: [],
    });
    expect(bound.isConnected()).toBe(false);
    const created = await bound.createShipment({
      orderId: "o1",
      orderNumber: "ND-AAAAAAAA",
      shipmentId: "s1",
      publicToken: "tok",
      deliveryMethod: "delivery",
    });
    expect(created.ok).toBe(false);
    expect("trackingNumber" in created).toBe(false);
  });
});
