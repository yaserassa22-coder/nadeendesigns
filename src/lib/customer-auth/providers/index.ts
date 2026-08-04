import { registerAuthProvider } from "./registry";
import { WhatsAppAuthProvider } from "./whatsapp";
import { GoogleAuthProvider } from "./google";
import { AppleAuthProvider } from "./apple";
import { GuestAuthProvider } from "./guest";
import { EmailAuthProvider } from "./email";

let registered = false;

/**
 * Discover / register all customer auth providers.
 * Add a new login method: implement AuthProvider → call registerAuthProvider here.
 */
export function ensureAuthProvidersRegistered(): void {
  if (registered) return;
  registerAuthProvider(WhatsAppAuthProvider);
  registerAuthProvider(GoogleAuthProvider);
  registerAuthProvider(AppleAuthProvider);
  registerAuthProvider(GuestAuthProvider);
  registerAuthProvider(EmailAuthProvider);
  registered = true;
}

export {
  registerAuthProvider,
  getAuthProvider,
  listAuthProviders,
  listAuthProvidersByCapability,
  getPublicAuthProviders,
  getPrimaryPublicProviders,
} from "./registry";

export type {
  AuthProvider,
  AuthCapability,
  AuthProviderPublic,
  AuthEnvFlags,
  LocalizedLabel,
  StartOAuthResult,
} from "./types";

export { toPublicProvider } from "./types";

export {
  WhatsAppAuthProvider,
  GoogleAuthProvider,
  AppleAuthProvider,
  GuestAuthProvider,
  EmailAuthProvider,
};
