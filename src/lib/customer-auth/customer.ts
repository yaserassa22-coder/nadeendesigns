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
import { isAdminRole } from "@/lib/auth/roles";
import type { CustomerProfile } from "@/types/customer-auth";
import {
  mergeGuestIntoCustomer,
  type GuestMergeDetail,
} from "@/lib/guest/merge";

export { isAdminRole, ADMIN_ROLES } from "@/lib/auth/roles";

/**
 * Read profiles.role for a user.
 * Prefer service role (bypasses RLS). Fall back to the cookie-authenticated
 * server client — never a bare anon client without a session (RLS would
 * hide the row and falsely treat admins as non-admin).
 */
export async function getProfileRole(
  userId: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        console.warn("[getProfileRole] service", error.message);
        return null;
      }
      return (data?.role as string | null) ?? null;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.warn("[getProfileRole] session", error.message);
      return null;
    }
    return (data?.role as string | null) ?? null;
  } catch {
    return null;
  }
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

export type GuestMergeSummary = {
  orders: number;
  bookings: number;
  wishlist: number;
  addresses: number;
  guest_rows_linked: number;
  guest_session?: GuestMergeDetail | null;
};

/**
 * Attach historical guest shop_orders / bookings (null customer_id) matching
 * phone/email, and merge orphan guest wishlist/addresses into the registered row.
 */
export async function attachGuestOrdersToCustomer(params: {
  customerId: string;
  phone?: string | null;
  email?: string | null;
}): Promise<GuestMergeSummary> {
  const summary: GuestMergeSummary = {
    orders: 0,
    bookings: 0,
    wishlist: 0,
    addresses: 0,
    guest_rows_linked: 0,
    guest_session: null,
  };
  if (!isSupabaseConfigured()) return summary;
  try {
    const supabase = createAdminClient();
    const phone = params.phone?.trim();
    const email = params.email?.trim();

    if (phone) {
      const { data: orders } = await supabase
        .from("shop_orders")
        .update({ customer_id: params.customerId })
        .is("customer_id", null)
        .eq("phone", phone)
        .select("id");
      summary.orders += orders?.length ?? 0;

      const { data: bookings } = await supabase
        .from("bookings")
        .update({ customer_id: params.customerId })
        .is("customer_id", null)
        .eq("phone", phone)
        .select("id");
      summary.bookings += bookings?.length ?? 0;
    }
    if (email) {
      const { data: orders } = await supabase
        .from("shop_orders")
        .update({ customer_id: params.customerId })
        .is("customer_id", null)
        .ilike("email", email)
        .select("id");
      summary.orders += orders?.length ?? 0;

      const { data: bookings } = await supabase
        .from("bookings")
        .update({ customer_id: params.customerId })
        .is("customer_id", null)
        .ilike("email", email)
        .select("id");
      summary.bookings += bookings?.length ?? 0;
    }

    // Merge wishlist / addresses from other guest customer rows with same contact
    const orphanIds: string[] = [];
    if (phone) {
      const { data } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", phone)
        .neq("id", params.customerId)
        .is("auth_user_id", null);
      for (const r of data ?? []) orphanIds.push(String(r.id));
    }
    if (email) {
      const { data } = await supabase
        .from("customers")
        .select("id")
        .ilike("email", email)
        .neq("id", params.customerId)
        .is("auth_user_id", null);
      for (const r of data ?? []) {
        const id = String(r.id);
        if (!orphanIds.includes(id)) orphanIds.push(id);
      }
    }

    summary.guest_rows_linked = orphanIds.length;
    for (const orphanId of orphanIds) {
      const { data: wish } = await supabase
        .from("wishlist_items")
        .update({ customer_id: params.customerId })
        .eq("customer_id", orphanId)
        .select("id");
      summary.wishlist += wish?.length ?? 0;

      const { data: addrs } = await supabase
        .from("customer_addresses")
        .update({ customer_id: params.customerId })
        .eq("customer_id", orphanId)
        .select("id");
      summary.addresses += addrs?.length ?? 0;
    }
  } catch {
    // non-fatal — soft phone/email match still works on account orders API
  }
  return summary;
}

