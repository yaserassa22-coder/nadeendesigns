import { describe, expect, it } from "vitest";
import {
  buildCarrierReadyPayload,
  formatPublicOrderNumber,
  resolveShippingQrPayload,
} from "./order-tracking-qr";

const ORDER_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const TOKEN = "abcdefghijklmnopqrstuvwxyz012345";

describe("order tracking QR", () => {
  it("keeps ND-XXXXXXXX display format from the UUID", () => {
    expect(formatPublicOrderNumber(ORDER_ID)).toBe("ND-A1B2C3D4");
  });

  it("encodes /s/{token} and never PII or carrier tracking", () => {
    const prev = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://nadeendesigns.com";
    const payload = resolveShippingQrPayload({
      id: ORDER_ID,
      tracking_number: "HFD-999",
      carrier_code: "hfd",
      shipment: {
        public_token: TOKEN,
        carrier: "hfd",
        carrier_tracking_number: "HFD-999",
      },
    });
    process.env.NEXT_PUBLIC_SITE_URL = prev;

    expect(payload.kind).toBe("shipment_url");
    expect(payload.data).toBe(`https://nadeendesigns.com/s/${TOKEN}`);
    expect(payload.data).not.toContain("050");
    expect(payload.data).not.toContain(ORDER_ID);
    expect(payload.data).not.toContain("HFD-999");
    expect(payload.data).not.toContain("sk-live");
    expect(payload.data).not.toMatch(/api[_-]?key/i);
  });

  it("gives distinct QR payloads for two orders of the same product", () => {
    const prev = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://nadeendesigns.com";
    const a = resolveShippingQrPayload({
      id: "11111111-1111-4111-8111-111111111111",
      shipment: { public_token: "token-aaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
    });
    const b = resolveShippingQrPayload({
      id: "22222222-2222-4222-8222-222222222222",
      shipment: { public_token: "token-bbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
    });
    process.env.NEXT_PUBLIC_SITE_URL = prev;
    expect(a.data).not.toBe(b.data);
  });

  it("keeps carrier tracking out of the QR even in the carrier-ready helper", () => {
    const qr = resolveShippingQrPayload({
      id: ORDER_ID,
      shipment: { public_token: TOKEN, carrier_tracking_number: "X" },
    });
    expect(qr.data).not.toContain("X");
    const ready = buildCarrierReadyPayload({
      id: ORDER_ID,
      shipment: { public_token: TOKEN, carrier_tracking_number: "X" },
    });
    expect(ready.trackingNumber).toBe("X");
    expect(ready.shipmentPublicToken).toBe(TOKEN);
  });

  it("never encodes API credentials into the QR payload", () => {
    const prev = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://nadeendesigns.com";
    const payload = resolveShippingQrPayload({
      id: ORDER_ID,
      tracking_number: "sk-live-secret",
      carrier_code: "israel_post",
      shipment: {
        public_token: TOKEN,
        carrier: "israel_post",
        carrier_tracking_number: "api_key=sk-live-secret",
      },
    });
    process.env.NEXT_PUBLIC_SITE_URL = prev;
    expect(payload.data).toBe(`https://nadeendesigns.com/s/${TOKEN}`);
    expect(payload.data).not.toContain("sk-live-secret");
    expect(payload.data).not.toContain("api_key");
  });
});
