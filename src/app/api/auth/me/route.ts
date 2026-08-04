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

export async function GET() {
  const settings = await getCustomerAuthSettings();
  const flags = getAuthEnvFlags();

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      user: null,
      customer: null,
      settings: {
        ...settings,
        google_ready: false,
        apple_ready: false,
        otp_ready: false,
        email_ready: false,
      },
      flags,
    });
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({
      user: null,
      customer: null,
      settings: {
        ...settings,
        google_ready: settings.google_enabled && flags.googleConfigured,
        apple_ready: settings.apple_enabled && flags.appleConfigured,
        otp_ready: settings.otp_enabled,
        email_ready: settings.email_password_enabled,
      },
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
    settings: {
      ...settings,
      google_ready: settings.google_enabled && flags.googleConfigured,
      apple_ready: settings.apple_enabled && flags.appleConfigured,
      otp_ready: settings.otp_enabled,
      email_ready: settings.email_password_enabled,
    },
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
