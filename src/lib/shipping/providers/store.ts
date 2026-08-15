/**
 * Persist shipping provider config (non-secret) + encrypted secrets_enc.
 * secrets_enc is NEVER included in public selects.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingTableError } from "../../supabase/errors";
import { isSupabaseConfigured } from "../../supabase/env";
import { createPrivilegedClient } from "../../supabase/privileged";
import { ensureShippingCarriersRegistered } from "../carriers";
import {
  EMPTY_CARRIER_CONFIG,
  getShippingCarrier,
  getShippingCarrierAdapter,
  listShippingCarrierAdapters,
} from "../carriers/registry";
import type {
  CarrierEnvironment,
  CarrierRuntimeConfig,
  ShippingCarrier,
  ShippingCarrierAdapter,
} from "../carriers/types";
import { NoopCarrier } from "../carriers/noop";
import {
  createManualAdapter,
  MANUAL_ADAPTER_CODE,
} from "../carriers/manual";
import { marketCarrierSortIndex } from "../carriers/il-catalog";
import {
  adapterCodeFromRow,
  catalogPublicConfig,
  isDismissedProvider,
  isReservedProviderCode,
  labelsFromRow,
  normalizeProviderCode,
  PROVIDER_CODE_RE,
  stripCatalogKeys,
} from "./catalog";
import {
  decryptSecretsBlob,
  encryptSecretsMap,
  mergeSecretPatch,
  parseSecretsEnc,
  type ShippingSecretMap,
} from "./secrets";
import { toPublicProvider } from "./public";
import {
  SHIPPING_PROVIDER_SELECT,
  type ShippingProviderPublic,
  type ShippingProviderRow,
  type ShippingRateRow,
} from "./types";

type MemoryProvider = ShippingProviderRow & {
  secrets: ShippingSecretMap;
};

const memoryProviders = new Map<string, MemoryProvider>();
const memoryRates: ShippingRateRow[] = [];

function nowIso() {
  return new Date().toISOString();
}

function defaultRow(code: string): ShippingProviderRow {
  const t = nowIso();
  return {
    code,
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
  };
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
    else if (v == null) continue;
    else out[k] = String(v);
  }
  return out;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim() !== "");
}

function normalizeProviderRow(row: Record<string, unknown>): ShippingProviderRow {
  const env = row.environment === "production" ? "production" : "test";
  return {
    code: String(row.code),
    enabled: row.enabled === true,
    environment: env,
    public_config: asStringRecord(row.public_config),
    enabled_services: asStringArray(row.enabled_services),
    last_test_at: (row.last_test_at as string | null) ?? null,
    last_test_ok:
      typeof row.last_test_ok === "boolean" ? row.last_test_ok : null,
    last_test_message: (row.last_test_message as string | null) ?? null,
    is_active_provider: row.is_active_provider === true,
    created_at: String(row.created_at ?? nowIso()),
    updated_at: String(row.updated_at ?? nowIso()),
  };
}

async function client(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    return await createPrivilegedClient();
  } catch {
    return null;
  }
}

export async function loadProviderSecrets(
  supabase: SupabaseClient | null,
  code: string
): Promise<ShippingSecretMap> {
  const mem = memoryProviders.get(code);
  if (!supabase) return { ...(mem?.secrets ?? {}) };

  const { data, error } = await supabase
    .from("shipping_providers")
    .select("secrets_enc")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    if (!isMissingTableError(error, "shipping_providers")) {
      console.warn("[shipping-providers] secrets load failed", error.message);
    }
    return { ...(mem?.secrets ?? {}) };
  }
  const decrypted = decryptSecretsBlob(parseSecretsEnc(data?.secrets_enc));
  if (Object.keys(decrypted).length) return decrypted;
  return { ...(mem?.secrets ?? {}) };
}

export async function loadProviderRow(
  supabase: SupabaseClient | null,
  code: string
): Promise<ShippingProviderRow> {
  if (!supabase) {
    return memoryProviders.get(code) ?? defaultRow(code);
  }
  const { data, error } = await supabase
    .from("shipping_providers")
    .select(SHIPPING_PROVIDER_SELECT)
    .eq("code", code)
    .maybeSingle();
  if (error) {
    if (!isMissingTableError(error, "shipping_providers")) {
      console.warn("[shipping-providers] row load failed", error.message);
    }
    return memoryProviders.get(code) ?? defaultRow(code);
  }
  if (!data) return memoryProviders.get(code) ?? defaultRow(code);
  return normalizeProviderRow(data as Record<string, unknown>);
}

export async function listProviderRows(
  supabase: SupabaseClient | null
): Promise<ShippingProviderRow[]> {
  if (!supabase) return [...memoryProviders.values()];
  const { data, error } = await supabase
    .from("shipping_providers")
    .select(SHIPPING_PROVIDER_SELECT);
  if (error) {
    if (!isMissingTableError(error, "shipping_providers")) {
      console.warn("[shipping-providers] list failed", error.message);
    }
    return [...memoryProviders.values()];
  }
  return (data ?? []).map((row) =>
    normalizeProviderRow(row as Record<string, unknown>)
  );
}

export function resetShippingProviderMemoryForTests(): void {
  memoryProviders.clear();
  memoryRates.length = 0;
}

export function resolveAdapterForRow(
  row: ShippingProviderRow
): ShippingCarrierAdapter {
  ensureShippingCarriersRegistered();
  const adapterCode = adapterCodeFromRow(row);
  if (adapterCode === MANUAL_ADAPTER_CODE) {
    return createManualAdapter({
      code: row.code,
      label: labelsFromRow(row, {
        ar: row.code,
        he: row.code,
        en: row.code,
      }),
    });
  }
  const registered =
    getShippingCarrierAdapter(adapterCode) ||
    getShippingCarrierAdapter(row.code);
  if (registered && registered.code !== MANUAL_ADAPTER_CODE) {
    const label = labelsFromRow(row, registered.label);
    if (registered.code !== row.code) {
      return { ...registered, code: row.code, label };
    }
    return { ...registered, label };
  }
  return createManualAdapter({
    code: row.code,
    label: labelsFromRow(row, {
      ar: row.code,
      he: row.code,
      en: row.code,
    }),
  });
}

export function listAdapterTemplates() {
  ensureShippingCarriersRegistered();
  return listShippingCarrierAdapters().sort((a, b) =>
    a.code.localeCompare(b.code)
  );
}

async function toPublicFromRow(
  row: ShippingProviderRow,
  supabase: Awaited<ReturnType<typeof client>>,
  includeSecretsMasked: boolean
): Promise<ShippingProviderPublic> {
  const adapter = resolveAdapterForRow(row);
  const secrets = await loadProviderSecrets(supabase, row.code);
  const pub = toPublicProvider(adapter, row, secrets, includeSecretsMasked);
  if (adapter.supportsListServices) {
    const bound = adapter.bind({
      secrets,
      publicConfig: stripCatalogKeys(row.public_config),
      environment: row.environment,
      enabledServices: row.enabled_services,
    });
    pub.available_services = await bound.listServices();
  }
  return pub;
}

export async function listPublicProviders(opts: {
  includeSecretsMasked: boolean;
}): Promise<ShippingProviderPublic[]> {
  ensureShippingCarriersRegistered();
  const supabase = await client();
  const rows = await listProviderRows(supabase);
  const byCode = new Map(rows.map((r) => [r.code, r]));
  const dismissed = new Set(
    rows.filter(isDismissedProvider).map((r) => r.code)
  );

  const out: ShippingProviderPublic[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (isDismissedProvider(row)) continue;
    out.push(await toPublicFromRow(row, supabase, opts.includeSecretsMasked));
    seen.add(row.code);
  }

  for (const adapter of listShippingCarrierAdapters()) {
    if (adapter.code === MANUAL_ADAPTER_CODE) continue;
    if (seen.has(adapter.code) || dismissed.has(adapter.code)) continue;
    const row = byCode.get(adapter.code) ?? defaultRow(adapter.code);
    out.push(await toPublicFromRow(row, supabase, opts.includeSecretsMasked));
    seen.add(adapter.code);
  }

  return out.sort((a, b) => {
    const d = marketCarrierSortIndex(a.code) - marketCarrierSortIndex(b.code);
    if (d !== 0) return d;
    return a.code.localeCompare(b.code);
  });
}

export async function createCustomProvider(input: {
  code: string;
  label_ar: string;
  label_he?: string;
  label_en?: string;
  adapter_code?: string;
}): Promise<ShippingProviderPublic> {
  ensureShippingCarriersRegistered();
  const code = normalizeProviderCode(input.code);
  if (!PROVIDER_CODE_RE.test(code) || isReservedProviderCode(code)) {
    throw new Error("Invalid provider code");
  }
  const adapterCode = normalizeProviderCode(
    input.adapter_code || MANUAL_ADAPTER_CODE
  );
  const registered = getShippingCarrierAdapter(adapterCode);
  if (adapterCode !== MANUAL_ADAPTER_CODE && !registered) {
    throw new Error("Unknown adapter");
  }

  const label = {
    ar: input.label_ar.trim(),
    he: (input.label_he || input.label_ar).trim(),
    en: (input.label_en || input.label_ar).trim(),
  };
  if (!label.ar) {
    throw new Error("Provider name is required");
  }

  const supabase = await client();
  const existing = (await listProviderRows(supabase)).find((r) => r.code === code);
  if (existing && !isDismissedProvider(existing)) {
    throw new Error("Provider already exists");
  }

  const row: ShippingProviderRow = {
    ...(existing ?? defaultRow(code)),
    code,
    enabled: false,
    is_active_provider: false,
    public_config: catalogPublicConfig({
      label,
      adapterCode:
        adapterCode === MANUAL_ADAPTER_CODE
          ? MANUAL_ADAPTER_CODE
          : registered?.code || MANUAL_ADAPTER_CODE,
      extra: existing ? stripCatalogKeys(existing.public_config) : {},
    }),
    updated_at: nowIso(),
    created_at: existing?.created_at ?? nowIso(),
  };

  await saveProviderPatch({
    code,
    enabled: false,
    is_active_provider: false,
    public_config: row.public_config,
  });

  const saved = await loadProviderRow(supabase, code);
  return toPublicFromRow(
    { ...saved, public_config: { ...saved.public_config, ...row.public_config } },
    supabase,
    true
  );
}

export async function deleteProvider(codeRaw: string): Promise<void> {
  ensureShippingCarriersRegistered();
  const code = normalizeProviderCode(codeRaw);
  if (!code) throw new Error("Invalid provider code");

  const supabase = await client();
  const catalogAdapter = getShippingCarrierAdapter(code);
  const isCatalog =
    Boolean(catalogAdapter) && catalogAdapter?.code === code && code !== MANUAL_ADAPTER_CODE;

  if (isCatalog) {
    const current = await loadProviderRow(supabase, code);
    const label = labelsFromRow(current, catalogAdapter!.label);
    await saveProviderPatch({
      code,
      enabled: false,
      is_active_provider: false,
      public_config: catalogPublicConfig({
        label,
        adapterCode: code,
        dismissed: true,
        extra: stripCatalogKeys(current.public_config),
      }),
    });
    return;
  }

  memoryProviders.delete(code);
  for (let i = memoryRates.length - 1; i >= 0; i--) {
    if (memoryRates[i].provider_code === code) memoryRates.splice(i, 1);
  }
  if (!supabase) return;

  const { error } = await supabase.from("shipping_providers").delete().eq("code", code);
  if (error && !isMissingTableError(error, "shipping_providers")) {
    throw new Error(error.message);
  }
}

export type SaveProviderPatch = {
  code: string;
  enabled?: boolean;
  environment?: CarrierEnvironment;
  public_config?: Record<string, string>;
  enabled_services?: string[];
  is_active_provider?: boolean;
  secrets?: Record<string, string | undefined>;
  last_test_at?: string | null;
  last_test_ok?: boolean | null;
  last_test_message?: string | null;
};

export async function saveProviderPatch(
  patch: SaveProviderPatch
): Promise<ShippingProviderRow> {
  ensureShippingCarriersRegistered();
  const supabase = await client();
  const current = await loadProviderRow(supabase, patch.code);
  resolveAdapterForRow({
    ...current,
    public_config: patch.public_config
      ? { ...current.public_config, ...patch.public_config }
      : current.public_config,
  });
  const currentSecrets = await loadProviderSecrets(supabase, patch.code);
  const nextSecrets = mergeSecretPatch(currentSecrets, patch.secrets);

  let next: ShippingProviderRow = {
    ...current,
    enabled: patch.enabled ?? current.enabled,
    environment: patch.environment ?? current.environment,
    public_config: patch.public_config
      ? { ...current.public_config, ...patch.public_config }
      : current.public_config,
    enabled_services: patch.enabled_services ?? current.enabled_services,
    is_active_provider:
      patch.is_active_provider ?? current.is_active_provider,
    last_test_at:
      patch.last_test_at !== undefined ? patch.last_test_at : current.last_test_at,
    last_test_ok:
      patch.last_test_ok !== undefined ? patch.last_test_ok : current.last_test_ok,
    last_test_message:
      patch.last_test_message !== undefined
        ? patch.last_test_message
        : current.last_test_message,
    updated_at: nowIso(),
  };

  if (
    next.public_config._dismissed === "" ||
    next.public_config._dismissed === "0"
  ) {
    const copy = { ...next.public_config };
    delete copy._dismissed;
    next.public_config = copy;
  }

  memoryProviders.set(patch.code, { ...next, secrets: nextSecrets });

  if (!supabase) return next;

  if (next.is_active_provider) {
    await supabase
      .from("shipping_providers")
      .update({ is_active_provider: false, updated_at: nowIso() })
      .neq("code", patch.code);
    for (const [code, mem] of memoryProviders) {
      if (code !== patch.code && mem.is_active_provider) {
        memoryProviders.set(code, { ...mem, is_active_provider: false });
      }
    }
  }

  const secretsEnc = encryptSecretsMap(nextSecrets);
  const upsert = {
    code: patch.code,
    enabled: next.enabled,
    environment: next.environment,
    public_config: next.public_config,
    enabled_services: next.enabled_services,
    last_test_at: next.last_test_at,
    last_test_ok: next.last_test_ok,
    last_test_message: next.last_test_message,
    is_active_provider: next.is_active_provider,
    secrets_enc: secretsEnc,
    updated_at: next.updated_at,
    created_at: current.created_at,
  };

  const { data, error } = await supabase
    .from("shipping_providers")
    .upsert(upsert, { onConflict: "code" })
    .select(SHIPPING_PROVIDER_SELECT)
    .maybeSingle();

  if (error) {
    if (!isMissingTableError(error, "shipping_providers")) {
      console.warn("[shipping-providers] save failed", error.message);
    }
    return next;
  }
  if (data) next = normalizeProviderRow(data as Record<string, unknown>);
  memoryProviders.set(patch.code, { ...next, secrets: nextSecrets });
  return next;
}

export async function getActiveProviderRecord(): Promise<ShippingProviderRow | null> {
  ensureShippingCarriersRegistered();
  const supabase = await client();
  const rows = await listProviderRows(supabase);
  const active = rows.find(
    (r) => r.is_active_provider && r.enabled && !isDismissedProvider(r)
  );
  return active ?? null;
}

export async function bindCarrierForCode(
  code?: string | null
): Promise<ShippingCarrier> {
  ensureShippingCarriersRegistered();
  const key = (code ?? "").trim().toLowerCase();
  if (!key) return NoopCarrier;

  const supabase = await client();
  const inMemory = memoryProviders.has(key);
  const row = await loadProviderRow(supabase, key);
  const hasRow =
    inMemory ||
    (Boolean(supabase) && row.created_at !== row.updated_at) ||
    Object.keys(row.public_config).length > 0 ||
    row.enabled ||
    row.is_active_provider;

  const registered = getShippingCarrierAdapter(key);
  if (!hasRow && !inMemory && (!registered || registered.code === MANUAL_ADAPTER_CODE)) {
    return NoopCarrier;
  }
  if (isDismissedProvider(row) && !inMemory) {
    return NoopCarrier;
  }

  const adapter = resolveAdapterForRow(row);
  const secrets = await loadProviderSecrets(supabase, key);
  return adapter.bind({
    secrets,
    publicConfig: stripCatalogKeys(row.public_config),
    environment: row.environment,
    enabledServices: row.enabled_services,
  });
}

/**
 * Active enabled provider, bound with stored secrets.
 * Falls back to Noop when none is configured — order UI stays "Not connected".
 */
