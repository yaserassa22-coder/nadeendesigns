"use client";

import { useEffect, useRef, useState, useCallback, useMemo, type PointerEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Mail,
  Package,
  Truck,
  Calendar,
  Heart,
  Palette,
  Bell,
  UserRound,
} from "lucide-react";
import { FaGoogle, FaApple, FaWhatsapp } from "react-icons/fa";
import { SITE_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { PHONE_COUNTRIES, type CustomerAuthSettings } from "@/types/customer-auth";
import type { AuthProviderPublic } from "@/lib/customer-auth/providers/types";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { pickLocalized } from "@/lib/cms/locale-text";
import { formatMessage } from "@/lib/i18n";

const ACCENT = "#C9A14A";

type SettingsWithProviders = CustomerAuthSettings & {
  google_ready?: boolean;
  apple_ready?: boolean;
  otp_ready?: boolean;
  email_ready?: boolean;
  providers?: AuthProviderPublic[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onContinueAsGuest: () => void | Promise<void>;
  onSuccess: () => void | Promise<void>;
  message?: string;
  settings: SettingsWithProviders | null;
  flags?: Record<string, boolean>;
};

type Step = "choice" | "phone" | "otp" | "email" | "forgot";

/** Thin UI icons — new providers can omit and get a generic icon. */
function providerIcon(id: string) {
  switch (id) {
    case "whatsapp":
      return <FaWhatsapp className="h-5 w-5" />;
    case "google":
      return <FaGoogle className="h-4 w-4" />;
    case "apple":
      return <FaApple className="h-4 w-4" />;
    case "guest":
      return <UserRound className="h-5 w-5" style={{ color: ACCENT }} />;
    case "email":
      return <Mail className="h-4 w-4" />;
    default:
      return null;
  }
}

export function LoginModal({
  open,
  onClose,
  onContinueAsGuest,
  onSuccess,
  message,
  settings,
}: Props) {
  const { t, locale } = useLocale();
  const ACCOUNT_BENEFITS = [
    { icon: Package, label: t.auth.trackOrders },
    { icon: Truck, label: t.auth.shippingDelivery },
    { icon: Calendar, label: t.auth.appointments },
    { icon: Heart, label: t.auth.wishlist },
    { icon: Palette, label: t.auth.savedDesigns },
    { icon: Bell, label: t.auth.notifications },
  ] as const;
  const [step, setStep] = useState<Step>("choice");
  const [dial, setDial] = useState("+972");
  const [phone, setPhone] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [debugResetHref, setDebugResetHref] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailMode, setEmailMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [destinationHint, setDestinationHint] = useState<string | null>(null);
  const [activeOtpProvider, setActiveOtpProvider] =
    useState<AuthProviderPublic | null>(null);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  /** Ignore backdrop dismiss for a beat after open (same-gesture / ghost click). */
  const openedAtRef = useRef(0);

  const providers = useMemo(() => {
    if (settings?.providers?.length) {
      return [...settings.providers].sort((a, b) => a.order - b.order);
    }
    // Fallback when /api/auth/me has not yet returned the registry catalog
    return buildLegacyProviders(settings);
  }, [settings]);

  /** Active (clickable) providers in admin order. */
  const activeProviders = providers.filter(
    (p) => p.enabled && !p.comingSoon && p.ready
  );
  const emailProvider = activeProviders.find((p) =>
    p.capabilities.includes("password")
  );
  const guestProvider = activeProviders.find((p) =>
    p.capabilities.includes("guest")
  );
  const oauthProviders = activeProviders.filter((p) =>
    p.capabilities.includes("oauth")
  );
  const otpProviders = activeProviders.filter((p) =>
    p.capabilities.includes("otp")
  );
  /** Coming soon / not connected — after active options, still admin-ordered. */
  const comingSoonProviders = providers.filter((p) => p.comingSoon);

  function resetForm() {
    setStep("choice");
    setPhone("");
    setOtp(["", "", "", "", "", ""]);
    setError(null);
    setInfo(null);
    setDebugResetHref(null);
    setRequestId(null);
    setDevCode(null);
    setDestinationHint(null);
    setActiveOtpProvider(null);
    setLoading(false);
  }

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose]);

  const handleGuest = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await onContinueAsGuest();
      resetForm();
    } catch (e) {
      console.error("[LoginModal] continue as guest failed", e);
      setError(
        e instanceof Error
          ? e.message
          : t.auth.errors.guestFailed
      );
    } finally {
      // Never leave the modal stuck on "جاري المتابعة…"
      setLoading(false);
    }
  }, [onContinueAsGuest]);

  /** Backdrop only — skips the opening pointer that can land on the new overlay. */
  const handleBackdropPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (Date.now() - openedAtRef.current < 500) return;
      handleClose();
    },
    [handleClose]
  );

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  // Reset local UI state whenever the modal opens so a prior attempt
  // cannot leave loading=true across closes (component stays mounted).
  useEffect(() => {
    if (!open) return;
    openedAtRef.current = Date.now();
    // Intentional remount-style reset when `open` flips true.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- modal open gate
    resetForm();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        if (Date.now() - openedAtRef.current < 500) return;
        handleClose();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // Only re-bind when open flips — avoid resetForm mid-interaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleClose is stable enough via onClose
  }, [open]);

  async function requestOtp(provider = activeOtpProvider) {
    const endpoints = provider?.endpoints;
    const sendUrl = endpoints?.sendOtp || "/api/auth/whatsapp/send-code";
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(sendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dial, phone, remember }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.auth.errors.sendOtpFailed);
      setRequestId(data.request_id);
      setResendIn(data.resend_in ?? 60);
      setDevCode(data.dev_code ?? null);
      setDestinationHint(data.destination_hint ?? null);
      setStep("otp");
      setTimeout(() => inputsRef.current[0]?.focus(), 80);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.auth.errors.sendOtpFailed);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(codeDigits?: string[]) {
    const code = (codeDigits ?? otp).join("");
    if (code.length !== 6) return;
    const verifyUrl =
      activeOtpProvider?.endpoints?.verifyOtp ||
      "/api/auth/whatsapp/verify-code";
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(verifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          dial,
          phone,
          code,
          remember,
          full_name: fullName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.auth.errors.invalidOtp);
      await onSuccess();
      if (typeof window !== "undefined") {
        window.location.assign(data.redirect || "/account");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t.auth.errors.verifyFailed);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => inputsRef.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }

  function onOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) inputsRef.current[index + 1]?.focus();
    if (digit && index === 5 && next.every((d) => d)) {
      void verifyOtp(next);
    }
  }

  function onOtpKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  async function startOAuth(providerId: string) {
    const oauthUrl =
      providers.find((p) => p.id === providerId)?.endpoints?.oauth ||
      "/api/auth/oauth";
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(oauthUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId, next: "/account" }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || t.auth.errors.providerNotConfigured);
      }
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.auth.errors.oauthStartFailed);
      setLoading(false);
    }
  }

  async function submitEmail() {
    const passwordUrl =
      emailProvider?.endpoints?.password || "/api/auth/email";
    const trimmedEmail = email.trim();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      if (!trimmedEmail.includes("@")) {
        throw new Error(t.auth.errors.invalidEmail);
      }
      if (password.length < 6) {
        throw new Error(t.auth.errors.passwordMin);
      }
      if (emailMode === "signup" && fullName.trim().length < 2) {
        throw new Error(t.auth.errors.fullNameRequired);
      }
      const res = await fetch(passwordUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          mode: emailMode,
          email: trimmedEmail,
          password,
          full_name: fullName.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        needs_email_confirm?: boolean;
        signed_in?: boolean;
        message?: string;
        debug_link?: string;
      };
      if (!res.ok) throw new Error(data.error || t.auth.errors.loginFailed);
      // Account created but not yet a browser session — stay on sign-in.
      if (data.needs_email_confirm || data.signed_in === false) {
        setInfo(
          data.message ||
            (data.needs_email_confirm
              ? t.auth.errors.accountCreatedConfirm
              : t.auth.errors.accountCreatedLogin)
        );
        if (
          data.debug_link &&
          process.env.NODE_ENV !== "production"
        ) {
          setDebugResetHref(data.debug_link);
        }
        setEmailMode("signin");
        setPassword("");
        return;
      }
      if (data.message) {
        setInfo(data.message);
      }
      await onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.auth.errors.loginFailed);
    } finally {
      setLoading(false);
    }
  }

  async function submitForgot() {
    const passwordUrl =
      emailProvider?.endpoints?.password || "/api/auth/email";
    const trimmedEmail = email.trim();
    setLoading(true);
    setError(null);
    setInfo(null);
    setDebugResetHref(null);
    try {
      if (!trimmedEmail.includes("@")) {
        throw new Error(t.auth.errors.invalidEmail);
      }
      const res = await fetch(passwordUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ mode: "forgot", email: trimmedEmail }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        no_account?: boolean;
        debug_link?: string;
      };
      if (!res.ok) {
        if (data.no_account) {
          setError(
            data.error ||
              t.auth.errors.noAccountForEmail
          );
          setEmailMode("signup");
          setStep("email");
          return;
        }
        if (
          data.debug_link &&
          process.env.NODE_ENV !== "production"
        ) {
          setDebugResetHref(data.debug_link);
        }
        throw new Error(data.error || t.auth.errors.resetSendFailed);
      }
      setInfo(
        data.message ||
          t.auth.errors.resetSent
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t.auth.errors.resetSendFailed);
    } finally {
      setLoading(false);
    }
  }

  const otpLabel =
    (activeOtpProvider
      ? pickLocalized(
          activeOtpProvider.label.ar,
          activeOtpProvider.label.en,
          t.auth.whatsapp,
          locale,
          activeOtpProvider.label.he
        )
      : null) || t.auth.whatsapp;

  const providerText = (label: { ar: string; en?: string; he?: string }) =>
    pickLocalized(label.ar, label.en, label.ar, locale, label.he);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          dir={locale === "en" ? "ltr" : "rtl"}
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-charcoal/40 backdrop-blur-md"
            onPointerDown={handleBackdropPointerDown}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative z-10 m-3 h-auto max-h-[92vh] w-full max-w-md overflow-y-auto overflow-x-hidden rounded-3xl border border-[#e7dfd3] bg-white shadow-[0_24px_80px_rgba(44,36,25,0.18)]"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div
              className="h-1.5 w-full"
              style={{
                background: `linear-gradient(90deg, ${ACCENT}, #d4bc8e, ${ACCENT})`,
              }}
            />
            <div className="relative px-6 pb-7 pt-6 sm:px-8">
              <button
                type="button"
                onClick={handleClose}
                className="absolute start-4 top-4 rounded-full p-2 text-muted hover:bg-beige hover:text-charcoal"
                aria-label={t.auth.close}
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-5 text-center">
                <h2
                  id="login-title"
                  className="font-[family-name:var(--font-cormorant)] text-2xl tracking-[0.2em] sm:text-3xl"
                  style={{ color: ACCENT }}
                >
                  {SITE_NAME}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {step === "choice"
                    ? t.auth.chooseMethod
                    : step === "phone"
                      ? formatMessage(t.auth.otpIntroPhone, { channel: otpLabel })
                      : step === "otp"
                        ? formatMessage(t.auth.otpIntroCode, { channel: otpLabel })
                        : step === "forgot"
                          ? t.auth.forgotIntro
                          : t.auth.emailPassword}
                </p>
              </div>

              {message && (
                <div
                  className="mb-4 rounded-2xl border px-4 py-3 text-sm text-charcoal"
                  style={{
                    borderColor: `${ACCENT}55`,
                    background: `${ACCENT}12`,
                  }}
                >
                  {message}
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                  {debugResetHref && (
                    <p className="mt-3">
                      <a
                        href={debugResetHref}
                        className="font-medium underline"
                        style={{ color: ACCENT }}
                      >
                        {t.auth.openResetLinkDev}
                      </a>
                    </p>
                  )}
                </div>
              )}
              {info && (
                <div
                  className="mb-4 rounded-2xl border px-4 py-3 text-sm text-charcoal"
                  style={{
                    borderColor: `${ACCENT}55`,
                    background: `${ACCENT}12`,
                  }}
                >
                  {info}
                </div>
              )}

              {step === "choice" && (
                <div className="space-y-3">
                  <ul className="mb-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-muted">
                    {ACCOUNT_BENEFITS.map(({ icon: Icon, label }) => (
                      <li key={label} className="flex items-center gap-1.5">
                        <Icon
                          className="h-3.5 w-3.5 shrink-0"
                          style={{ color: ACCENT }}
                        />
                        {label}
                      </li>
                    ))}
                  </ul>

                  {/* Order: Email → Guest → OAuth → OTP → coming soon (admin sort within groups) */}
                  {emailProvider && (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setStep("email");
                      }}
                      className="flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl px-5 py-3.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
                      style={{ backgroundColor: ACCENT }}
                    >
                      <Mail className="h-4 w-4" />
                      {emailProvider.label && providerText(emailProvider.label)}
                    </button>
                  )}

                  {guestProvider && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void handleGuest()}
                      className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-beige-dark bg-ivory/80 px-5 py-3.5 text-sm font-semibold text-charcoal transition hover:border-[color:#C9A14A] hover:bg-beige/40 disabled:opacity-60"
                    >
                      {providerIcon(guestProvider.id)}
                      {loading
                        ? t.common.loading
                        : providerText(guestProvider.label)}
                    </button>
                  )}

                  {oauthProviders.map((p) => (
                    <OAuthButton
                      key={p.id}
                      label={providerText(p.label)}
                      icon={providerIcon(p.id)}
                      ready={p.ready}
                      enabled={p.enabled}
                      loading={loading}
                      onClick={() => void startOAuth(p.id)}
                      disabledHint={t.auth.comingSoon}
                    />
                  ))}

                  {otpProviders.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setActiveOtpProvider(p);
                        setStep("phone");
                      }}
                      className="flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl border border-beige-dark bg-white px-5 py-3.5 text-sm font-semibold text-charcoal transition hover:border-[color:#C9A14A] hover:bg-beige/40"
                    >
                      {providerIcon(p.id)}
                      {providerText(p.label)}
                    </button>
                  ))}

                  {comingSoonProviders.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled
                      aria-disabled="true"
                      className="relative flex min-h-[52px] w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-2xl border border-dashed border-beige-dark bg-beige/30 px-5 py-3.5 text-sm font-medium text-muted opacity-80"
                    >
                      {providerIcon(p.id)}
                      <span>{providerText(p.label)}</span>
                      <span
                        className="absolute start-4 top-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white"
                        style={{ backgroundColor: ACCENT }}
                      >
                        {t.auth.comingSoon}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {step === "phone" && (
                <div className="space-y-4">
                  <label className="block text-sm text-muted">
                    {t.auth.phone}
                  </label>
                  <div className="flex gap-2" dir="ltr">
                    <select
                      value={dial}
                      onChange={(e) => setDial(e.target.value)}
                      className="w-[7.5rem] rounded-xl border border-beige-dark bg-ivory px-2 py-3 text-sm text-charcoal"
                    >
                      {PHONE_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.dial}>
                          {c.flag} {c.dial}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="5X XXX XXXX"
                      className="flex-1 rounded-xl border border-beige-dark bg-white px-4 py-3 text-sm outline-none focus:border-[color:#C9A14A] focus:ring-2 focus:ring-[color:#C9A14A]/30"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-muted">
                    {formatMessage(t.auth.otpHint, { channel: otpLabel })}
                  </p>
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="accent-[color:#C9A14A]"
                    />
                    {t.auth.rememberDevice}
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep("choice")}
                    >{t.common.back}</Button>
                    <Button
                      type="button"
                      className="flex-1 gap-2"
                      loading={loading}
                      style={{ backgroundColor: ACCENT }}
                      onClick={() => void requestOtp()}
                    >
                      {providerIcon(activeOtpProvider?.id || "whatsapp")}
                      {t.auth.sendCode}
                    </Button>
                  </div>
                </div>
              )}

              {step === "otp" && (
                <div className="space-y-4">
                  <p className="text-center text-sm text-muted">
                    {t.auth.enterSixDigit}
                    {destinationHint ? (
                      <>
                        {" "}
                        {t.auth.sentTo}{" "}
                        <span dir="ltr" className="text-charcoal">
                          {destinationHint}
                        </span>
                      </>
                    ) : null}
                  </p>
                  {devCode && (
                    <p className="rounded-xl bg-beige px-3 py-2 text-center text-xs text-muted">
                      {t.auth.devModeCode}{" "}
                      <strong dir="ltr">{devCode}</strong>
                    </p>
                  )}
                  <div className="flex justify-center gap-2" dir="ltr">
                    {otp.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          inputsRef.current[i] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={(e) => onOtpChange(i, e.target.value)}
                        onKeyDown={(e) => onOtpKeyDown(i, e)}
                        className="h-12 w-10 rounded-xl border border-beige-dark text-center text-lg font-semibold text-charcoal outline-none focus:border-[color:#C9A14A] focus:ring-2 focus:ring-[color:#C9A14A]/30 sm:h-14 sm:w-11"
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      type="button"
                      className="w-full"
                      loading={loading}
                      style={{ backgroundColor: ACCENT }}
                      onClick={() => void verifyOtp()}
                    >
                      {t.auth.confirmAndEnter}
                    </Button>
                    <button
                      type="button"
                      disabled={resendIn > 0 || loading}
                      onClick={() => void requestOtp()}
                      className={cn(
                        "text-sm",
                        resendIn > 0
                          ? "text-muted"
                          : "text-[color:#C9A14A] hover:underline"
                      )}
                    >
                      {resendIn > 0
                        ? formatMessage(t.auth.resendAfter, { seconds: resendIn })
                        : formatMessage(t.auth.resendVia, { channel: otpLabel })}
                    </button>
                    <button
                      type="button"
                      className="text-sm text-muted hover:underline"
                      onClick={() => setStep("phone")}
                    >
                      {t.auth.changeNumber}
                    </button>
                  </div>
                </div>
              )}

              {step === "email" && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setStep("choice");
                    }}
                    className="mb-1 text-sm text-muted hover:underline"
                  >
                    {locale === "en" ? "→ " : "← "}{t.common.back}
                  </button>
                  <div className="flex gap-2 rounded-xl bg-beige/60 p-1 text-sm">
                    <button
                      type="button"
                      className={cn(
                        "flex-1 rounded-lg py-2.5 font-medium transition",
                        emailMode === "signin"
                          ? "bg-white text-charcoal shadow-sm"
                          : "text-muted hover:text-charcoal"
                      )}
                      onClick={() => {
                        setError(null);
                        setInfo(null);
                        setEmailMode("signin");
                      }}
                    >
                      {t.auth.login}
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "flex-1 rounded-lg py-2.5 font-medium transition",
                        emailMode === "signup"
                          ? "bg-white text-charcoal shadow-sm"
                          : "text-muted hover:text-charcoal"
                      )}
                      onClick={() => {
                        setError(null);
                        setInfo(null);
                        setEmailMode("signup");
                      }}
                    >
                      {t.auth.newAccount}
                    </button>
                  </div>
                  {emailMode === "signup" && (
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-muted">
                        {t.auth.fullName}
                      </span>
                      <input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t.auth.fullName}
                        autoComplete="name"
                        className="w-full rounded-xl border border-beige-dark bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-[color:#C9A14A] focus:ring-2 focus:ring-[color:#C9A14A]/30"
                      />
                    </label>
                  )}
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-muted">
                      {t.auth.email}
                    </span>
                    <input
                      type="email"
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      autoComplete="email"
                      className="w-full rounded-xl border border-beige-dark bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-[color:#C9A14A] focus:ring-2 focus:ring-[color:#C9A14A]/30"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-muted">
                      {t.auth.password}
                    </span>
                    <input
                      type="password"
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete={
                        emailMode === "signup"
                          ? "new-password"
                          : "current-password"
                      }
                      className="w-full rounded-xl border border-beige-dark bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-[color:#C9A14A] focus:ring-2 focus:ring-[color:#C9A14A]/30"
                    />
                  </label>
                  {emailMode === "signin" && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="text-xs font-medium text-[color:#C9A14A] hover:underline"
                        onClick={() => {
                          setError(null);
                          setInfo(null);
                          setStep("forgot");
                        }}
                      >
                        {t.auth.forgotPassword}
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep("choice")}
                    >{t.common.back}</Button>
                    <Button
                      type="button"
                      className="flex-1"
                      loading={loading}
                      style={{ backgroundColor: ACCENT }}
                      onClick={() => void submitEmail()}
                    >
                      <Mail className="me-1 h-4 w-4" />
                      {emailMode === "signup" ? t.auth.createAccount : t.auth.login}
                    </Button>
                  </div>
                </div>
              )}

              {step === "forgot" && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setInfo(null);
                      setStep("email");
                      setEmailMode("signin");
                    }}
                    className="mb-1 text-sm text-muted hover:underline"
                  >
                    {t.auth.backToLogin}
                  </button>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-muted">
                      {t.auth.email}
                    </span>
                    <input
                      type="email"
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      autoComplete="email"
                      className="w-full rounded-xl border border-beige-dark bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-[color:#C9A14A] focus:ring-2 focus:ring-[color:#C9A14A]/30"
                    />
                  </label>
                  <p className="text-xs text-muted">
                    {t.auth.forgotNeedAccount}
                  </p>
                  <Button
                    type="button"
                    className="w-full"
                    loading={loading}
                    style={{ backgroundColor: ACCENT }}
                    onClick={() => void submitForgot()}
                  >
                    {t.auth.sendResetLink}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Fallback catalog when registry not yet loaded from /api/auth/me. */
