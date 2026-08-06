import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/env";
import { getAuthCallbackUrl } from "@/lib/customer-auth/callback-url";
import { sendEmail } from "@/lib/notifications/email";
import {
  getDefaultSenderName,
  isCustomerAuthEmailReady,
} from "@/lib/notifications/config";
import { getEmailRuntime } from "@/lib/notifications/email-provider";

type LinkKind = "recovery" | "signup" | "magiclink";

function mapAuthMailerError(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes("security purposes") &&
    (m.includes("seconds") || m.includes("after"))
  ) {
    return "طلبات كثيرة — انتظري دقيقة ثم حاولي مرة أخرى.";
  }
  if (m.includes("rate") && m.includes("limit")) {
    return "طلبات كثيرة — حاولي لاحقاً.";
  }
  return message || "تعذّر إرسال البريد";
}

/** True when an Auth user exists for this email (service role required). */
async function authUserExists(email: string): Promise<boolean> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const base = getSupabaseUrl().replace(/\/$/, "");
  if (!key || !base) return false;

  const url = `${base}/auth/v1/admin/users?page=1&per_page=50&filter=${encodeURIComponent(email)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
    cache: "no-store",
  });
  if (res.ok) {
    const body = (await res.json()) as {
      users?: Array<{ email?: string | null }>;
    };
    const needle = email.toLowerCase();
    if ((body.users || []).some((u) => (u.email || "").toLowerCase() === needle)) {
      return true;
    }
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("customers")
    .select("auth_user_id")
    .ilike("email", email)
    .not("auth_user_id", "is", null)
    .limit(1)
    .maybeSingle();
  return Boolean(data?.auth_user_id);
}

function buildCallbackLink(params: {
  tokenHash: string;
  type: "recovery" | "signup" | "email" | "magiclink";
  next: string;
}) {
  const base = getAuthCallbackUrl(params.next);
  const url = new URL(base);
  url.searchParams.set("token_hash", params.tokenHash);
  url.searchParams.set(
    "type",
    params.type === "magiclink" ? "email" : params.type
  );
  return url.toString();
}

function authEmailHtml(params: {
  title: string;
  body: string;
  cta: string;
  link: string;
}) {
  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<body style="margin:0;padding:24px;background:#f7f3ec;font-family:Georgia,serif;color:#2c2419;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e7dfd3;border-radius:16px;padding:28px;">
    <p style="margin:0;letter-spacing:0.2em;color:#C9A14A;font-size:13px;">NadEEN Designs</p>
    <h1 style="margin:12px 0 8px;font-size:22px;">${params.title}</h1>
    <p style="margin:0 0 20px;line-height:1.7;color:#6b6258;">${params.body}</p>
    <p style="margin:0 0 24px;">
      <a href="${params.link}" style="display:inline-block;background:#C9A14A;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;">
        ${params.cta}
      </a>
    </p>
    <p style="margin:0;font-size:12px;color:#8a8075;line-height:1.6;">
      إذا لم يعمل الزر، انسخي هذا الرابط إلى المتصفح:<br/>
      <span dir="ltr" style="word-break:break-all;">${params.link}</span>
    </p>
  </div>
</body>
</html>`;
}

async function generateAuthActionLink(params: {
  kind: LinkKind;
  email: string;
  password?: string;
  fullName?: string;
  next: string;
}): Promise<
  | { ok: true; link: string }
  | { ok: false; error: string; noUser?: boolean }
> {
  const admin = createAdminClient();
  const { email, next } = params;

  let generated: Awaited<ReturnType<typeof admin.auth.admin.generateLink>>;

  if (params.kind === "signup") {
    if (!params.password || params.password.length < 6) {
      return { ok: false, error: "كلمة المرور مطلوبة لإنشاء رابط التأكيد" };
    }
    generated = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password: params.password,
      options: {
        data: {
          is_customer: true,
          full_name: params.fullName || "",
        },
        redirectTo: getAuthCallbackUrl(next),
      },
    });
  } else if (params.kind === "recovery") {
    generated = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: getAuthCallbackUrl(next) },
    });
  } else {
    generated = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: getAuthCallbackUrl(next) },
    });
  }

  if (generated.error || !generated.data) {
    const msg = generated.error?.message || "تعذّر إنشاء الرابط";
    const lower = msg.toLowerCase();
    if (
      lower.includes("not found") ||
      lower.includes("no user") ||
      lower.includes("user not found")
    ) {
      return { ok: false, error: msg, noUser: true };
    }
    return { ok: false, error: mapAuthMailerError(msg) };
  }

  const hashed = generated.data.properties?.hashed_token;
  const actionLink = generated.data.properties?.action_link;
  const otpType =
    params.kind === "recovery"
      ? ("recovery" as const)
      : params.kind === "signup"
        ? ("signup" as const)
        : ("email" as const);

  const link = hashed
    ? buildCallbackLink({ tokenHash: hashed, type: otpType, next })
    : actionLink;

  if (!link) return { ok: false, error: "تعذّر بناء رابط المصادقة" };
  return { ok: true, link };
}

