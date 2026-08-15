import type {
  CarrierRuntimeConfig,
  ShippingCarrier,
  ShippingCarrierAdapter,
} from "./types";
import { NoopCarrier } from "./noop";

const adapters = new Map<string, ShippingCarrierAdapter>();

export const EMPTY_CARRIER_CONFIG: CarrierRuntimeConfig = {
  secrets: {},
  publicConfig: {},
  environment: "test",
  enabledServices: [],
};

/** Register a real courier adapter (Israel Post, HFD, …). Noop is never listed. */
export function registerShippingCarrierAdapter(
  adapter: ShippingCarrierAdapter
): void {
  const key = adapter.code.trim().toLowerCase();
  if (!key || key === "noop") return;
  adapters.set(key, adapter);
}

/** @deprecated Use registerShippingCarrierAdapter. Kept for call-site compatibility. */
export function registerShippingCarrier(carrier: {
  code: string;
} & Partial<ShippingCarrierAdapter>): void {
  if (!("bind" in carrier) || typeof carrier.bind !== "function") return;
  registerShippingCarrierAdapter(carrier as ShippingCarrierAdapter);
}

export function getShippingCarrierAdapter(
  code?: string | null
): ShippingCarrierAdapter | undefined {
  const key = (code ?? "").trim().toLowerCase();
  if (!key) return undefined;
  return adapters.get(key);
}

/**
 * Bound instance for a code. Unknown / empty → NoopCarrier.
 * Without DB credentials this is always disconnected.
 */
export function getShippingCarrier(
  code?: string | null,
  config: CarrierRuntimeConfig = EMPTY_CARRIER_CONFIG
): ShippingCarrier {
  const adapter = getShippingCarrierAdapter(code);
  if (!adapter) return NoopCarrier;
  return adapter.bind(config);
}

export function listShippingCarrierAdapters(): ShippingCarrierAdapter[] {
  return [...adapters.values()].sort((a, b) => a.code.localeCompare(b.code));
}

export function hasConnectedShippingCarrier(code?: string | null): boolean {
  return getShippingCarrier(code).isConnected();
}

export function clearShippingCarrierRegistry(): void {
  adapters.clear();
}