function buildLegacyProviders(
  settings: SettingsWithProviders | null
): AuthProviderPublic[] {
  const list: AuthProviderPublic[] = [];
  if (settings?.email_password_enabled !== false) {
    list.push({
      id: "email",
      label: { ar: "البريد وكلمة المرور", he: "אימייל וסיסמה", en: "Email and password" },
      capabilities: ["password"],
      order: 10,
      primary: true,
      enabled: true,
      ready: true,
      comingSoon: false,
      visible: true,
      endpoints: { password: "/api/auth/email" },
    });
  }
  if (settings?.guest_checkout_enabled !== false) {
    list.push({
      id: "guest",
      label: { ar: "المتابعة كزائرة", he: "המשך כאורחת", en: "Continue as guest" },
      capabilities: ["guest"],
      order: 20,
      primary: true,
      enabled: true,
      ready: true,
      comingSoon: false,
      visible: true,
    });
  }
  if (settings?.google_enabled !== false) {
    const ready = Boolean(settings?.google_ready);
    list.push({
      id: "google",
      label: { ar: "المتابعة مع Google", he: "המשך עם Google", en: "Continue with Google" },
      capabilities: ["oauth"],
      order: 30,
      primary: true,
      enabled: ready,
      ready,
      comingSoon: !ready,
      visible: true,
      endpoints: { oauth: "/api/auth/oauth" },
    });
  }
  if (settings?.apple_enabled !== false) {
    const ready = Boolean(settings?.apple_ready);
    list.push({
      id: "apple",
      label: { ar: "المتابعة مع Apple", he: "המשך עם Apple", en: "Continue with Apple" },
      capabilities: ["oauth"],
      order: 40,
      primary: true,
      enabled: ready,
      ready,
      comingSoon: !ready,
      visible: true,
      endpoints: { oauth: "/api/auth/oauth" },
    });
  }
  list.push({
    id: "whatsapp",
    label: { ar: "المتابعة مع واتساب", he: "המשך עם וואטסאפ", en: "Continue with WhatsApp" },
    capabilities: ["otp"],
    order: 50,
    primary: true,
    enabled: false,
    ready: false,
    comingSoon: true,
    visible: true,
    endpoints: {
      sendOtp: "/api/auth/whatsapp/send-code",
      verifyOtp: "/api/auth/whatsapp/verify-code",
    },
  });
  return list;
}

function OAuthButton({
  label,
  icon,
  ready,
  enabled,
  loading,
  onClick,
  disabledHint,
}: {
  label: string;
  icon: ReactNode;
  ready: boolean;
  enabled: boolean;
  loading: boolean;
  onClick: () => void;
  disabledHint: string;
}) {
  const disabled = !enabled || !ready || loading;
  return (
    <button
      type="button"
      disabled={disabled}
      title={disabled ? disabledHint : undefined}
      onClick={onClick}
      className={cn(
        "relative flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold transition",
        disabled
          ? "cursor-not-allowed border border-dashed border-beige-dark bg-beige/40 text-muted opacity-90"
          : "border border-beige-dark bg-white font-medium text-charcoal hover:border-[color:#C9A14A] hover:bg-beige/40"
      )}
    >
      {icon}
      <span>{label}</span>
      {disabled && !loading ? (
        <span
          className="absolute start-4 top-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white"
          style={{ backgroundColor: ACCENT }}
        >{disabledHint}</span>
      ) : null}
    </button>
  );
}
