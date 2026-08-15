/**
 * Manual / custom shipping company — no live carrier API.
 * Admin can add HFD, Cheetah, etc. from the panel. Tracking is not invented.
 */

import type { LocalizedProviderLabel } from "@/lib/commerce/types";
import type {
  ShippingCarrier,
  ShippingCarrierAdapter,
} from "./types";

export const MANUAL_ADAPTER_CODE = "manual";

const NO_API =
  "This shipping company has no API adapter. It can be named and enabled in Admin; tracking is entered manually if needed. No fake tracking numbers are created.";

export function createManualAdapter(opts: {
  code: string;
  label: LocalizedProviderLabel;
}): ShippingCarrierAdapter {
  const code = opts.code.trim().toLowerCase() || MANUAL_ADAPTER_CODE;

  const bind = (): ShippingCarrier => ({
    code,
    isConnected() {
      return false;
    },
    async testConnection() {
      return { ok: false, reason: "not_implemented", error: NO_API };
    },
    async createShipment() {
      return { ok: false, reason: "not_implemented", error: NO_API };
    },
    async getTrackingStatus() {
      return { ok: false, reason: "not_implemented", error: NO_API };
    },
    async cancelShipment() {
      return { ok: false, reason: "not_implemented", error: NO_API };
    },
    async getShippingLabel() {
      return { ok: false, reason: "not_implemented", error: NO_API };
    },
    async listServices() {
      return [];
    },
  });

  return {
    code,
    label: opts.label,
    implementationReady: false,
    supportsListServices: false,
    supportsCancel: false,
    requiredSecretKeys: [],
    credentialFields: [],
    bind,
  };
}

/** Template in the Add-company adapter dropdown — not a real company row. */
export const manualAdapterTemplate: ShippingCarrierAdapter = createManualAdapter({
  code: MANUAL_ADAPTER_CODE,
  label: {
    ar: "يدوي (بدون واجهة برمجية)",
    he: "ידני (ללא ממשק)",
    en: "Manual (no API)",
  },
});
