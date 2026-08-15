import type { LocalizedProviderLabel } from "@/lib/commerce/types";
import { MANUAL_ADAPTER_CODE } from "../carriers/manual";
import type { ShippingProviderRow } from "./types";

export const PROVIDER_CODE_RE = /^[a-z][a-z0-9_]{1,31}$/;
export const RESERVED_PROVIDER_CODES = new Set(["noop", MANUAL_ADAPTER_CODE]);

const KEY_LABEL_AR = "_label_ar";
const KEY_LABEL_HE = "_label_he";
const KEY_LABEL_EN = "_label_en";
const KEY_ADAPTER = "_adapter";
const KEY_DISMISSED = "_dismissed";

export function normalizeProviderCode(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

export function isReservedProviderCode(code: string): boolean {
  return RESERVED_PROVIDER_CODES.has(code.trim().toLowerCase());
}

export function isDismissedProvider(row: ShippingProviderRow): boolean {
  return row.public_config[KEY_DISMISSED] === "1";
}

export function adapterCodeFromRow(row: ShippingProviderRow): string {
  const fromConfig = (row.public_config[KEY_ADAPTER] || "").trim().toLowerCase();
  if (fromConfig) return fromConfig;
  return row.code;
}

export function labelsFromRow(
  row: ShippingProviderRow,
  fallback: LocalizedProviderLabel
): LocalizedProviderLabel {
  const ar = row.public_config[KEY_LABEL_AR]?.trim();
  const he = row.public_config[KEY_LABEL_HE]?.trim();
  const en = row.public_config[KEY_LABEL_EN]?.trim();
  return {
    ar: ar || fallback.ar,
    he: he || fallback.he || ar || fallback.en,
    en: en || fallback.en || ar || fallback.ar,
  };
}

export function catalogPublicConfig(input: {
  label: LocalizedProviderLabel;
  adapterCode: string;
  dismissed?: boolean;
  extra?: Record<string, string>;
}): Record<string, string> {
  const extra = { ...(input.extra ?? {}) };
  delete extra[KEY_LABEL_AR];
  delete extra[KEY_LABEL_HE];
  delete extra[KEY_LABEL_EN];
  delete extra[KEY_ADAPTER];
  delete extra[KEY_DISMISSED];
  return {
    ...extra,
    [KEY_LABEL_AR]: input.label.ar,
    [KEY_LABEL_HE]: input.label.he,
    [KEY_LABEL_EN]: input.label.en,
    [KEY_ADAPTER]: input.adapterCode,
    [KEY_DISMISSED]: input.dismissed ? "1" : "",
  };
}

export function stripCatalogKeys(
  config: Record<string, string>
): Record<string, string> {
  const out = { ...config };
  delete out[KEY_LABEL_AR];
  delete out[KEY_LABEL_HE];
  delete out[KEY_LABEL_EN];
  delete out[KEY_ADAPTER];
  delete out[KEY_DISMISSED];
  return out;
}
