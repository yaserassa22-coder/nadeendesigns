"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Smartphone,
  Mail,
  Package,
  Truck,
  Calendar,
  Heart,
  Palette,
  Bell,
  UserPlus,
  UserRound,
} from "lucide-react";
import { FaGoogle, FaApple, FaFacebookF } from "react-icons/fa";
import { SITE_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { PHONE_COUNTRIES, type CustomerAuthSettings } from "@/types/customer-auth";

const ACCENT = "#C9A14A";

type Props = {
  open: boolean;
  onClose: () => void;
  onContinueAsGuest: () => void;
  onSuccess: () => void | Promise<void>;
  message?: string;
  settings: (CustomerAuthSettings & {
    google_ready?: boolean;
    apple_ready?: boolean;
    otp_ready?: boolean;
    email_ready?: boolean;
  }) | null;
  flags?: Record<string, boolean>;
};

type Step = "choice" | "methods" | "phone" | "otp" | "email";

const ACCOUNT_BENEFITS = [
  { icon: Package, label: "تتبع الطلبات" },
  { icon: Truck, label: "الشحن والتوصيل" },
  { icon: Calendar, label: "المواعيد" },
  { icon: Heart, label: "قائمة الأمنيات" },
  { icon: Palette, label: "التصاميم المحفوظة" },
  { icon: Bell, label: "الإشعارات" },
] as const;

export function LoginModal({
  open,
  onClose,
  onContinueAsGuest,
  onSuccess,
  message,
  settings,
}: Props) {
  const [step, setStep] = useState<Step>("choice");
  const [dial, setDial] = useState("+972");
  const [phone, setPhone] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailMode, setEmailMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  function resetForm() {
    setStep("choice");
    setPhone("");
    setOtp(["", "", "", "", "", ""]);
    setError(null);
    setRequestId(null);
    setDevCode(null);
    setLoading(false);
  }

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose]);

  const handleGuest = useCallback(() => {
    resetForm();
    onContinueAsGuest();
  }, [onContinueAsGuest]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, handleClose]);

  const guestEnabled = settings?.guest_checkout_enabled !== false;

  async function requestOtp() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dial, phone, remember }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إرسال الرمز");
      setRequestId(data.request_id);
      setResendIn(data.resend_in ?? 60);
      setDevCode(data.dev_code ?? null);
      setStep("otp");
      setTimeout(() => inputsRef.current[0]?.focus(), 80);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل إرسال الرمز");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(codeDigits?: string[]) {
    const code = (codeDigits ?? otp).join("");
    if (code.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp/verify", {
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
      if (!res.ok) throw new Error(data.error || "رمز غير صحيح");
      await onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل التحقق");
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

  function onOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  async function startOAuth(provider: "google" | "apple") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, next: "/account" }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "المزوّد غير مُعد حالياً");
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر بدء تسجيل الدخول");
      setLoading(false);
    }
  }

  async function submitEmail() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: emailMode,
          email,
          password,
          full_name: fullName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تسجيل الدخول");
      if (data.needs_email_confirm) {
        setError("تحققي من بريدك لتأكيد الحساب، ثم سجّلي الدخول.");
        return;
      }
      await onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          dir="rtl"
        >
          <button
            type="button"
            aria-label="إغلاق"
            className="absolute inset-0 bg-charcoal/40 backdrop-blur-md"
            onClick={handleClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative z-10 m-3 max-h-[92vh] w-full max-w-md overflow-y-auto overflow-x-hidden rounded-3xl border border-[#e7dfd3] bg-white shadow-[0_24px_80px_rgba(44,36,25,0.18)]"
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
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-5 text-center">
                <p
                  className="font-[family-name:var(--font-cormorant)] text-2xl tracking-[0.2em] sm:text-3xl"
                  style={{ color: ACCENT }}
                >
                  {SITE_NAME}
                </p>
                <h2
                  id="login-title"
                  className="mt-3 font-[family-name:var(--font-amiri)] text-2xl text-charcoal"
                >
                  مرحباً بك في NadEEN Designs
                </h2>
                <p className="mt-2 text-sm text-muted">
                  اختاري كيف تودين المتابعة.
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
                </div>
              )}

              {step === "choice" && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setStep("methods")}
                    className="w-full rounded-2xl border border-transparent px-5 py-4 text-start text-white shadow-md transition hover:brightness-105"
                    style={{ backgroundColor: ACCENT }}
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      <UserPlus className="h-5 w-5" />
                      تسجيل الدخول / إنشاء حساب
                    </span>
                    <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-white/90">
                      {ACCOUNT_BENEFITS.map(({ icon: Icon, label }) => (
                        <li key={label} className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                          {label}
                        </li>
                      ))}
                    </ul>
                  </button>

                  {guestEnabled && (
                    <button
                      type="button"
                      onClick={handleGuest}
                      className="w-full rounded-2xl border border-beige-dark bg-ivory/80 px-5 py-4 text-start transition hover:border-[color:#C9A14A] hover:bg-beige/40"
                    >
                      <span className="flex items-center gap-2 font-semibold text-charcoal">
                        <UserRound className="h-5 w-5" style={{ color: ACCENT }} />
                        المتابعة كزائرة
                      </span>
                      <p className="mt-2 text-xs leading-relaxed text-muted">
                        يمكنكِ التصفح والسلة والشراء وحجز المواعيد. لن تُحفظ
                        الأمنيات أو التصاميم أو لوحة الحساب أو سجل الطلبات عبر
                        الأجهزة.
                      </p>
                    </button>
                  )}
                </div>
              )}

              {step === "methods" && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setStep("choice")}
                    className="mb-1 text-sm text-muted hover:underline"
                  >
                    ← رجوع
                  </button>

                  {(settings?.otp_ready !== false) && (
                    <Button
                      type="button"
                      className="w-full justify-center gap-2"
                      style={{ backgroundColor: ACCENT }}
                      onClick={() => setStep("phone")}
                    >
                      <Smartphone className="h-4 w-4" />
                      المتابعة بالهاتف
                    </Button>
                  )}

                  <OAuthButton
                    label="المتابعة مع Google"
                    icon={<FaGoogle className="h-4 w-4" />}
                    ready={Boolean(settings?.google_ready)}
                    enabled={settings?.google_enabled !== false}
                    loading={loading}
                    onClick={() => void startOAuth("google")}
                    disabledHint="فعّلي Google في Supabase و NEXT_PUBLIC_GOOGLE_AUTH_ENABLED"
                  />
                  <OAuthButton
                    label="المتابعة مع Apple"
                    icon={<FaApple className="h-4 w-4" />}
                    ready={Boolean(settings?.apple_ready)}
                    enabled={settings?.apple_enabled !== false}
                    loading={loading}
                    onClick={() => void startOAuth("apple")}
                    disabledHint="فعّلي Apple في Supabase و NEXT_PUBLIC_APPLE_AUTH_ENABLED"
                  />

                  <button
                    type="button"
                    disabled
                    title="قريباً"
                    className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-beige-dark bg-beige/40 px-4 py-3 text-sm text-muted opacity-60"
                  >
                    <FaFacebookF className="h-4 w-4" />
                    Facebook — قريباً
                  </button>

                  {settings?.email_ready !== false && (
                    <button
                      type="button"
                      onClick={() => setStep("email")}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-beige-dark px-4 py-3 text-sm text-charcoal transition hover:border-[color:var(--gold)] hover:bg-beige/50"
                    >
                      <Mail className="h-4 w-4" style={{ color: ACCENT }} />
                      البريد وكلمة المرور
                    </button>
                  )}

                  {guestEnabled && (
                    <button
                      type="button"
                      onClick={handleGuest}
                      className="mt-2 w-full py-2 text-sm text-muted underline-offset-4 hover:text-charcoal hover:underline"
                    >
                      المتابعة كزائرة
                    </button>
                  )}
                </div>
              )}

              {step === "phone" && (
                <div className="space-y-4">
                  <label className="block text-sm text-muted">رقم الهاتف</label>
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
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="accent-[color:#C9A14A]"
                    />
                    تذكّر هذا الجهاز
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep("methods")}
                    >
                      رجوع
                    </Button>
                    <Button
                      type="button"
                      className="flex-1"
                      loading={loading}
                      style={{ backgroundColor: ACCENT }}
                      onClick={() => void requestOtp()}
                    >
                      إرسال الرمز
                    </Button>
                  </div>
                </div>
              )}

              {step === "otp" && (
                <div className="space-y-4">
                  <p className="text-center text-sm text-muted">
                    أدخلي الرمز المكوّن من 6 أرقام
                  </p>
                  {devCode && (
                    <p className="rounded-xl bg-beige px-3 py-2 text-center text-xs text-muted">
                      وضع التطوير — الرمز: <strong dir="ltr">{devCode}</strong>
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
                      تأكيد
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
                        ? `إعادة الإرسال بعد ${resendIn}ث`
                        : "إعادة إرسال الرمز"}
                    </button>
                    <button
                      type="button"
                      className="text-sm text-muted hover:underline"
                      onClick={() => setStep("phone")}
                    >
                      تغيير الرقم
                    </button>
                  </div>
                </div>
              )}

              {step === "email" && (
                <div className="space-y-3">
                  <div className="flex gap-2 rounded-xl bg-beige/60 p-1 text-sm">
                    <button
                      type="button"
                      className={cn(
                        "flex-1 rounded-lg py-2",
                        emailMode === "signin" && "bg-white shadow-sm"
                      )}
                      onClick={() => setEmailMode("signin")}
                    >
                      دخول
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "flex-1 rounded-lg py-2",
                        emailMode === "signup" && "bg-white shadow-sm"
                      )}
                      onClick={() => setEmailMode("signup")}
                    >
                      حساب جديد
                    </button>
                  </div>
                  {emailMode === "signup" && (
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="الاسم الكامل"
                      className="w-full rounded-xl border border-beige-dark px-4 py-3 text-sm outline-none focus:border-[color:#C9A14A]"
                    />
                  )}
                  <input
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full rounded-xl border border-beige-dark px-4 py-3 text-sm outline-none focus:border-[color:#C9A14A]"
                  />
                  <input
                    type="password"
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="كلمة المرور"
                    className="w-full rounded-xl border border-beige-dark px-4 py-3 text-sm outline-none focus:border-[color:#C9A14A]"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep("methods")}
                    >
                      رجوع
                    </Button>
                    <Button
                      type="button"
                      className="flex-1"
                      loading={loading}
                      style={{ backgroundColor: ACCENT }}
                      onClick={() => void submitEmail()}
                    >
                      {emailMode === "signup" ? "إنشاء حساب" : "دخول"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
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
  icon: React.ReactNode;
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
      title={!ready || !enabled ? disabledHint : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl border border-beige-dark bg-white px-4 py-3 text-sm text-charcoal transition",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "hover:border-[color:#C9A14A] hover:bg-beige/40"
      )}
    >
      {icon}
      {label}
      {!ready && enabled && (
        <span className="text-[10px] text-muted">(غير مُعد)</span>
      )}
    </button>
  );
}
