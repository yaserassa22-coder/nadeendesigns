import { registerInvoiceProvider } from "../registry";
import {
  easycountInvoiceProvider,
  greenInvoiceProvider,
  icountInvoiceProvider,
  morningInvoiceProvider,
} from "./external";
import { internalInvoiceProvider } from "./internal";

let registered = false;

export function ensureInvoiceProvidersRegistered(): void {
  if (registered) return;
  registerInvoiceProvider(internalInvoiceProvider);
  registerInvoiceProvider(greenInvoiceProvider);
  registerInvoiceProvider(morningInvoiceProvider);
  registerInvoiceProvider(icountInvoiceProvider);
  registerInvoiceProvider(easycountInvoiceProvider);
  registered = true;
}
