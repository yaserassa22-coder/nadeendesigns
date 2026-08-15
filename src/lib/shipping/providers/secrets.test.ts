import { describe, expect, it } from "vitest";
import {
  assertNoSecretLeak,
  maskProviderSecrets,
  mergeSecretPatch,
  SECRET_MASK,
} from "./secrets";
import { israelPostAdapter } from "../carriers/israel-post";
import { toPublicProvider } from "./public";
import type { ShippingProviderRow } from "./types";

const row: ShippingProviderRow = {
  code: "israel_post",
  enabled: true,
  environment: "test",
  public_config: { account_id: "acc-1" },
  enabled_services: [],
  last_test_at: null,
  last_test_ok: null,
  last_test_message: null,
  is_active_provider: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("shipping provider secrets", () => {
  it("GET provider config masks secrets and never returns plaintext", () => {
    const secrets = {
      api_key: "live-secret-key-value",
      api_secret: "super-secret-value",
      password: "hunter2",
    };
    const pub = toPublicProvider(israelPostAdapter, row, secrets, true);
    expect(JSON.stringify(pub)).not.toContain("live-secret-key-value");
    expect(JSON.stringify(pub)).not.toContain("super-secret-value");
    expect(JSON.stringify(pub)).not.toContain("hunter2");
    expect(pub.secrets_masked.api_key).toBe(SECRET_MASK);
    expect(pub.api_key).toBe(SECRET_MASK);
    expect(pub.api_secret_set).toBe(true);
    expect(assertNoSecretLeak(pub)).toEqual([]);
  });

  it("omits masked secrets when the viewer cannot manage settings", () => {
    const pub = toPublicProvider(
      israelPostAdapter,
      row,
      { api_key: "live-secret-key-value" },
      false
    );
    expect(pub.secrets_masked).toEqual({});
    expect(pub.api_key).toBeUndefined();
    expect(JSON.stringify(pub)).not.toContain("live-secret-key-value");
  });

  it("blank secret on save keeps previous", () => {
    const current = { api_key: "keep-me", api_secret: "also-keep" };
    const next = mergeSecretPatch(current, {
      api_key: "",
      api_secret: "••••••••",
      password: "   ",
    });
    expect(next.api_key).toBe("keep-me");
    expect(next.api_secret).toBe("also-keep");
    expect(next.password).toBeUndefined();
  });

  it("non-empty secret on save replaces previous", () => {
    const next = mergeSecretPatch(
      { api_key: "old" },
      { api_key: "new-key-value" }
    );
    expect(next.api_key).toBe("new-key-value");
  });

  it("maskProviderSecrets uses bullets only", () => {
    const masked = maskProviderSecrets(
      { api_key: "abcd1234" },
      ["api_key", "api_secret"]
    );
    expect(masked.secrets_masked.api_key).toBe(SECRET_MASK);
    expect(masked.secrets_masked.api_secret).toBe("");
    expect(masked.api_secret_set).toBe(false);
  });
});
