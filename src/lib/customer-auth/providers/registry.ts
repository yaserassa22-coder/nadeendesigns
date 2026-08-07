import type { CustomerAuthSettings } from "@/types/customer-auth";
import type {
  AuthEnvFlags,
  AuthProvider,
  AuthProviderPublic,
} from "./types";
import { toPublicProvider } from "./types";

const providers = new Map<string, AuthProvider>();

/** Register (or replace) an auth provider module. */
export function registerAuthProvider(provider: AuthProvider): void {
  providers.set(provider.id, provider);
}

export function getAuthProvider(id: string): AuthProvider | undefined {
  return providers.get(id);
}

export function listAuthProviders(): AuthProvider[] {
  return [...providers.values()].sort((a, b) => a.order - b.order);
}

export function listAuthProvidersByCapability(
  capability: AuthProvider["capabilities"][number]
): AuthProvider[] {
  return listAuthProviders().filter((p) =>
    p.capabilities.includes(capability)
  );
}

/** Public catalog for UI / /api/auth/me — sorted, with enabled/ready resolved. */
export function getPublicAuthProviders(
  settings: CustomerAuthSettings,
  flags: AuthEnvFlags
): AuthProviderPublic[] {
  const fromRegistry = listAuthProviders()
    .map((p) => toPublicProvider(p, settings, flags))
    .filter((p) => p.visible);

  const knownIds = new Set(fromRegistry.map((p) => p.id));

  // Channel rows without a code module yet (e.g. Facebook) still appear as قريباً
  const extras: AuthProviderPublic[] = settings.channels
    .filter((c) => !knownIds.has(c.id) && (c.enabled || c.coming_soon))
    .map((c) => ({
      id: c.id,
      label: { ar: c.label_ar, en: c.label_en },
      capabilities: [],
      order: c.sort_order,
      primary: false,
      enabled: false,
      ready: Boolean(c.configured),
      comingSoon: true,
      visible: true,
    }));

  return [...fromRegistry, ...extras].sort((a, b) => a.order - b.order);
}

/** Primary enabled providers for the login choice screen. */
export function getPrimaryPublicProviders(
  settings: CustomerAuthSettings,
  flags: AuthEnvFlags
): AuthProviderPublic[] {
  return getPublicAuthProviders(settings, flags).filter(
    (p) => p.primary && p.enabled && !p.comingSoon && p.ready
  );
}

/** Reserved future slots (e.g. WhatsApp “قريباً”) for the login modal. */
export function getComingSoonPublicProviders(
  settings: CustomerAuthSettings,
  flags: AuthEnvFlags
): AuthProviderPublic[] {
  return getPublicAuthProviders(settings, flags).filter((p) => p.comingSoon);
}

export function clearAuthProviderRegistry(): void {
  providers.clear();
}