/**
 * Ensure a customers row for checkout (guest or registered).
 * Returns customer id for shop_orders.customer_id.
 */
export async function ensureCustomerForCheckout(params: {
  fullName: string;
  phone: string;
  email?: string | null;
  authUserId?: string | null;
}): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  if (params.authUserId) {
    const registered = await upsertCustomerForAuthUser({
      authUserId: params.authUserId,
      phone: params.phone,
      email: params.email,
      fullName: params.fullName,
    });
    return registered?.id ?? null;
  }

  const supabase = createAdminClient();
  const phone = params.phone.trim();
  const email = params.email?.trim() || null;
  const existing = await getCustomerByPhoneOrEmail({ phone, email });
  const now = new Date().toISOString();
  const key = customerKeyFromContact(phone, email);

  if (existing) {
    const { data, error } = await supabase
      .from("customers")
      .update({
        full_name: params.fullName.trim() || existing.full_name,
        phone: phone || existing.phone,
        email: email || existing.email,
        customer_key: key ?? existing.customer_key,
        // Keep registered status if they already have auth
        is_guest: existing.auth_user_id ? false : true,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("id")
      .single();
    if (!error && data) return data.id as string;
    return existing.id;
  }

  const id = crypto.randomUUID();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      id,
      auth_user_id: null,
      is_guest: true,
      provider: "guest",
      customer_key: key,
      full_name: params.fullName.trim() || "",
      phone,
      email,
      preferred_language: "ar",
      referral_code: referralCodeFromId(id),
      login_count: 0,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error) {
    if (isMissingTableError(error, "customers")) return null;
    // is_guest column may be missing pre-029 — retry without it
    if (/is_guest|PGRST204|42703/i.test(error.message)) {
      const retry = await supabase
        .from("customers")
        .insert({
          id,
          auth_user_id: null,
          customer_key: key,
          full_name: params.fullName.trim() || "",
          phone,
          email,
          preferred_language: "ar",
          referral_code: referralCodeFromId(id),
          login_count: 0,
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single();
      if (!retry.error && retry.data) return retry.data.id as string;
    }
    console.warn("ensureCustomerForCheckout", error.message);
    return null;
  }
  return data?.id as string;
}

export async function upsertCustomerForAuthUser(params: {
  authUserId: string;
  phone?: string | null;
  email?: string | null;
  fullName?: string | null;
  photoUrl?: string | null;
  provider?: string | null;
  /** Phase G guest cookie — merge wishlist/cart/orders keyed by guest_id */
  guestId?: string | null;
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
  const provider =
    params.provider?.trim() || existing?.provider || null;

  const now = new Date().toISOString();

  async function applyMergeAndMeta(
    profile: CustomerProfile,
    wasGuestLink: boolean
  ): Promise<CustomerProfile> {
    const merge = await attachGuestOrdersToCustomer({
      customerId: profile.id,
      phone: profile.phone,
      email: profile.email,
    });

    let guest_session: GuestMergeDetail | null = null;
    if (params.guestId) {
      guest_session = await mergeGuestIntoCustomer({
        guestId: params.guestId,
        customerId: profile.id,
      });
      merge.wishlist += guest_session.wishlist;
      merge.orders += guest_session.orders;
      merge.bookings += guest_session.bookings;
      merge.addresses += guest_session.addresses;
      merge.guest_session = guest_session;
    }

    const hadMerge =
      wasGuestLink ||
      merge.orders > 0 ||
      merge.bookings > 0 ||
      merge.wishlist > 0 ||
      merge.addresses > 0 ||
      merge.guest_rows_linked > 0 ||
      Boolean(guest_session);
    if (!hadMerge) return profile;

    const merge_meta = {
      ...(typeof profile.merge_meta === "object" && profile.merge_meta
        ? profile.merge_meta
        : {}),
      last_merge_at: now,
      last_merge: merge,
      history: [
        ...((Array.isArray(
          (profile.merge_meta as { history?: unknown })?.history
        )
          ? (profile.merge_meta as { history: unknown[] }).history
          : []) as unknown[]),
        { at: now, ...merge, linked_guest: wasGuestLink },
      ].slice(-20),
    };

    const { data } = await supabase
      .from("customers")
      .update({ merge_meta, updated_at: now })
      .eq("id", profile.id)
      .select("*")
      .single();
    return (data as CustomerProfile) || { ...profile, merge_meta };
  }

  if (existing) {
    const patch: Record<string, unknown> = {
      phone: phone ?? existing.phone,
      email: email ?? existing.email,
      full_name: params.fullName?.trim() || existing.full_name,
      photo_url: params.photoUrl ?? existing.photo_url,
      customer_key: key,
      is_guest: false,
      last_login_at: now,
      login_count: (existing.login_count ?? 0) + 1,
      updated_at: now,
    };
    if (provider) patch.provider = provider;

    const { data, error } = await supabase
      .from("customers")
      .update(patch)
      .eq("id", existing.id)
      .select("*")
      .single();
    const profile = (error ? existing : data) as CustomerProfile;
    return applyMergeAndMeta(profile, false);
  }

  // Link by phone/email if guest row exists
  const byContact = await getCustomerByPhoneOrEmail({ phone, email });
  if (byContact) {
    const patch: Record<string, unknown> = {
      auth_user_id: params.authUserId,
      phone: phone ?? byContact.phone,
      email: email ?? byContact.email,
      full_name: params.fullName?.trim() || byContact.full_name,
      photo_url: params.photoUrl ?? byContact.photo_url,
      customer_key: key,
      is_guest: false,
      last_login_at: now,
      login_count: (byContact.login_count ?? 0) + 1,
      updated_at: now,
    };
    if (provider) patch.provider = provider;

    const { data, error } = await supabase
      .from("customers")
      .update(patch)
      .eq("id", byContact.id)
      .select("*")
      .single();
    if (!error && data) {
      return applyMergeAndMeta(data as CustomerProfile, true);
    }
  }

  const id = crypto.randomUUID();
  const row: Record<string, unknown> = {
    id,
    auth_user_id: params.authUserId,
    is_guest: false,
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
  if (provider) row.provider = provider;

  const { data, error } = await supabase
    .from("customers")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    if (isMissingTableError(error, "customers")) return null;
    // Retry without optional columns if migrations not applied yet
    if (/is_guest|provider|merge_meta|PGRST204|42703/i.test(error.message)) {
      const {
        is_guest: _g,
        provider: _p,
        merge_meta: _m,
        ...withoutOptional
      } = row;
      void _g;
      void _p;
      void _m;
      const retry = await supabase
        .from("customers")
        .insert(withoutOptional)
        .select("*")
        .single();
      if (!retry.error && retry.data) {
        return applyMergeAndMeta(retry.data as CustomerProfile, false);
      }
    }
    console.error("upsertCustomerForAuthUser", error.message);
    return null;
  }
  return applyMergeAndMeta(data as CustomerProfile, false);
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
 * Create or find auth user for WhatsApp/phone OTP, then establish a cookie
 * session via magic-link token exchange (server-side).
 */
export async function establishPhoneSession(params: {
  e164: string;
  fullName?: string;
  provider?: string;
}): Promise<
  | { ok: true; userId: string; merged: boolean }
  | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase غير مُعد" };
  }

  const admin = createAdminClient();
  const email = syntheticEmailFromPhone(params.e164);
  // Opaque string id from the calling AuthProvider — never switch on it here.
  const provider = params.provider || "otp";

  const priorGuest = await getCustomerByPhoneOrEmail({ phone: params.e164 });
  const willMerge = Boolean(
    priorGuest && (!priorGuest.auth_user_id || priorGuest.is_guest)
  );

  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      data: {
        is_customer: true,
        full_name: params.fullName || "",
        phone: params.e164,
        provider,
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
    app_metadata: { provider },
    user_metadata: {
      is_customer: true,
      full_name: params.fullName || "",
      phone: params.e164,
      provider,
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
    provider,
  });

  return { ok: true, userId, merged: willMerge };
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
