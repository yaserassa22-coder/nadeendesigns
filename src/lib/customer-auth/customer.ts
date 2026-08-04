import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  customerKeyFromContact,
  referralCodeFromId,
  syntheticEmailFromPhone,
} from "@/lib/customer-auth/otp";
import type { CustomerProfile } from "@/types/customer-auth";

const ADMIN_ROLES = new Set(["admin", "owner", "manager", "staff"]);

export async function getProfileRole(
  userId: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    return (data?.role as string | null) ?? null;
  } catch {
    return null;
  }
}

export function isAdminRole(role?: string | null): boolean {
  if (!role) return false;
  return ADMIN_ROLES.has(role.toLowerCase());
}

/** True when the authenticated user has an admin profile row. */
export async function isAdminUser(user?: User | null): Promise<boolean> {
  if (!user) return false;
  const role = await getProfileRole(user.id);
  return isAdminRole(role);
}

export async function getCustomerByAuthUserId(
  authUserId: string
): Promise<CustomerProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, "customers")) return null;
    return null;
  }
  return data as CustomerProfile | null;
}

export async function getCustomerByPhoneOrEmail(params: {
  phone?: string | null;
  email?: string | null;
}): Promise<CustomerProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createAdminClient();

  if (params.phone) {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("phone", params.phone)
      .maybeSingle();
    if (data) return data as CustomerProfile;
  }
  if (params.email) {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .ilike("email", params.email.trim())
      .maybeSingle();
    if (data) return data as CustomerProfile;
  }
  return null;
}

export async function upsertCustomerForAuthUser(params: {
  authUserId: string;
  phone?: string | null;
  email?: string | null;
  fullName?: string | null;
  photoUrl?: string | null;
}): Promise<CustomerProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createAdminClient();

  const existing = await getCustomerByAuthUserId(params.authUserId);
  const phone = params.phone ?? existing?.phone ?? null;
  const email =
    params.email && !params.email.endsWith("@customers.nadeendesigns.local")
      ? params.email
      : existing?.email ?? null;
  const key =
    customerKeyFromContact(phone, email) ??
    existing?.customer_key ??
    `u:${params.authUserId}`;

  const now = new Date().toISOString();

  if (existing) {
    const { data, error } = await supabase
      .from("customers")
      .update({
        phone: phone ?? existing.phone,
        email: email ?? existing.email,
        full_name: params.fullName?.trim() || existing.full_name,
        photo_url: params.photoUrl ?? existing.photo_url,
        customer_key: key,
        last_login_at: now,
        login_count: (existing.login_count ?? 0) + 1,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) return existing;
    return data as CustomerProfile;
  }

  // Link by phone/email if guest row exists
  const byContact = await getCustomerByPhoneOrEmail({ phone, email });
  if (byContact) {
    const { data, error } = await supabase
      .from("customers")
      .update({
        auth_user_id: params.authUserId,
        phone: phone ?? byContact.phone,
        email: email ?? byContact.email,
        full_name: params.fullName?.trim() || byContact.full_name,
        photo_url: params.photoUrl ?? byContact.photo_url,
        customer_key: key,
        last_login_at: now,
        login_count: (byContact.login_count ?? 0) + 1,
        updated_at: now,
      })
      .eq("id", byContact.id)
      .select("*")
      .single();
    if (!error && data) return data as CustomerProfile;
  }

  const id = crypto.randomUUID();
  const row = {
    id,
    auth_user_id: params.authUserId,
    customer_key: key,
    full_name: params.fullName?.trim() || "",
    phone,
    email,
    photo_url: params.photoUrl ?? null,
    preferred_language: "ar",
    referral_code: referralCodeFromId(id),
    last_login_at: now,
    login_count: 1,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("customers")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    if (isMissingTableError(error, "customers")) return null;
    console.error("upsertCustomerForAuthUser", error.message);
    return null;
  }
  return data as CustomerProfile;
}

