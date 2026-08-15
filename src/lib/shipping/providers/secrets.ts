/**
 * Shipping provider secret helpers — never send plaintext to the client.
 * Blank / masked PATCH values keep the previously stored secret.
 */

import {
  decryptSecret,
  encryptSecret,
  isBlankSecretInput,
  type EncryptedPayload,
} from "../../commerce/secrets/crypto";

export const SECRET_MASK = "••••••••";

export type ShippingSecretMap = Record<string, string>;

export type EncryptedSecretsBlob = EncryptedPayload;

export function mergeSecretPatch(
  current: ShippingSecretMap,
  patch: Record<string, string | undefined> | null | undefined
): ShippingSecretMap {
  const next: ShippingSecretMap = { ...current };
  if (!patch) return next;
  for (const [key, raw] of Object.entries(patch)) {
    if (raw === undefined) continue;
    if (isBlankSecretInput(raw)) continue;
    next[key] = raw.trim();
  }
  return next;
}

export function encryptSecretsMap(
  secrets: ShippingSecretMap
): EncryptedSecretsBlob | null {
  const clean: ShippingSecretMap = {};
  for (const [k, v] of Object.entries(secrets)) {
    if (v?.trim()) clean[k] = v.trim();
  }
  if (Object.keys(clean).length === 0) return null;
  return encryptSecret(JSON.stringify(clean));
}

export function decryptSecretsBlob(
  blob: EncryptedSecretsBlob | null | undefined
): ShippingSecretMap {
  if (!blob?.ciphertext || !blob.iv || !blob.authTag) return {};
  try {
    const raw = decryptSecret(blob);
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: ShippingSecretMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function parseSecretsEnc(value: unknown): EncryptedSecretsBlob | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const ciphertext = typeof row.ciphertext === "string" ? row.ciphertext : "";
  const iv = typeof row.iv === "string" ? row.iv : "";
  const authTag =
    typeof row.authTag === "string"
      ? row.authTag
      : typeof row.auth_tag === "string"
        ? row.auth_tag
        : "";
  if (!ciphertext || !iv || !authTag) return null;
  return { ciphertext, iv, authTag };
}

export function maskProviderSecrets(
  secrets: ShippingSecretMap,
  secretKeys: string[]
): {
  secrets_masked: Record<string, string>;
  api_secret_set: boolean;
} {
  const secrets_masked: Record<string, string> = {};
  for (const key of secretKeys) {
    secrets_masked[key] = secrets[key]?.trim() ? SECRET_MASK : "";
  }
  return {
    secrets_masked,
    api_secret_set: Boolean(secrets.api_secret?.trim()),
  };
}

/** Strip secret-like keys from any object that might leak to QR / public APIs. */
export function assertNoSecretLeak(payload: unknown): string[] {
  const leaks: string[] = [];
  const secretName = /api[_-]?secret|api[_-]?key|password|secret_key|auth_token/i;

  function walk(node: unknown, path: string) {
    if (node == null) return;
    if (typeof node === "string") {
      if (
        secretName.test(path) &&
        node.trim() &&
        !node.includes("•")
      ) {
        leaks.push(path);
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    if (typeof node === "object") {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        const next = path ? `${path}.${k}` : k;
        if (secretName.test(k) && typeof v === "string" && v.trim() && !v.includes("•")) {
          leaks.push(next);
        }
        walk(v, next);
      }
    }
  }

  walk(payload, "");
  return leaks;
}
