import type { CustomerAuthSettings } from "@/types/customer-auth";

/** How a provider authenticates customers. */
export type AuthCapability = "oauth" | "otp" | "guest" | "password";

export type LocalizedLabel = {
  ar: string;
  en: string;
};

/** Env / config flags used by providers (no secrets). */
export type AuthEnvFlags = {
  supabaseConfigured: boolean;
  googleConfigured: boolean;
  appleConfigured: boolean;
  whatsappConfigured: boolean;
  whatsappProvider?: string;
  smsConfigured: boolean;
  emailConfigured: boolean;
};

/** Client-safe snapshot for LoginModal / /api/auth/me. */
export type AuthProviderPublic = {
  id: string;
  label: LocalizedLabel;
  capabilities: AuthCapability[];
  order: number;
  /** Primary UX providers (Google / Apple / Guest / WhatsApp). */
  primary: boolean;
  enabled: boolean;
  ready: boolean;
  endpoints?: {
    sendOtp?: string;
    verifyOtp?: string;
    oauth?: string;
    password?: string;
  };
};

export type StartOAuthResult =
  | { ok: true; url: string }
  | { ok: false; error: string; status: number; configured?: boolean };

/**
 * Pluggable customer auth provider.
 * Add a new login channel by implementing this and registering it —
 * do not scatter provider switches through session / customer upsert.
 */
export type AuthProvider = {
  id: string;
  label: LocalizedLabel;
  capabilities: readonly AuthCapability[];
  order: number;
  primary: boolean;
  endpoints?: AuthProviderPublic["endpoints"];

  /** Settings + env gate (product toggle). */
  enabled: (
    settings: CustomerAuthSettings,
    flags: AuthEnvFlags
  ) => boolean;

  /** True when credentials / infra are configured enough to attempt login. */
  ready: (
    settings: CustomerAuthSettings,
    flags: AuthEnvFlags
  ) => boolean;

  /** OAuth providers only. */
  startOAuth?: (params: {
    next: string;
    redirectTo: string;
  }) => Promise<StartOAuthResult>;
};

export function toPublicProvider(
  provider: AuthProvider,
  settings: CustomerAuthSettings,
  flags: AuthEnvFlags
): AuthProviderPublic {
  const enabled = provider.enabled(settings, flags);
  return {
    id: provider.id,
    label: provider.label,
    capabilities: [...provider.capabilities],
    order: provider.order,
    primary: provider.primary,
    enabled,
    ready: enabled && provider.ready(settings, flags),
    endpoints: provider.endpoints,
  };
}