export async function bindActiveShippingCarrier(): Promise<ShippingCarrier> {
  const active = await getActiveProviderRecord();
  if (!active) return NoopCarrier;
  return bindCarrierForCode(active.code);
}

export function bindCarrierFromConfig(
  code: string,
  config: CarrierRuntimeConfig
): ShippingCarrier {
  ensureShippingCarriersRegistered();
  return getShippingCarrier(code, config);
}

export { EMPTY_CARRIER_CONFIG };

export async function listShippingRates(
  providerCode?: string
): Promise<ShippingRateRow[]> {
  const supabase = await client();
  if (!supabase) {
    return memoryRates.filter((r) =>
      providerCode ? r.provider_code === providerCode : true
    );
  }
  let q = supabase.from("shipping_rates").select("*").order("sort_order");
  if (providerCode) q = q.eq("provider_code", providerCode);
  const { data, error } = await q;
  if (error) {
    if (!isMissingTableError(error, "shipping_rates")) {
      console.warn("[shipping-rates] list failed", error.message);
    }
    return memoryRates.filter((r) =>
      providerCode ? r.provider_code === providerCode : true
    );
  }
  return (data ?? []).map((row) => normalizeRate(row as Record<string, unknown>));
}

function normalizeRate(row: Record<string, unknown>): ShippingRateRow {
  return {
    id: String(row.id),
    provider_code: String(row.provider_code),
    service_code: String(row.service_code),
    service_name: (row.service_name as string | null) ?? null,
    price: Number(row.price ?? 0),
    free_shipping_threshold:
      row.free_shipping_threshold == null
        ? null
        : Number(row.free_shipping_threshold),
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at ?? nowIso()),
    updated_at: String(row.updated_at ?? nowIso()),
  };
}

