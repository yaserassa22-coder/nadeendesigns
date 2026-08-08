import type { PaymentProvider } from "./types";

const providers = new Map<string, PaymentProvider>();

export function registerPaymentProvider(provider: PaymentProvider): void {
  providers.set(provider.id, provider);
}

export function getPaymentProvider(id: string): PaymentProvider | undefined {
  return providers.get(id);
}

export function listPaymentProviders(): PaymentProvider[] {
  return [...providers.values()].sort(
    (a, b) => a.defaultSortOrder - b.defaultSortOrder
  );
}

export function clearPaymentProviderRegistry(): void {
  providers.clear();
}
