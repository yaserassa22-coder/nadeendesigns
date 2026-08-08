"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { EmailProviderPublicStatus } from "@/types/email-provider";

const STATUS_STYLES: Record<
  EmailProviderPublicStatus["status"],
  string
> = {
  ready: "border-emerald-200 bg-emerald-50/80 text-emerald-900",
  sandbox: "border-amber-200 bg-amber-50/80 text-amber-950",
  local: "border-sky-200 bg-sky-50/80 text-sky-950",
  disabled: "border-beige-dark bg-beige/40 text-charcoal",
  not_configured: "border-rose-200 bg-rose-50/70 text-rose-900",
};

export function EmailProviderPanel() {
  const { t } = useLocale();
  const ep = t.admin.emailProvider;
  const [status, setStatus] = useState<EmailProviderPublicStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [testTo, setTestTo] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<"local" | "resend">("local");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("Nadeen Designs");
  const [replyTo, setReplyTo] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  const applyStatus = (s: EmailProviderPublicStatus) => {
    setStatus(s);
    setEnabled(s.settings.enabled);
    setMode(s.settings.mode);
    setFromEmail(s.settings.from_email);
    setFromName(s.settings.from_name || "Nadeen Designs");
    setReplyTo(s.settings.reply_to);
    setAdminEmail(s.settings.admin_notification_email);
    setTestTo((prev) => prev || s.settings.admin_notification_email || "");
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch("/api/admin/notifications/email-provider");
        const data = (await res.json()) as EmailProviderPublicStatus & {
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || ep.loadFailed);
        if (!cancelled) applyStatus(data);
      } catch (e) {
        if (!cancelled) {
          setMessage(e instanceof Error ? e.message : ep.genericError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/notifications/email-provider", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          mode,
          from_email: fromEmail.trim(),
          from_name: fromName.trim(),
          reply_to: replyTo.trim(),
          admin_notification_email: adminEmail.trim(),
          ...(apiKeyInput.trim()
            ? { resend_api_key: apiKeyInput.trim() }
            : {}),
        }),
      });
      const data = (await res.json()) as EmailProviderPublicStatus & {
        error?: string;
        message?: string;
      };
      if (!res.ok) throw new Error(data.error || ep.saveFailed);
      applyStatus(data);
      setApiKeyInput("");
      setMessage(data.message || ep.saved);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : ep.genericError);
    } finally {
      setSaving(false);
    }
  };

  const clearKey = async () => {
    if (!confirm(ep.clearConfirm)) {
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/notifications/email-provider", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear_api_key: true }),
      });
      const data = (await res.json()) as EmailProviderPublicStatus & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || ep.clearFailed);
      applyStatus(data);
      setApiKeyInput("");
      setMessage(ep.cleared);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : ep.genericError);
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTestSending(true);
    setTestMessage(null);
    try {
      const res = await fetch("/api/admin/notifications/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        emailId?: string | null;
        local?: boolean;
      };
      if (!res.ok) throw new Error(data.error || ep.testFailed);
      setTestMessage(
        `${data.local ? ep.localPrefix : "✓ "}${data.message || ep.done}${
          data.emailId ? ` — ${data.emailId}` : ""
        }`
      );
    } catch (e) {
      setTestMessage(e instanceof Error ? e.message : ep.genericError);
    } finally {
      setTestSending(false);
    }
  };

  if (loading && !status) {
    return (
      <section className="rounded-2xl border border-beige-dark bg-white/90 p-5 shadow-sm">
        <p className="text-sm text-muted">{ep.loading}</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {status ? (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm ${STATUS_STYLES[status.status]}`}
          role="status"
        >
          <p className="font-semibold">{ep.statusTitle}</p>
          <p className="mt-1 leading-relaxed">{status.status_message_ar}</p>
          <p className="mt-2 text-xs opacity-80" dir="ltr">
            key: {status.api_key_preview || "—"} ({status.api_key_source})
            {status.from_is_sandbox ? " · sandbox FROM" : ""}
            {status.delivery_ready ? " · delivery ready" : ""}
          </p>
        </div>
      ) : null}

      <section className="rounded-2xl border border-beige-dark bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-charcoal">
          {ep.connectionTitle}
        </h2>
        <p className="mt-1 text-sm text-muted">{ep.connectionHint}</p>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-beige-dark/60 px-4 py-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-gold"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span>
            <span className="font-medium text-charcoal">{ep.enableSending}</span>
            <span className="mt-0.5 block text-xs text-muted">
              {ep.enableSendingHint}
            </span>
          </span>
        </label>

        <fieldset className="mt-4 space-y-2">
          <legend className="text-sm font-medium text-charcoal">{ep.deliveryMode}</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-beige-dark/60 px-4 py-3 text-sm">
            <input
              type="radio"
              name="email-mode"
              className="mt-1 accent-gold"
              checked={mode === "local"}
              onChange={() => setMode("local")}
            />
            <span>
              <span className="font-medium">{ep.localMode}</span>
              <span className="mt-0.5 block text-xs text-muted">
                {ep.localModeHint}
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-beige-dark/60 px-4 py-3 text-sm">
            <input
              type="radio"
              name="email-mode"
              className="mt-1 accent-gold"
              checked={mode === "resend"}
              onChange={() => setMode("resend")}
            />
            <span>
              <span className="font-medium">{ep.resendMode}</span>
              <span className="mt-0.5 block text-xs text-muted">
                {ep.resendModeHint}
              </span>
            </span>
          </label>
        </fieldset>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input
            label={ep.apiKey}
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            dir="ltr"
            placeholder={
              status?.has_api_key
                ? ep.apiKeyKeep
                : "re_xxxxxxxx"
            }
            autoComplete="off"
          />
          <div className="flex flex-col justify-end gap-2">
            {status?.has_api_key && status.api_key_source === "admin" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void clearKey()}
                disabled={saving}
              >
                {ep.clearKey}
              </Button>
            ) : null}
            {status?.env_fallback_available &&
            status.api_key_source === "env" ? (
              <p className="text-xs text-muted">
                {ep.envKeyHint}
              </p>
            ) : null}
          </div>
          <Input
            label={ep.fromAddress}
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            dir="ltr"
            placeholder="hello@yourdomain.com"
          />
          <Input
            label={ep.senderName}
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
          />
          <Input
            label={ep.replyTo}
            type="email"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            dir="ltr"
          />
          <Input
            label={ep.adminNotifyEmail}
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            dir="ltr"
            placeholder="you@example.com"
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button loading={saving} onClick={() => void save()}>
            {ep.saveConnection}
          </Button>
          {message ? (
            <p className="text-sm text-muted" role="status">
              {message}
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-beige-dark bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-charcoal">{ep.testTitle}</h2>
        <p className="mt-1 text-sm text-muted">{ep.testHint}</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label={ep.testTo}
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              dir="ltr"
              placeholder="you@example.com"
            />
          </div>
          <Button
            loading={testSending}
            onClick={() => void sendTest()}
            disabled={!testTo.trim()}
          >
            {ep.sendTest}
          </Button>
        </div>
        {testMessage ? (
          <p className="mt-3 text-sm text-muted" role="status">
            {testMessage}
          </p>
        ) : null}
      </section>
    </div>
  );
}
