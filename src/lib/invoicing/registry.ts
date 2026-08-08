import type { InvoiceProvider } from "./types";

const providers = new Map<string, InvoiceProvider>();

export function registerInvoiceProvider(provider: InvoiceProvider): void {
  providers.set(provider.id, provider);
}

export function getInvoiceProvider(id: string): InvoiceProvider | undefined {
  return providers.get(id);
}

export function listInvoiceProviders(): InvoiceProvider[] {
  return [...providers.values()];
}

export function clearInvoiceProviderRegistry(): void {
  providers.clear();
}