/**
 * Deliver a customer auth link via Resend only (verified-domain FROM).
 * Never pretends success — Supabase Auth mailer is not used for delivery claims.
 */
export async function sendCustomerAuthLinkEmail(params: {
  kind: LinkKind;
  email: string;
  password?: string;
  fullName?: string;
  next?: string;
}): Promise<
  | { ok: true; delivered: true; id?: string; provider: "resend" }
  | { ok: true; delivered: false; reason: "no_user"; message: string }
  | { ok: false; error: string; debugLink?: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "خدمة المصادقة غير مُعدّة" };
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return {
      ok: false,
      error:
        "SUPABASE_SERVICE_ROLE_KEY مطلوب لإرسال روابط المصادقة. أضيفيه إلى .env.local ثم أعيدي تشغيل الخادم.",
    };
  }

  const email = params.email.trim().toLowerCase();
  const next =
    params.next ||
    (params.kind === "recovery" ? "/account/reset-password" : "/account");

  // Fast honest no-account for recovery / magiclink (before generating tokens).
  if (params.kind !== "signup") {
    const exists = await authUserExists(email);
    if (!exists) {
      // generateLink is the source of truth when filter/customers miss a user.
      const probe = await generateAuthActionLink({
        kind: params.kind,
        email,
        next,
      });
      if (!probe.ok && probe.noUser) {
        return {
          ok: true,
          delivered: false,
          reason: "no_user",
          message:
            "لا يوجد حساب بهذا البريد. أنشئي حساباً جديداً من «حساب جديد».",
        };
      }
      if (!probe.ok) {
        return { ok: false, error: probe.error };
      }
      // User exists — continue with this link for Resend below.
      return await deliverLink({
        kind: params.kind,
        email,
        next,
        link: probe.link,
      });
    }
  }

  const generated = await generateAuthActionLink({
    kind: params.kind,
    email,
    password: params.password,
    fullName: params.fullName,
    next,
  });

  if (!generated.ok) {
    if (generated.noUser) {
      return {
        ok: true,
        delivered: false,
        reason: "no_user",
        message:
          "لا يوجد حساب بهذا البريد. أنشئي حساباً جديداً من «حساب جديد».",
      };
    }
    return { ok: false, error: generated.error };
  }

  return deliverLink({
    kind: params.kind,
    email,
    next,
    link: generated.link,
  });
}

async function deliverLink(params: {
  kind: LinkKind;
  email: string;
  next: string;
  link: string;
}): Promise<
  | { ok: true; delivered: true; id?: string; provider: "resend" }
  | { ok: false; error: string; debugLink?: string }
> {
  const { email, link } = params;

  const copy =
    params.kind === "recovery"
      ? {
          subject: "إعادة تعيين كلمة المرور | NadEEN Designs",
          title: "إعادة تعيين كلمة المرور",
          body: "طلبتِ إعادة تعيين كلمة المرور. اضغطي الزر أدناه خلال ساعة لإنشاء كلمة مرور جديدة.",
          cta: "تعيين كلمة مرور جديدة",
        }
      : {
          subject: "تأكيد حسابكِ | NadEEN Designs",
          title: "مرحباً بكِ في NadEEN Designs",
          body: "اضغطي الزر لتأكيد بريدكِ وإكمال إنشاء الحساب.",
          cta: "تأكيد البريد الإلكتروني",
        };

  /**
   * Only Resend with a verified-domain FROM counts as real delivery.
   * Supabase Auth mailer often returns success without sending (quota /
   * anti-enumeration) — never claim "check your inbox" based on it.
   * @resend.dev can only reach the Resend account owner, so it is not
   * reliable for customer confirmation emails either.
   */
  await getEmailRuntime();
  if (!isCustomerAuthEmailReady()) {
    return {
      ok: false,
      error:
        "بريد التأكيد/الاستعادة غير جاهز. من الإدارة → الإشعارات: وصّلي Resend بمفتاح و FROM من نطاق موثّق (ليس @resend.dev).",
      debugLink: process.env.NODE_ENV !== "production" ? link : undefined,
    };
  }

  const sent = await sendEmail({
    to: email,
    subject: copy.subject,
    fromName: getDefaultSenderName(),
    html: authEmailHtml({
      title: copy.title,
      body: copy.body,
      cta: copy.cta,
      link,
    }),
    text: `${copy.title}\n\n${copy.body}\n\n${link}`,
    requireDelivery: true,
  });

  if (sent.ok) {
    return { ok: true, delivered: true, id: sent.id, provider: "resend" };
  }

  console.warn("[auth-mail] Resend delivery failed", { error: sent.error });
  return {
    ok: false,
    error: sent.error,
    debugLink: process.env.NODE_ENV !== "production" ? link : undefined,
  };
}
