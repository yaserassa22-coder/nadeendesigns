import { describe, expect, it } from "vitest";
import {
  buildLocalPrimaryShipment,
  createShipmentForOrder,
  findShipmentByPublicToken,
  generateShipmentPublicToken,
  isValidShipmentPublicToken,
  toPublicShipmentView,
} from "./shipment-service";
import type { ShopOrder } from "../../types/shop";

function fakeOrder(id: string, productId = "veil-same"): ShopOrder {
  return {
    id,
    name: "سارة",
    phone: "0500000000",
    email: null,
    notes: null,
    items: [
      {
        product_type: "veil",
        product_id: productId,
        name_ar: "طرحة",
        unit_price: 100,
        quantity: 1,
      },
    ],
    gift_options: null,
    total: 100,
    status: "pending",
    created_at: new Date().toISOString(),
  };
}

describe("shipment service", () => {
  it("auto-builds a primary shipment with a unique token, no admin input", () => {
    const order = fakeOrder(crypto.randomUUID());
    const shipment = buildLocalPrimaryShipment(order);
    expect(shipment.order_id).toBe(order.id);
    expect(shipment.is_primary).toBe(true);
    expect(shipment.shipment_status).toBe("pending");
    expect(shipment.carrier_tracking_number).toBeNull();
    expect(isValidShipmentPublicToken(shipment.public_token)).toBe(true);
  });

  it("gives two shipments / two tokens when the same product is ordered twice", () => {
    const a = buildLocalPrimaryShipment(fakeOrder(crypto.randomUUID()));
    const b = buildLocalPrimaryShipment(fakeOrder(crypto.randomUUID()));
    expect(a.public_token).not.toBe(b.public_token);
    expect(a.id).not.toBe(b.id);
  });

  it("createShipmentForOrder with Noop does not invent tracking", async () => {
    const order = fakeOrder(crypto.randomUUID());
    const result = await createShipmentForOrder(null, order);
    expect(result.carrierConnected).toBe(false);
    expect(result.skipped).toBe("not_connected");
    expect(result.shipment.carrier_tracking_number).toBeNull();
    expect(result.shipment.carrier_label_url).toBeNull();
  });

  it("token lookup rejects guessed ids and accepts the real token", async () => {
    const order = fakeOrder(crypto.randomUUID());
    const created = await createShipmentForOrder(null, order);
    const withShip = { ...order, shipment: created.shipment };

    const miss = await findShipmentByPublicToken(
      null,
      order.id,
      [withShip]
    );
    expect(miss).toBeNull();

    const hit = await findShipmentByPublicToken(
      null,
      created.shipment.public_token,
      [withShip]
    );
    expect(hit?.orderId).toBe(order.id);

    const garbage = await findShipmentByPublicToken(null, "nope", [withShip]);
    expect(garbage).toBeNull();
  });

  it("public shipment view never includes secrets or QR-unsafe credentials", () => {
    const order = fakeOrder(crypto.randomUUID());
    const shipment = buildLocalPrimaryShipment(order);
    const publicView = toPublicShipmentView({
      ...shipment,
      carrier: "israel_post",
      carrier_tracking_number: "TRACK-1",
    });
    const json = JSON.stringify(publicView);
    expect(json).not.toMatch(/api[_-]?key/i);
    expect(json).not.toMatch(/api[_-]?secret/i);
    expect(publicView.public_token).toBe(shipment.public_token);
    expect(Object.keys(publicView).sort()).toEqual(
      [
        "carrier",
        "carrier_tracking_number",
        "public_token",
        "shipment_status",
      ].sort()
    );
  });

  it("generates unguessable tokens", () => {
    const tokens = new Set(
      Array.from({ length: 20 }, () => generateShipmentPublicToken())
    );
    expect(tokens.size).toBe(20);
  });
});
