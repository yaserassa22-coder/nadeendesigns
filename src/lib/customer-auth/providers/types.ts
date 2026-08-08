import type { CustomerAuthSettings } from "@/types/customer-auth";
import { getAuthChannel } from "@/types/customer-auth";

/** How a provider authenticates customers. */
export type AuthCapability = "oauth" | "otp" | "guest" | "password";

export type LocalizedLabel = {
  ar: string;
  he?: string;
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
  /** Primary UX providers (Google / Apple / Guest; WhatsApp reserved). */
  primary: boolean;
  /**
   * Product wants this channel available (admin enabled).
   * Clickable only when enabled && ready && !comingSoon.
   */
  enabled: boolean;
  ready: boolean;
  /** Reserved / not connected — show “قريباً” in UI, do not enable login. */
  comingSoon: boolean;
  /** Show in login modal (enabled or coming-soon preview). */
  visible: boolean;
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
  /** Default coming-soon when no admin channel override exists. */
  comingSoon?: boolean;
  endpoints?: AuthProviderPublic["endpoints"];

  /** Settings + env gate (product toggle) — used when no channel row. */
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
  const channel = getAuthChannel(settings, provider.id);
  const order = channel?.sort_order ?? provider.order;
  const label = {
    ar: channel?.label_ar || provider.label.ar,
    en: channel?.label_en || provider.label.en,
  };

  const productEnabled = channel
    ? channel.enabled
    : provider.enabled(settings, flags);

  const adminComingSoon = channel
    ? Boolean(channel.coming_soon)
    : Boolean(provider.comingSoon);

  const infraReady =
    provider.ready(settings, flags) || Boolean(channel?.configured);

  // Guest & email are usable without external OAuth/OTP wiring once product-on.
  const needsExternalReady =
    provider.capabilities.includes("oauth") ||
    provider.capabilities.includes("otp");

  const notConnected =
    needsExternalReady && productEnabled && !adminComingSoon && !infraReady;

  const comingSoon = adminComingSoon || notConnected;

  // Active (clickable) login
  const enabled =
    productEnabled && !comingSoon && (!needsExternalReady || infraReady);

  // Visible: admin enabled, or explicitly coming soon (preview slot)
  const visible = productEnabled || adminComingSoon;

  return {
    id: provider.id,
    label,
    capabilities: [...provider.capabilities],
    order,
    primary: provider.primary,
    enabled,
    ready: infraReady,
    comingSoon,
    visible,
    endpoints: provider.endpoints,
  };
}
