import {
  getAuthEnvFlags,
  getCustomerAuthSettings,
} from "@/lib/customer-auth/settings";
import { getStoreSettings } from "@/lib/store/settings";
import {
  isCloudinaryConfigured,
  isSupabaseConfigured,
} from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  SystemHealthCheck,
  SystemHealthReport,
  SystemHealthStatus,
} from "@/types/store";

function worst(
  a: SystemHealthStatus,
  b: SystemHealthStatus
): SystemHealthStatus {
  const rank = { green: 0, yellow: 1, red: 2 } as const;
  return rank[a] >= rank[b] ? a : b;
}

async function checkDatabase(): Promise<SystemHealthCheck> {
  if (!isSupabaseConfigured()) {
    return {
      id: "database",
      label: "Database",
      label_ar: "قاعدة البيانات",
      status: "red",
      detail: "Supabase URL/anon key missing",
      detail_ar: "متغيرات Supabase غير مُعدّة",
    };
  }
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("settings")
      .select("key")
      .eq("key", "store")
      .maybeSingle();
    if (error) {
      return {
        id: "database",
        label: "Database",
        label_ar: "قاعدة البيانات",
        status: "yellow",
        detail: error.message,
        detail_ar: `خطأ قراءة: ${error.message}`,
      };
    }
    return {
      id: "database",
      label: "Database",
      label_ar: "قاعدة البيانات",
      status: "green",
      detail: "Connected",
      detail_ar: "متصلة",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return {
      id: "database",
      label: "Database",
      label_ar: "قاعدة البيانات",
      status: "red",
      detail: msg,
      detail_ar: msg,
    };
  }
}

function checkStorage(): SystemHealthCheck {
  if (isCloudinaryConfigured()) {
    return {
      id: "storage",
      label: "Storage",
      label_ar: "التخزين",
      status: "green",
      detail: "Cloudinary configured",
      detail_ar: "Cloudinary جاهز",
    };
  }
  return {
    id: "storage",
    label: "Storage",
    label_ar: "التخزين",
    status: "yellow",
    detail: "Cloudinary not configured — paste URLs still work",
    detail_ar: "Cloudinary غير مُعد — يمكن لصق الروابط يدوياً",
  };
}

async function checkEmail(): Promise<SystemHealthCheck> {
  const { getEmailRuntime } = await import(
    "@/lib/notifications/email-provider"
  );
  const runtime = await getEmailRuntime(true);

  if (!runtime.enabled) {
    return {
      id: "email",
      label: "Email",
      label_ar: "البريد",
      status: "yellow",
      detail: "Email disabled in admin/store settings",
      detail_ar: "البريد متوقف من إعدادات الإدارة أو قنوات المتجر",
    };
  }

  if (runtime.mode === "local") {
    return {
      id: "email",
      label: "Email",
      label_ar: "البريد",
      status: "yellow",
      detail: "Local outbox mode — connect Resend from Admin → Notifications",
      detail_ar:
        "وضع محلي — وصّلي Resend من الإدارة → الإشعارات عند جاهزية النطاق",
    };
  }

  if (!runtime.apiKey || !runtime.fromEmail) {
    return {
      id: "email",
      label: "Email",
      label_ar: "البريد",
      status: "yellow",
      detail: "Resend API key / FROM missing",
      detail_ar: "أضيفي مفتاح Resend و FROM من الإدارة → الإشعارات",
    };
  }

  if (runtime.fromIsSandbox) {
    return {
      id: "email",
      label: "Email",
      label_ar: "البريد",
      status: "red",
      detail:
        "FROM is Resend sandbox — customer confirm/reset emails will not arrive",
      detail_ar:
        "FROM تجريبي (@resend.dev) — بريد التأكيد/الاستعادة لن يصل. وثّقي نطاقاً في Resend",
    };
  }

  return {
    id: "email",
    label: "Email",
    label_ar: "البريد",
    status: "green",
    detail: "Resend ready with custom FROM",
    detail_ar: "Resend جاهز مع FROM من نطاقك",
  };
}

