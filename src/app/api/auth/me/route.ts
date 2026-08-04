import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  getAuthEnvFlags,
  getCustomerAuthSettings,
} from "@/lib/customer-auth/settings";
import {
  getCustomerByAuthUserId,
  isAdminUser,
} from "@/lib/customer-auth/customer";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  ensureAuthProvidersRegistered,
  getPublicAuthProviders,
} from "@/lib/customer-auth/providers";

function buildSettingsPayload(
  settings: Awaited<ReturnType<typeof getCustomerAuthSettings>>,
  flags: ReturnType<typeof getAuthEnvFlags>
) {
  ensureAuthProvidersRegistered();
  const providers = getPublicAuthProviders(settings, flags);
  const byId = Object.fromEntries(providers.map((p) => [p.id, p]));

  return {
    ...settings,
    // Backward-compat ready flags for older clients
    google_ready: byId.google?.ready ?? false,
    apple_ready: byId.apple?.ready ?? false,
    otp_ready: byId.whatsapp?.ready ?? false,
    email_ready: byId.email?.ready ?? false,
    providers,
  };
}

export async function GET() {
  const settings = await getCustomerAuthSettings();
  const flags = getAuthEnvFlags();

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      user: null,
      customer: null,
      settings: buildSettingsPayload(settings, {
        ...flags,
        supabaseConfigured: false,
        googleConfigured: false,
        appleConfigured: false,
      }),
      flags,
    });
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({
      user: null,
      customer: null,
      settings: buildSettingsPayload(settings, flags),
      flags,
    });
  }

  const admin = await isAdminUser(user);
  const customer = admin ? null : await getCustomerByAuthUserId(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
    },
    customer,
    is_admin: admin,
    settings: buildSettingsPayload(settings, flags),
    flags,
  });
}

export async function DELETE() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true });
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