export async function requireCustomerApi(): Promise<
  | { user: User; customer: CustomerProfile; error: null }
  | { user: null; customer: null; error: Response }
> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      user: null,
      customer: null,
      error: Response.json({ error: "يجب تسجيل الدخول" }, { status: 401 }),
    };
  }

  // Admins are not customer-account users unless they also have a customer row
  const customer = await getCustomerByAuthUserId(user.id);
  if (!customer) {
    // Auto-provision non-admin users
    const isAdmin = await isAdminUser(user);
    if (isAdmin) {
      return {
        user: null,
        customer: null,
        error: Response.json(
          { error: "حساب الإدارة لا يستخدم بوابة العملاء" },
          { status: 403 }
        ),
      };
    }
    const provisioned = await upsertCustomerForAuthUser({
      authUserId: user.id,
      email: user.email,
      phone: user.phone,
      fullName:
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        "",
      photoUrl:
        (user.user_metadata?.avatar_url as string | undefined) ||
        (user.user_metadata?.picture as string | undefined) ||
        null,
    });
    if (!provisioned) {
      return {
        user: null,
        customer: null,
        error: Response.json(
          { error: "تعذّر إنشاء ملف العميل" },
          { status: 500 }
        ),
      };
    }
    return { user, customer: provisioned, error: null };
  }

  return { user, customer, error: null };
}

/**
 * Create or find auth user for phone OTP, then establish a cookie session
 * via magic-link token exchange (server-side).
 */
export async function establishPhoneSession(params: {
  e164: string;
  fullName?: string;
}): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase غير مُعد" };
  }

  const admin = createAdminClient();
  const email = syntheticEmailFromPhone(params.e164);

  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      data: {
        is_customer: true,
        full_name: params.fullName || "",
        phone: params.e164,
      },
    },
  });

  if (link.error || !link.data?.user) {
    return {
      ok: false,
      error: link.error?.message || "تعذّر إنشاء الحساب",
    };
  }

  const userId = link.data.user.id;
  const hashed = link.data.properties?.hashed_token;
  if (!hashed) {
    return { ok: false, error: "تعذّر إنشاء الجلسة" };
  }

  // Keep phone confirmed on the auth user when possible
  await admin.auth.admin.updateUserById(userId, {
    phone: params.e164,
    phone_confirm: true,
    user_metadata: {
      is_customer: true,
      full_name: params.fullName || "",
      phone: params.e164,
    },
  });

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: hashed,
    type: "email",
  });

  if (error) {
    return { ok: false, error: error.message || "فشل تسجيل الدخول" };
  }

  await upsertCustomerForAuthUser({
    authUserId: userId,
    phone: params.e164,
    fullName: params.fullName,
  });

  return { ok: true, userId };
}

export async function recordLoginHistory(params: {
  customerId?: string | null;
  authUserId?: string | null;
  method: string;
  success: boolean;
  ip?: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown>;
}) {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = createAdminClient();
    await supabase.from("login_history").insert({
      customer_id: params.customerId ?? null,
      auth_user_id: params.authUserId ?? null,
      method: params.method,
      success: params.success,
      ip_address: params.ip ?? null,
      user_agent: params.userAgent ?? null,
      meta: params.meta ?? {},
    });
  } catch {
    // non-fatal
  }
}

export async function recordCustomerSession(params: {
  customerId: string;
  authUserId: string;
  remember?: boolean;
  ip?: string | null;
  userAgent?: string | null;
}) {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = createAdminClient();
    await supabase.from("customer_sessions").insert({
      customer_id: params.customerId,
      auth_user_id: params.authUserId,
      remember_device: Boolean(params.remember),
      ip_address: params.ip ?? null,
      user_agent: params.userAgent ?? null,
      last_seen_at: new Date().toISOString(),
    });
  } catch {
    // non-fatal when table missing
  }
}
