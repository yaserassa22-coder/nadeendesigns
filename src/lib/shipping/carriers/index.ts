import { israelPostAdapter } from "./israel-post";
import { israelMarketCarrierAdapters } from "./il-catalog";
import { manualAdapterTemplate } from "./manual";
import { registerShippingCarrierAdapter } from "./registry";

let registered = false;

/** Idempotent bootstrap — call before listing or binding adapters. */
export function ensureShippingCarriersRegistered(): void {
  if (registered) return;
  registerShippingCarrierAdapter(israelPostAdapter);
  for (const adapter of israelMarketCarrierAdapters) {
    registerShippingCarrierAdapter(adapter);
  }
  registerShippingCarrierAdapter(manualAdapterTemplate);
  registered = true;
}

export function resetShippingCarrierRegistrationForTests(): void {
  registered = false;
}