async function checkPayments(): Promise<SystemHealthCheck> {
  const store = await getStoreSettings(true);
  const enabled = store.payments.providers.filter(
    (p) => p.enabled && !p.coming_soon
  );
  if (enabled.length === 0) {
    return {
      id: "payments",
      label: "Payments",
      label_ar: "المدفوعات",
      status: "red",
      detail: "No payment method enabled",
      detail_ar: "لا توجد طريقة دفع مفعّلة",
    };
  }
  const hasLiveGateway = enabled.some(
    (p) => p.id !== "cod" && p.configured
  );
  if (hasLiveGateway) {
    return {
      id: "payments",
      label: "Payments",
      label_ar: "المدفوعات",
      status: "green",
      detail: `Enabled: ${enabled.map((p) => p.name).join(", ")}`,
      detail_ar: `مفعّل: ${enabled.map((p) => p.name_ar).join("، ")}`,
    };
  }
  return {
    id: "payments",
    label: "Payments",
    label_ar: "المدفوعات",
    status: "green",
    detail: "Cash on Delivery only (expected for launch)",
    detail_ar: "الدفع عند الاستلام فقط (مناسب للإطلاق)",
  };
}

async function checkAuthentication(): Promise<SystemHealthCheck> {
  const flags = getAuthEnvFlags();
  const auth = await getCustomerAuthSettings(true);
  if (!flags.supabaseConfigured) {
    return {
      id: "authentication",
      label: "Authentication",
      label_ar: "المصادقة",
      status: "red",
      detail: "Supabase not configured",
      detail_ar: "Supabase غير مُعد",
    };
  }
  const channels: string[] = [];
  if (auth.otp_enabled && flags.whatsappConfigured) channels.push("WhatsApp OTP");
  else if (auth.otp_enabled) channels.push("WhatsApp OTP (env missing)");
  if (auth.google_enabled) channels.push("Google");
  if (auth.apple_enabled) channels.push("Apple");
  if (auth.email_password_enabled) channels.push("Email");
  if (auth.guest_checkout_enabled) channels.push("Guest");

  const otpWarn = auth.otp_enabled && !flags.whatsappConfigured;
  return {
    id: "authentication",
    label: "Authentication",
    label_ar: "المصادقة",
    status: otpWarn ? "yellow" : "green",
    detail: channels.join(", ") || "No channels enabled",
    detail_ar: channels.length
      ? channels.join("، ")
      : "لا توجد قنوات مفعّلة",
  };
}

function checkEnvironment(): SystemHealthCheck {
  const siteUrl = Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim());
  const supabase = isSupabaseConfigured();
  if (supabase && siteUrl) {
    return {
      id: "environment",
      label: "Environment",
      label_ar: "البيئة",
      status: "green",
      detail: `NODE_ENV=${process.env.NODE_ENV ?? "unknown"}`,
      detail_ar: `البيئة: ${process.env.NODE_ENV ?? "غير معروفة"}`,
    };
  }
  if (supabase) {
    return {
      id: "environment",
      label: "Environment",
      label_ar: "البيئة",
      status: "yellow",
      detail: "NEXT_PUBLIC_SITE_URL missing",
      detail_ar: "NEXT_PUBLIC_SITE_URL غير مُعد",
    };
  }
  return {
    id: "environment",
    label: "Environment",
    label_ar: "البيئة",
    status: "red",
    detail: "Critical env vars missing",
    detail_ar: "متغيرات بيئة أساسية ناقصة",
  };
}

export async function getSystemHealthReport(): Promise<SystemHealthReport> {
  const [database, payments, authentication, email] = await Promise.all([
    checkDatabase(),
    checkPayments(),
    checkAuthentication(),
    checkEmail(),
  ]);
  const checks: SystemHealthCheck[] = [
    database,
    checkStorage(),
    email,
    payments,
    authentication,
    checkEnvironment(),
  ];

  let overall: SystemHealthStatus = "green";
  for (const c of checks) {
    overall = worst(overall, c.status);
  }

  return {
    overall,
    checked_at: new Date().toISOString(),
    checks,
  };
}
