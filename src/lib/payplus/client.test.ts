import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  isPayPlusInvoiceModuleEnabled,
  mapPayPlusStatusCode,
  payplusOrderIdFromPayload,
  sanitizePayPlusPayload,
  verifyPayPlusCallbackHash,
} from "./client";

describe("PayPlus helpers", () => {
  it("verifies official HMAC-SHA256 base64 callback hash", () => {
    const body = JSON.stringify({
      transaction: { uid: "abc", status_code: "000", more_info: "order-1" },
    });
    const secret = "test-secret";
    const hash = createHmac("sha256", secret).update(body).digest("base64");
    expect(
      verifyPayPlusCallbackHash({
        rawBody: body,
        headers: { hash, "user-agent": "PayPlus" },
        secretKey: secret,
      })
    ).toBe(true);
  });

  it("rejects invalid hash and wrong user-agent", () => {
    const body = '{"ok":true}';
    expect(
      verifyPayPlusCallbackHash({
        rawBody: body,
        headers: { hash: "nope", "user-agent": "PayPlus" },
        secretKey: "secret",
      })
    ).toBe(false);
    expect(
      verifyPayPlusCallbackHash({
        rawBody: body,
        headers: {
          hash: createHmac("sha256", "secret").update(body).digest("base64"),
          "user-agent": "Mozilla",
        },
        secretKey: "secret",
      })
    ).toBe(false);
  });

  it("strips card and secret fields from stored payloads", () => {
    const clean = sanitizePayPlusPayload({
      transaction: { uid: "t1", status_code: "000" },
      card_information: { four_digits: "1234", cvv: "999" },
      data: { secret_key: "hidden", amount: 10 },
    }) as Record<string, unknown>;
    expect(clean.card_information).toBeUndefined();
    expect((clean.data as Record<string, unknown>).secret_key).toBeUndefined();
    expect((clean.data as Record<string, unknown>).amount).toBe(10);
    expect((clean.transaction as Record<string, unknown>).uid).toBe("t1");
  });

  it("maps PayPlus status codes", () => {
    expect(mapPayPlusStatusCode("000")).toBe("succeeded");
    expect(mapPayPlusStatusCode("001")).toBe("failed");
    expect(mapPayPlusStatusCode("cancelled")).toBe("cancelled");
    expect(mapPayPlusStatusCode("")).toBe("processing");
  });

  it("reads order id from more_info", () => {
    expect(
      payplusOrderIdFromPayload({
        transaction: { more_info: "order-42" },
      })
    ).toBe("order-42");
  });

  it("gates invoice module until Admin enables it", () => {
    expect(isPayPlusInvoiceModuleEnabled({})).toBe(false);
    expect(isPayPlusInvoiceModuleEnabled({ invoice_module_enabled: "false" })).toBe(
      false
    );
    expect(isPayPlusInvoiceModuleEnabled({ invoice_module_enabled: "true" })).toBe(
      true
    );
  });
});
