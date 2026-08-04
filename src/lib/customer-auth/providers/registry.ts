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
  return listAuthProviders().map((p) =>
    toPublicProvider(p, settings, flags)
  );
}

/** Primary enabled providers for the login choice screen. */
export function getPrimaryPublicProviders(
  settings: CustomerAuthSettings,
  flags: AuthEnvFlags
): AuthProviderPublic[] {
  return getPublicAuthProviders(settings, flags).filter(
    (p) => p.primary && p.enabled
  );
}

export function clearAuthProviderRegistry(): void {
  providers.clear();
}
