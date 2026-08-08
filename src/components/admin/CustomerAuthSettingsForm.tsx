"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type {
  AuthChannelSettings,
  CustomerAuthSettings,
} from "@/types/customer-auth";
import { DEFAULT_CUSTOMER_AUTH_SETTINGS } from "@/types/customer-auth";

function moveChannel(
  channels: AuthChannelSettings[],
  id: string,
  dir: -1 | 1
): AuthChannelSettings[] {
  const sorted = [...channels].sort((a, b) => a.sort_order - b.sort_order);
  const idx = sorted.findIndex((c) => c.id === id);
  if (idx < 0) return channels;
  const swap = idx + dir;
  if (swap < 0 || swap >= sorted.length) return channels;
  const next = [...sorted];
  const tmp = next[idx];
  next[idx] = next[swap];
  next[swap] = tmp;
  return next.map((c, i) => ({ ...c, sort_order: (i + 1) * 10 }));
}

export function CustomerAuthSettingsForm({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { t } = useLocale();
  const a = t.admin.authSettings;
  const [settings, setSettings] = useState<CustomerAuthSettings>(
    DEFAULT_CUSTOMER_AUTH_SETTINGS
  );
  const [flags, setFlags] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch("/api/admin/customer-auth/settings")
        .then((r) => r.json())
        .then((d) => {
          if (d.settings) setSettings(d.settings);
          if (d.flags) setFlags(d.flags);
        })
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function updateChannel(
    id: string,
    patch: Partial<AuthChannelSettings>
  ) {
    setSettings((s) => ({
      ...s,
      channels: s.channels.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    }));
    setMessage(null);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/customer-auth/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || a.saveFailed);
      setSettings(data.settings);
      setFlags(data.flags ?? {});
      setMessage(a.saveOk);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : a.failed);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-32 animate-pulse rounded-2xl bg-beige" />;
  }

  const channels = [...settings.channels].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  return (
    <div
      className={
        embedded
          ? "space-y-6"
          : "space-y-6 rounded-2xl border border-beige-dark bg-white p-6"
      }
    >
      {!embedded && (
        <div>
          <h2 className="text-xl font-bold text-charcoal">{a.title}</h2>
          <p className="mt-1 text-sm text-muted">
            {a.description}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {channels.map((ch, index) => {
          const isWhatsApp = ch.id === "whatsapp";
          const provider =
            typeof ch.configuration.provider === "string"
              ? ch.configuration.provider
              : "auto";
          return (
            <div
              key={ch.id}
              className="rounded-xl border border-beige-dark/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="font-semibold text-charcoal">{ch.label_ar}</p>
                  <p className="text-xs text-muted" dir="ltr">
                    {ch.id} · order {ch.sort_order}
                  </p>
                  <Input
                    label={a.labelAr}
                    value={ch.label_ar}
                    onChange={(e) =>
                      updateChannel(ch.id, { label_ar: e.target.value })
                    }
                  />
                  <Input
                    label="Label (EN)"
                    value={ch.label_en}
                    onChange={(e) =>
                      updateChannel(ch.id, { label_en: e.target.value })
                    }
                  />
                  {ch.admin_notes_ar ? (
                    <p className="text-xs leading-relaxed text-muted">
                      {ch.admin_notes_ar}
                    </p>
                  ) : null}
                  {ch.secret_env_refs.length > 0 ? (
                    <p className="text-[11px] text-muted" dir="ltr">
                      secrets: {ch.secret_env_refs.join(", ")}
                    </p>
                  ) : null}
                  {isWhatsApp ? (
                    <label className="block text-sm">
                      <span className="text-muted">{a.whatsappProvider}</span>
                      <select
                        className="mt-1 w-full rounded-xl border border-beige-dark px-3 py-2 text-sm"
                        value={provider}
                        onChange={(e) =>
                          updateChannel(ch.id, {
                            configuration: {
                              ...ch.configuration,
                              provider: e.target.value,
                            },
                          })
                        }
                      >
                        <option value="auto">{a.providerAuto}</option>
                        <option value="meta">Meta Cloud API</option>
                        <option value="twilio">Twilio WhatsApp</option>
                        <option value="360dialog">360dialog</option>
                      </select>
                    </label>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  {ch.coming_soon ? (
                    <span className="rounded-lg bg-amber-50 px-2 py-1 text-center text-xs text-amber-800">
                      {a.comingSoon}
                    </span>
                  ) : null}
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-gold"
                      checked={ch.enabled}
                      onChange={(e) =>
                        updateChannel(ch.id, { enabled: e.target.checked })
                      }
                    />
                    {a.enabledVisible}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-gold"
                      checked={ch.coming_soon}
                      onChange={(e) =>
                        updateChannel(ch.id, {
                          coming_soon: e.target.checked,
                          enabled: e.target.checked ? true : ch.enabled,
                        })
                      }
                    />
                    {a.comingSoon}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-gold"
                      checked={ch.configured}
                      onChange={(e) =>
                        updateChannel(ch.id, { configured: e.target.checked })
                      }
                    />
                    {a.configuredEnv}
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="rounded-lg border border-beige-dark px-2 py-1 text-xs disabled:opacity-40"
                      disabled={index === 0}
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          channels: moveChannel(s.channels, ch.id, -1),
                        }))
                      }
                    >
                      {a.moveUp}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-beige-dark px-2 py-1 text-xs disabled:opacity-40"
                      disabled={index === channels.length - 1}
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          channels: moveChannel(s.channels, ch.id, 1),
                        }))
                      }
                    >
                      {a.moveDown}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className="text-muted">{a.otpExpiry}</span>
          <input
            type="number"
            min={60}
            max={900}
            className="mt-1 w-full rounded-xl border border-beige-dark px-3 py-2"
            value={settings.otp_expiration_seconds}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                otp_expiration_seconds: Number(e.target.value),
              }))
            }
          />
        </label>
        <label className="text-sm">
          <span className="text-muted">{a.maxAttempts}</span>
          <input
            type="number"
            min={3}
            max={10}
            className="mt-1 w-full rounded-xl border border-beige-dark px-3 py-2"
            value={settings.otp_max_attempts}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                otp_max_attempts: Number(e.target.value),
              }))
            }
          />
        </label>
        <label className="text-sm">
          <span className="text-muted">{a.resendSeconds}</span>
          <input
            type="number"
            min={30}
            max={300}
            className="mt-1 w-full rounded-xl border border-beige-dark px-3 py-2"
            value={settings.otp_resend_seconds}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                otp_resend_seconds: Number(e.target.value),
              }))
            }
          />
        </label>
      </div>

      <div className="rounded-xl bg-beige/50 px-4 py-3 text-xs text-muted">
        <p className="font-medium text-charcoal">{a.envStatus}</p>
        <ul className="mt-1 list-inside list-disc">
          <li>Supabase: {flags.supabaseConfigured ? "✓" : "✗"}</li>
          <li>
            Google: {flags.googleConfigured ? "✓" : "✗"}{" "}
            (NEXT_PUBLIC_GOOGLE_AUTH_ENABLED)
          </li>
          <li>
            Apple: {flags.appleConfigured ? "✓" : "✗"}{" "}
            (NEXT_PUBLIC_APPLE_AUTH_ENABLED)
          </li>
          <li>
            {a.whatsappOtp}{" "}
            {flags.whatsappConfigured || flags.smsConfigured ? "✓" : "✗"}
          </li>
          <li>{a.whatsappProviderEnv} {String(flags.whatsappProvider || "auto")}</li>
          <li>
            {a.resendRecovery} {flags.emailConfigured ? "✓" : "✗"} — {a.fromNotifications}
          </li>
        </ul>
        <p className="mt-2 leading-relaxed">
          {a.footerHint}
        </p>
      </div>

      {message && <p className="text-sm text-muted">{message}</p>}
      <Button loading={saving} onClick={() => void save()}>
        {a.save}
      </Button>
    </div>
  );
}
