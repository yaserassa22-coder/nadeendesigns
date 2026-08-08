/**
 * Persist / load encrypted provider credentials (database vault).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  decryptSecret,
  encryptSecret,
  isBlankSecretInput,
  maskSecret,
} from "./crypto";

export type SecretScope = "payment_provider" | "invoice_provider";

export type SecretMap = Record<string, string>;

/** In-memory fallback when Supabase / table missing (local dev). */
const memoryVault = new Map<string, SecretMap>();

function memKey(scope: SecretScope, scopeId: string) {
  return `${scope}:${scopeId}`;
}

export async function getSecrets(
  scope: SecretScope,
  scopeId: string
): Promise<SecretMap> {
  if (!isSupabaseConfigured()) {
    return { ...(memoryVault.get(memKey(scope, scopeId)) ?? {}) };
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("encrypted_secrets")
      .select("key_name, ciphertext, iv, auth_tag")
      .eq("scope", scope)
      .eq("scope_id", scopeId);

    if (error || !data?.length) {
      return { ...(memoryVault.get(memKey(scope, scopeId)) ?? {}) };
    }

    const out: SecretMap = {};
    for (const row of data) {
      try {
        out[row.key_name] = decryptSecret({
          ciphertext: row.ciphertext,
          iv: row.iv,
          authTag: row.auth_tag,
        });
      } catch {
        /* skip corrupt row */
      }
    }
    return out;
  } catch {
    return { ...(memoryVault.get(memKey(scope, scopeId)) ?? {}) };
  }
}

export async function getMaskedSecrets(
  scope: SecretScope,
  scopeId: string,
  keyNames: string[]
): Promise<Record<string, string>> {
  const secrets = await getSecrets(scope, scopeId);
  const out: Record<string, string> = {};
  for (const k of keyNames) {
    out[k] = secrets[k] ? maskSecret(secrets[k]) : "";
  }
  return out;
}

/**
 * Merge credential updates. Blank / masked values keep existing.
 * Empty string with clearKeys removes the key.
 */
export async function setSecrets(
  scope: SecretScope,
  scopeId: string,
  patch: Record<string, string | undefined>,
  opts?: { clearKeys?: string[]; updatedBy?: string | null }
): Promise<void> {
  const current = await getSecrets(scope, scopeId);
  const next: SecretMap = { ...current };

  for (const key of opts?.clearKeys ?? []) {
    delete next[key];
  }

  for (const [key, raw] of Object.entries(patch)) {
    if (raw === undefined) continue;
    if (isBlankSecretInput(raw)) continue;
    next[key] = raw.trim();
  }

  memoryVault.set(memKey(scope, scopeId), next);

  if (!isSupabaseConfigured()) return;

  try {
    const supabase = createAdminClient();
    // Delete removed keys
    const keep = new Set(Object.keys(next));
    const { data: existing } = await supabase
      .from("encrypted_secrets")
      .select("key_name")
      .eq("scope", scope)
      .eq("scope_id", scopeId);

    const toDelete = (existing ?? [])
      .map((r) => r.key_name as string)
      .filter((k) => !keep.has(k));

    if (toDelete.length) {
      await supabase
        .from("encrypted_secrets")
        .delete()
        .eq("scope", scope)
        .eq("scope_id", scopeId)
        .in("key_name", toDelete);
    }

    for (const [key_name, plain] of Object.entries(next)) {
      const enc = encryptSecret(plain);
      await supabase.from("encrypted_secrets").upsert(
        {
          scope,
          scope_id: scopeId,
          key_name,
          ciphertext: enc.ciphertext,
          iv: enc.iv,
          auth_tag: enc.authTag,
          updated_at: new Date().toISOString(),
          updated_by: opts?.updatedBy ?? null,
        },
        { onConflict: "scope,scope_id,key_name" }
      );
    }
  } catch (e) {
    console.error("[commerce] setSecrets failed", e);
  }
}

export async function hasAnySecret(
  scope: SecretScope,
  scopeId: string,
  requiredKeys: string[]
): Promise<boolean> {
  if (!requiredKeys.length) return true;
  const secrets = await getSecrets(scope, scopeId);
  return requiredKeys.every((k) => Boolean(secrets[k]?.trim()));
}