export async function upsertShippingRate(input: {
  id?: string;
  provider_code: string;
  service_code: string;
  service_name?: string | null;
  price: number;
  free_shipping_threshold?: number | null;
  is_active?: boolean;
  sort_order?: number;
}): Promise<ShippingRateRow> {
  await saveProviderPatch({ code: input.provider_code });
  const row: ShippingRateRow = {
    id: input.id || crypto.randomUUID(),
    provider_code: input.provider_code,
    service_code: input.service_code.trim(),
    service_name: input.service_name ?? null,
    price: input.price,
    free_shipping_threshold: input.free_shipping_threshold ?? null,
    is_active: input.is_active !== false,
    sort_order: input.sort_order ?? 0,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  const idx = memoryRates.findIndex((r) => r.id === row.id);
  if (idx >= 0) memoryRates[idx] = row;
  else memoryRates.push(row);

  const supabase = await client();
  if (!supabase) return row;

  const { data, error } = await supabase
    .from("shipping_rates")
    .upsert({
      id: row.id,
      provider_code: row.provider_code,
      service_code: row.service_code,
      service_name: row.service_name,
      price: row.price,
      free_shipping_threshold: row.free_shipping_threshold,
      is_active: row.is_active,
      sort_order: row.sort_order,
      updated_at: row.updated_at,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    if (!isMissingTableError(error, "shipping_rates")) {
      console.warn("[shipping-rates] save failed", error.message);
    }
    return row;
  }
  return data ? normalizeRate(data as Record<string, unknown>) : row;
}

export async function deleteShippingRate(id: string): Promise<void> {
  const i = memoryRates.findIndex((r) => r.id === id);
  if (i >= 0) memoryRates.splice(i, 1);
  const supabase = await client();
  if (!supabase) return;
  const { error } = await supabase.from("shipping_rates").delete().eq("id", id);
  if (error && !isMissingTableError(error, "shipping_rates")) {
    console.warn("[shipping-rates] delete failed", error.message);
  }
}
