import { describe, expect, it } from "vitest";
import { NoopCarrier } from "./noop";
import {
  getShippingCarrier,
  listShippingCarrierAdapters,
} from "./registry";
import { ensureShippingCarriersRegistered } from "./index";
import { israelPostAdapter } from "./israel-post";

describe("NoopCarrier", () => {
  it("is not connected and writes no tracking numbers", async () => {
    expect(NoopCarrier.isConnected()).toBe(false);
    const created = await NoopCarrier.createShipment({
      orderId: "o1",
      orderNumber: "ND-AAAAAAAA",
      shipmentId: "s1",
      publicToken: "tok",
      deliveryMethod: "delivery",
    });
    expect(created.ok).toBe(false);
    if (!created.ok) expect(created.reason).toBe("not_connected");
    expect("trackingNumber" in created).toBe(false);
    const test = await NoopCarrier.testConnection();
    expect(test.ok).toBe(false);
  });

  it("unknown carrier codes resolve to noop", () => {
    ensureShippingCarriersRegistered();
    expect(getShippingCarrier("not_a_real_courier").code).toBe("noop");
    expect(getShippingCarrier(null).isConnected()).toBe(false);
  });
});

describe("shipping carrier registry", () => {
  it("lists Israel-market couriers used by online stores", async () => {
    ensureShippingCarriersRegistered();
    const codes = listShippingCarrierAdapters().map((a) => a.code);
    expect(codes).toContain("israel_post");
    expect(codes).toContain("hfd");
    expect(codes).toContain("cheetah");
    expect(codes).toContain("haat");
    expect(codes).toContain("bringy");
    expect(codes).toContain("aramex");
    expect(codes).toContain("boxit");
    expect(codes).toContain("manual");
    expect(codes).not.toContain("noop");
    expect(getShippingCarrier("hfd").isConnected()).toBe(false);
    expect(getShippingCarrier("haat").isConnected()).toBe(false);
    expect(getShippingCarrier("bringy").isConnected()).toBe(false);
    const hfdShip = await getShippingCarrier("hfd").createShipment({
      orderId: "o1",
      orderNumber: "ND-AAAAAAAA",
      shipmentId: "s1",
      publicToken: "tok",
      deliveryMethod: "delivery",
    });
    expect(hfdShip.ok).toBe(false);
    expect("trackingNumber" in hfdShip).toBe(false);
    expect(getShippingCarrier("israel_post").code).toBe("israel_post");
    expect(getShippingCarrier("israel_post").isConnected()).toBe(false);
  });
});

describe("IsraelPostAdapter", () => {
  it("never fakes Connected or invents tracking", async () => {
    const empty = israelPostAdapter.bind({
      secrets: {},
      publicConfig: {},
      environment: "test",
      enabledServices: [],
    });
    expect(empty.isConnected()).toBe(false);
    const unconfigured = await empty.testConnection();
    expect(unconfigured.ok).toBe(false);
    if (!unconfigured.ok) expect(unconfigured.reason).toBe("not_configured");

    const withKey = israelPostAdapter.bind({
      secrets: { api_key: "sk-test-not-real" },
      publicConfig: { account_id: "acc-1" },
      environment: "production",
      enabledServices: [],
    });
    expect(withKey.isConnected()).toBe(false);
    const tested = await withKey.testConnection();
    expect(tested.ok).toBe(false);
    if (!tested.ok) expect(tested.reason).toBe("not_implemented");

    const created = await withKey.createShipment({
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
