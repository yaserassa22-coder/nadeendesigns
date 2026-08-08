/**
 * AES-256-GCM encryption for payment / invoice credentials.
 * Key: COMMERCE_SECRETS_KEY (64 hex chars = 32 bytes) preferred.
 * Fallback: SHA-256 of SUPABASE_SERVICE_ROLE_KEY (dev only — set COMMERCE_SECRETS_KEY in prod).
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type EncryptedPayload = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

function resolveKeyBytes(): Buffer {
  const hex = process.env.COMMERCE_SECRETS_KEY?.trim();
  if (hex && /^[0-9a-fA-F]{64}$/.test(hex)) {
    return Buffer.from(hex, "hex");
  }
  const fallback =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.COMMERCE_SECRETS_FALLBACK ||
    "nadeen-dev-only-commerce-secrets-key";
  return createHash("sha256").update(fallback).digest();
}

export function encryptSecret(plain: string): EncryptedPayload {
  const key = resolveKeyBytes();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: enc.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptSecret(payload: EncryptedPayload): string {
  const key = resolveKeyBytes();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(payload.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

export function maskSecret(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  if (!v) return "";
  if (v.length <= 4) return "••••";
  return `${"•".repeat(Math.min(12, v.length - 4))}${v.slice(-4)}`;
}

export function isBlankSecretInput(value: string | undefined | null): boolean {
  if (value == null) return true;
  const t = value.trim();
  return !t || t.includes("•");
}
