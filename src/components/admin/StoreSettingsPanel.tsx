"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { formatPrice } from "@/lib/utils";
import {
  DEFAULT_STORE_SETTINGS,
  type StorePaymentProvider,
  type StoreSettings,
  type StoreSettingsSection,
  type StoreTaxDocumentType,
  type SystemHealthReport,
  type SystemHealthStatus,
} from "@/types/store";
import { GlobalServicesManager } from "@/components/admin/GlobalServicesManager";
import { CustomerAuthSettingsForm } from "@/components/admin/CustomerAuthSettingsForm";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  formatMessage,
  LOCALES,
  LOCALE_META,
  normalizeEnabledLocales,
  type Dictionary,
  type Locale,
} from "@/lib/i18n";

function settingsSections(t: Dictionary): { id: StoreSettingsSection | "health"; label: string }[] {
  const tabs = t.admin.settingsTabs;
  return [
    { id: "general", label: tabs.general },
    { id: "payments", label: tabs.payments },
    { id: "shipping", label: tabs.shipping },
    { id: "contact", label: tabs.contact },
    { id: "social", label: tabs.social },
    { id: "homepage", label: tabs.homepage },
    { id: "authentication", label: tabs.authentication },
    { id: "notifications", label: tabs.notifications },
    { id: "order_options", label: tabs.order_options },
    { id: "extra_services", label: tabs.extra_services },
    { id: "legal", label: tabs.legal },
    { id: "tax", label: tabs.tax },
    { id: "seo", label: tabs.seo },
    { id: "security", label: tabs.security },
    { id: "integrations", label: tabs.integrations },
    { id: "health", label: tabs.health },
  ];
}

const HEALTH_COLOR: Record<SystemHealthStatus, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
};

const HEALTH_BG: Record<SystemHealthStatus, string> = {
  green: "border-emerald-200 bg-emerald-50",
  yellow: "border-amber-200 bg-amber-50",
  red: "border-red-200 bg-red-50",
};

function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border border-beige-dark/60 px-4 py-3 text-sm ${
        disabled ? "opacity-60" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-gold"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="font-medium text-charcoal">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

function BackupStatusCard({
  status,
  note,
  lastAt,
  labels,
  onUpdated,
}: {
  status: StoreSettings["security"]["backup_status"];
  note: string;
  lastAt: string | null;
  labels: {
    title: string;
    refresh: string;
    refreshing: string;
    lastChecked: string;
    ok: string;
    warning: string;
    error: string;
    unknown: string;
  };
  onUpdated: (next: {
    backup_status: StoreSettings["security"]["backup_status"];
    backup_note: string;
    backup_last_at: string;
  }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const statusLabel =
    status === "ok"
      ? labels.ok
      : status === "warning"
        ? labels.warning
        : status === "error"
          ? labels.error
          : labels.unknown;

  const tone =
    status === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : status === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-beige-dark/60 bg-beige/30 text-charcoal";

  const refresh = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/backup-status?persist=1", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      onUpdated({
        backup_status: data.backup_status,
        backup_note: data.backup_note,
        backup_last_at: data.backup_last_at,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
    // Auto-refresh once when the security section mounts via parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{labels.title}</p>
          <p className="mt-1">
            <span className="font-semibold">{statusLabel}</span>
            <span className="text-muted"> — {note}</span>
          </p>
          {lastAt ? (
            <p className="mt-1 text-xs text-muted" dir="ltr">
              {labels.lastChecked} {lastAt}
            </p>
          ) : null}
          {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={busy}
          onClick={() => void refresh()}
        >
          {busy ? labels.refreshing : labels.refresh}
        </Button>
      </div>
    </div>
  );
}

export function StoreSettingsPanel({
  initialSettings,
}: {
  initialSettings?: StoreSettings;
}) {
  const { t } = useLocale();
  const sf = t.admin.settingsFields;
  const SECTIONS = settingsSections(t);
  const [active, setActive] = useState<StoreSettingsSection | "health">(
    "general"
  );
  const [settings, setSettings] = useState<StoreSettings>(
    initialSettings ?? DEFAULT_STORE_SETTINGS
  );
  const [loading, setLoading] = useState(!initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [health, setHealth] = useState<SystemHealthReport | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch("/api/admin/store-settings")
        .then((r) => r.json())
        .then((d) => {
          if (d.settings) setSettings(d.settings);
        })
        .catch(() => {
          /* keep defaults */
        })
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loadHealth = useCallback(() => {
    setHealthLoading(true);
    fetch("/api/admin/system-health")
      .then((r) => r.json())
      .then((d) => {
        if (d.checks) setHealth(d as SystemHealthReport);
      })
      .finally(() => setHealthLoading(false));
  }, []);

  useEffect(() => {
    if (active !== "health") return;
    const timer = window.setTimeout(() => loadHealth(), 0);
    return () => window.clearTimeout(timer);
  }, [active, loadHealth]);

  const saveSection = async (section: StoreSettingsSection) => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const patch: Partial<StoreSettings> = (() => {
        switch (section) {
          case "general":
            return { general: settings.general };
          case "payments":
            return { payments: settings.payments };
          case "shipping":
            return { shipping: settings.shipping };
          case "contact":
            return { contact: settings.contact };
          case "social":
            return { social: settings.social };
          case "homepage":
            return { homepage: settings.homepage };
          case "authentication":
            return { authentication: settings.authentication };
          case "notifications":
            return { notifications: settings.notifications };
          case "seo":
            return { seo: settings.seo };
          case "security":
            return { security: settings.security };
          case "integrations":
            return { integrations: settings.integrations };
          case "legal":
            return {
              legal: {
                ...settings.legal,
                updated_at: new Date().toISOString(),
              },
              // Banner + GA/Pixel controls live on Legal; persist SEO analytics too.
              seo: settings.seo,
            };
          case "tax":
            return { tax: settings.tax };
          case "order_options":
            return { order_options: settings.order_options };
          case "extra_services":
            return { extra_services: settings.extra_services };
          default:
            return {};
        }
      })();

      const res = await fetch("/api/admin/store-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: patch,
          sections:
            section === "legal" ? ["legal", "seo"] : [section],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.admin.ordersUi.saveFailed);
      if (data.settings) setSettings(data.settings);
      setMessage(t.admin.ordersUi.saveSuccess);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.admin.ordersUi.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const updateProvider = (
    id: string,
    patch: Partial<StorePaymentProvider>
  ) => {
    setSettings((s) => ({
      ...s,
      payments: {
        providers: s.payments.providers.map((p) =>
          p.id === id ? { ...p, ...patch } : p
        ),
      },
    }));
    setMessage("");
  };

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-beige" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-beige-dark bg-white p-3">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setActive(s.id);
              setMessage("");
              setError("");
            }}
            className={`rounded-xl px-3 py-2 text-sm transition-colors ${
              active === s.id
                ? "bg-gold/15 font-semibold text-charcoal"
                : "text-muted hover:bg-beige hover:text-charcoal"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {message ? (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-beige-dark bg-white p-6 md:p-8">
        {active === "general" && (
          <Section
            title={t.admin.settingsSections.general}
            description={sf.generalDesc}
            onSave={() => saveSection("general")}
            saving={saving}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={sf.storeName}
                value={settings.general.store_name}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    general: { ...s.general, store_name: e.target.value },
                  }))
                }
              />
              <Input
                label={sf.currency}
                value={settings.general.currency}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    general: { ...s.general, currency: e.target.value },
                  }))
                }
                dir="ltr"
              />
              <Select
                label={sf.language}
                value={(() => {
                  const enabled = normalizeEnabledLocales(
                    settings.general.enabled_locales
                  );
                  return enabled.includes(settings.general.language as Locale)
                    ? settings.general.language
                    : enabled[0] || "ar";
                })()}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    general: { ...s.general, language: e.target.value },
                  }))
                }
                options={normalizeEnabledLocales(
                  settings.general.enabled_locales
                ).map((code) => ({
                  value: code,
                  label: `${LOCALE_META[code].nativeName} / ${LOCALE_META[code].englishName}`,
                }))}
              />
              <Input
                label={sf.timezone}
                value={settings.general.timezone}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    general: { ...s.general, timezone: e.target.value },
                  }))
                }
                dir="ltr"
              />
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-charcoal">
                {sf.enabledLocales}
              </p>
              <p className="text-xs text-muted">{sf.enabledLocalesHint}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {LOCALES.map((code) => {
                  const enabledList = normalizeEnabledLocales(
                    settings.general.enabled_locales
                  );
                  const enabled = enabledList.includes(code);
                  const onlyOne = enabled && enabledList.length <= 1;
                  return (
                    <Toggle
                      key={code}
                      label={`${LOCALE_META[code].nativeName} (${LOCALE_META[code].englishName})`}
                      checked={enabled}
                      disabled={onlyOne}
                      onChange={(v) => {
                        setSettings((s) => {
                          const current = normalizeEnabledLocales(
                            s.general.enabled_locales
                          );
                          let next: Locale[] = v
                            ? normalizeEnabledLocales([...current, code])
                            : current.filter((c) => c !== code);
                          if (next.length === 0) next = [code];
                          const language = next.includes(
                            s.general.language as Locale
                          )
                            ? s.general.language
                            : next[0];
                          return {
                            ...s,
                            general: {
                              ...s.general,
                              enabled_locales: next,
                              language,
                            },
                          };
                        });
                      }}
                    />
                  );
                })}
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input
                label={sf.businessEmail}
                value={settings.general.business_email}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    general: { ...s.general, business_email: e.target.value },
                  }))
                }
                dir="ltr"
              />
              <Input
                label={sf.businessPhone}
                value={settings.general.business_phone}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    general: { ...s.general, business_phone: e.target.value },
                  }))
                }
                dir="ltr"
              />
            </div>
            <Textarea
              label={sf.descriptionAr}
              value={settings.general.description_ar}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  general: { ...s.general, description_ar: e.target.value },
                }))
              }
              rows={2}
            />
            <Textarea
              label={sf.descriptionHe}
              value={settings.general.description_he}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  general: { ...s.general, description_he: e.target.value },
                }))
              }
              rows={2}
            />
            <Textarea
              label={sf.descriptionEn}
              value={settings.general.description}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  general: { ...s.general, description: e.target.value },
                }))
              }
              rows={2}
              dir="ltr"
            />
            <Input
              label={sf.addressAr}
              value={settings.general.business_address_ar}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  general: {
                    ...s.general,
                    business_address_ar: e.target.value,
                  },
                }))
              }
            />
            <Input
              label={sf.addressHe}
              value={settings.general.business_address_he}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  general: {
                    ...s.general,
                    business_address_he: e.target.value,
                  },
                }))
              }
            />
            <Input
              label={sf.addressEn}
              value={settings.general.business_address}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  general: {
                    ...s.general,
                    business_address: e.target.value,
                  },
                }))
              }
              dir="ltr"
            />
            <Input
              label={sf.workingHoursAr}
              value={settings.general.working_hours_ar}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  general: { ...s.general, working_hours_ar: e.target.value },
                }))
              }
            />
            <Input
              label={sf.workingHoursHe}
              value={settings.general.working_hours_he}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  general: { ...s.general, working_hours_he: e.target.value },
                }))
              }
            />
            <Input
              label={sf.workingHoursEn}
              value={settings.general.working_hours}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  general: { ...s.general, working_hours: e.target.value },
                }))
              }
              dir="ltr"
            />
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-charcoal">{sf.logo}</p>
                <ImageUpload
                  value={
                    settings.general.logo_url
                      ? [settings.general.logo_url]
                      : []
                  }
                  multiple={false}
                  onChange={(urls) =>
                    setSettings((s) => ({
                      ...s,
                      general: { ...s.general, logo_url: urls[0] ?? "" },
                    }))
                  }
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-charcoal">
                  {sf.favicon}
                </p>
                <ImageUpload
                  value={
                    settings.general.favicon_url
                      ? [settings.general.favicon_url]
                      : []
                  }
                  multiple={false}
                  onChange={(urls) =>
                    setSettings((s) => ({
                      ...s,
                      general: { ...s.general, favicon_url: urls[0] ?? "" },
                    }))
                  }
                />
              </div>
            </div>
          </Section>
        )}

        {active === "payments" && (
          <Section
            title={t.admin.settingsSections.payments}
            description={sf.paymentsDesc}
            onSave={() => saveSection("payments")}
            saving={saving}
          >
            <div className="space-y-3">
              {settings.payments.providers.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-beige-dark/70 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Input
                        label={sf.nameAr}
                        value={p.name_ar}
                        onChange={(e) =>
                          updateProvider(p.id, { name_ar: e.target.value })
                        }
                      />
                      <Input
                        label={sf.nameEn}
                        value={p.name}
                        onChange={(e) =>
                          updateProvider(p.id, { name: e.target.value })
                        }
                      />
                      <Input
                        label={sf.descriptionArShort}
                        value={p.description_ar}
                        onChange={(e) =>
                          updateProvider(p.id, {
                            description_ar: e.target.value,
                          })
                        }
                      />
                      <p className="text-xs text-muted" dir="ltr">
                        id: {p.id}
                        {p.secret_env_ref
                          ? ` · secret env: ${p.secret_env_ref}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {p.coming_soon ? (
                        <span className="rounded-lg bg-amber-50 px-2 py-1 text-center text-xs text-amber-800">
                          {sf.comingSoon}
                        </span>
                      ) : null}
                      <Toggle
                        label={sf.visibleInStore}
                        checked={p.enabled || p.coming_soon}
                        onChange={(v) => {
                          if (!v) {
                            updateProvider(p.id, {
                              enabled: false,
                              coming_soon: false,
                            });
                            return;
                          }
                          if (p.id === "cod") {
                            updateProvider(p.id, {
                              enabled: true,
                              coming_soon: false,
                            });
                            return;
                          }
                          updateProvider(p.id, {
                            enabled: true,
                            coming_soon: p.coming_soon || !p.configured,
                          });
                        }}
                      />
                      <Toggle
                        label={sf.comingSoon}
                        checked={p.coming_soon}
                        disabled={p.id === "cod"}
                        onChange={(v) =>
                          updateProvider(p.id, {
                            coming_soon: v,
                            enabled: true,
                          })
                        }
                      />
                      {p.id !== "cod" ? (
                        <Toggle
                          label={sf.configuredEnv}
                          checked={p.configured}
                          onChange={(v) =>
                            updateProvider(p.id, { configured: v })
                          }
                          hint={sf.configuredEnvHint}
                        />
                      ) : null}
                      <label className="text-xs text-muted">
                        {sf.sortOrder}
                        <input
                          type="number"
                          className="mt-1 w-20 rounded-lg border border-beige-dark px-2 py-1 text-sm text-charcoal"
                          value={p.sort_order}
                          onChange={(e) =>
                            updateProvider(p.id, {
                              sort_order: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {active === "shipping" && (
          <Section
            title={t.admin.settingsSections.shipping}
            description={sf.shippingDesc}
            onSave={() => saveSection("shipping")}
            saving={saving}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                label={sf.shippingEnabled}
                checked={settings.shipping.shipping_enabled}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    shipping: { ...s.shipping, shipping_enabled: v },
                  }))
                }
              />
              <Toggle
                label={sf.boutiquePickup}
                checked={settings.shipping.boutique_pickup_enabled}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    shipping: { ...s.shipping, boutique_pickup_enabled: v },
                  }))
                }
              />
              <Toggle
                label={sf.deliveryEnabled}
                checked={settings.shipping.delivery_enabled}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    shipping: { ...s.shipping, delivery_enabled: v },
                  }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={formatMessage(sf.flatFee, { price: formatPrice(settings.shipping.shipping_flat_fee) })}
                type="number"
                min={0}
                dir="ltr"
                value={settings.shipping.shipping_flat_fee}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    shipping: {
                      ...s.shipping,
                      shipping_flat_fee: Math.max(0, Number(e.target.value) || 0),
                    },
                  }))
                }
              />
              <Input
                label={sf.freeThreshold}
                type="number"
                min={0}
                dir="ltr"
                value={settings.shipping.shipping_free_threshold}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    shipping: {
                      ...s.shipping,
                      shipping_free_threshold: Math.max(
                        0,
                        Number(e.target.value) || 0
                      ),
                    },
                  }))
                }
              />
            </div>
            <Input
              label={sf.estimatedDeliveryAr}
              value={settings.shipping.estimated_delivery_ar}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  shipping: {
                    ...s.shipping,
                    estimated_delivery_ar: e.target.value,
                  },
                }))
              }
              placeholder={sf.estimatedDeliveryPlaceholder}
            />
            <p className="text-sm text-muted">
              {sf.shippingRegionsHint}{" "}
              <Link href="/admin/shipping" className="text-gold underline">
                {sf.shippingRegionsLink}
              </Link>
              .
            </p>
          </Section>
        )}

        {active === "contact" && (
          <Section
            title={t.admin.settingsSections.contact}
            description={sf.contactDesc}
            onSave={() => saveSection("contact")}
            saving={saving}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={sf.phone}
                value={settings.contact.phone}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    contact: { ...s.contact, phone: e.target.value },
                  }))
                }
                dir="ltr"
              />
              <Input
                label={sf.whatsapp}
                value={settings.contact.whatsapp}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    contact: { ...s.contact, whatsapp: e.target.value },
                  }))
                }
                dir="ltr"
              />
              <Input
                label={sf.email}
                value={settings.contact.email}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    contact: { ...s.contact, email: e.target.value },
                  }))
                }
                dir="ltr"
              />
              <Input
                label={sf.instagram}
                value={settings.contact.instagram_url}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    contact: { ...s.contact, instagram_url: e.target.value },
                  }))
                }
                dir="ltr"
              />
              <Input
                label={sf.facebook}
                value={settings.contact.facebook_url}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    contact: { ...s.contact, facebook_url: e.target.value },
                  }))
                }
                dir="ltr"
              />
              <Input
                label={sf.tiktok}
                value={settings.contact.tiktok_url}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    contact: { ...s.contact, tiktok_url: e.target.value },
                  }))
                }
                dir="ltr"
              />
            </div>
            <Input
              label={sf.location}
              value={settings.contact.location_ar}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  contact: { ...s.contact, location_ar: e.target.value },
                }))
              }
            />
            <Input
              label={sf.googleMaps}
              value={settings.contact.google_maps_url}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  contact: { ...s.contact, google_maps_url: e.target.value },
                }))
              }
              dir="ltr"
            />
          </Section>
        )}

        {active === "social" && (
          <Section
            title={t.admin.settingsSections.social}
            description={sf.socialDesc}
            onSave={() => saveSection("social")}
            saving={saving}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["instagram_url", sf.instagram],
                  ["facebook_url", sf.facebook],
                  ["tiktok_url", sf.tiktok],
                  ["pinterest_url", sf.pinterest],
                  ["youtube_url", sf.youtube],
                ] as const
              ).map(([key, label]) => (
                <Input
                  key={key}
                  label={label}
                  value={settings.social[key]}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      social: { ...s.social, [key]: e.target.value },
                    }))
                  }
                  dir="ltr"
                />
              ))}
            </div>
          </Section>
        )}

        {active === "homepage" && (
          <Section
            title={t.admin.settingsSections.homepage}
            description={sf.homepageDesc}
            onSave={() => saveSection("homepage")}
            saving={saving}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["hero", sf.hero],
                  ["featured_categories", sf.featuredCategories],
                  ["featured_products", sf.featuredProducts],
                  ["accessories_editorial", sf.accessoriesEditorial],
                  ["collections", sf.collectionsSection],
                  ["worn_by_you", sf.wornByYou],
                  ["instagram", sf.instagram],
                ] as const
              ).map(([key, label]) => (
                <Toggle
                  key={key}
                  label={label}
                  checked={settings.homepage[key]}
                  onChange={(v) =>
                    setSettings((s) => ({
                      ...s,
                      homepage: { ...s.homepage, [key]: v },
                    }))
                  }
                />
              ))}
            </div>
            <p className="text-sm text-muted">
              {sf.editHeroHint}{" "}
              <Link href="/admin/content/home" className="text-gold underline">
                {sf.homeContentLink}
              </Link>
            </p>
          </Section>
        )}

        {active === "authentication" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-charcoal">
                {t.admin.settingsSections.authentication}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {sf.authDesc}
              </p>
            </div>
            <div className="mb-2 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["guest_checkout_enabled", sf.guestCheckout],
                  ["google_enabled", "Google"],
                  ["apple_enabled", "Apple"],
                  ["email_password_enabled", sf.emailPassword],
                  ["phone_otp_enabled", sf.whatsappOtp],
                  ["registration_enabled", sf.registration],
                ] as const
              ).map(([key, label]) => (
                <Toggle
                  key={key}
                  label={label}
                  checked={settings.authentication[key]}
                  onChange={(v) =>
                    setSettings((s) => ({
                      ...s,
                      authentication: { ...s.authentication, [key]: v },
                    }))
                  }
                />
              ))}
            </div>
            <div className="border-t border-beige-dark pt-4">
              <Button
                type="button"
                loading={saving}
                onClick={() => saveSection("authentication")}
              >
                {sf.saveQuickKeys}
              </Button>
            </div>
            <CustomerAuthSettingsForm embedded />
          </div>
        )}

        {active === "notifications" && (
          <Section
            title={t.admin.settingsSections.notifications}
            description={sf.notificationsDesc}
            onSave={() => saveSection("notifications")}
            saving={saving}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                label={sf.notifEmail}
                checked={settings.notifications.email_enabled}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: { ...s.notifications, email_enabled: v },
                  }))
                }
              />
              <Toggle
                label={sf.notifWhatsapp}
                checked={settings.notifications.whatsapp_enabled}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: { ...s.notifications, whatsapp_enabled: v },
                  }))
                }
              />
              <Toggle
                label="SMS"
                checked={settings.notifications.sms_enabled}
                disabled={settings.notifications.sms_coming_soon}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: { ...s.notifications, sms_enabled: v },
                  }))
                }
                hint={sf.comingSoon}
              />
            </div>
            <p className="text-sm text-muted">
              {sf.resendTemplatesHint}{" "}
              <Link href="/admin/notifications" className="text-gold underline">
                {sf.notificationsLink}
              </Link>
            </p>
          </Section>
        )}

        {active === "order_options" && (
          <Section
            title={t.admin.settingsSections.order_options}
            description={sf.orderOptionsDesc}
            onSave={() => saveSection("order_options")}
            saving={saving}
          >
            <div className="space-y-3">
              {settings.order_options.options.map((opt, idx) => (
                <div
                  key={opt.key}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-beige-dark/70 p-4"
                >
                  <div>
                    <p className="font-semibold text-charcoal">{opt.label_ar}</p>
                    <p className="text-xs text-muted" dir="ltr">
                      {opt.key}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Toggle
                      label={sf.enabled}
                      checked={opt.enabled}
                      onChange={(v) =>
                        setSettings((s) => {
                          const options = [...s.order_options.options];
                          options[idx] = { ...options[idx], enabled: v };
                          return {
                            ...s,
                            order_options: { options },
                          };
                        })
                      }
                    />
                    <Toggle
                      label={sf.required}
                      checked={opt.required}
                      disabled={!opt.enabled}
                      onChange={(v) =>
                        setSettings((s) => {
                          const options = [...s.order_options.options];
                          options[idx] = { ...options[idx], required: v };
                          return {
                            ...s,
                            order_options: { options },
                          };
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {active === "extra_services" && (
          <Section
            title={t.admin.settingsSections.extra_services}
            description={sf.extraServicesDesc}
            onSave={() => saveSection("extra_services")}
            saving={saving}
          >
            <GlobalServicesManager
              services={settings.extra_services.services}
              onChange={(services) =>
                setSettings((s) => ({
                  ...s,
                  extra_services: { services },
                }))
              }
            />
          </Section>
        )}

        {active === "seo" && (
          <Section
            title={t.admin.settingsSections.seo}
            description={sf.seoDesc}
            onSave={() => saveSection("seo")}
            saving={saving}
          >
            <Input
              label={sf.defaultPageTitle}
              value={settings.seo.title}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  seo: { ...s.seo, title: e.target.value },
                }))
              }
            />
            <Textarea
              label={sf.seoDescription}
              value={settings.seo.description}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  seo: { ...s.seo, description: e.target.value },
                }))
              }
              rows={3}
            />
            <Input
              label={sf.keywords}
              value={settings.seo.keywords}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  seo: { ...s.seo, keywords: e.target.value },
                }))
              }
            />
            <div>
              <p className="mb-2 text-sm font-medium text-charcoal">
                {sf.ogImage}
              </p>
              <ImageUpload
                value={
                  settings.seo.og_image_url ? [settings.seo.og_image_url] : []
                }
                multiple={false}
                onChange={(urls) =>
                  setSettings((s) => ({
                    ...s,
                    seo: { ...s.seo, og_image_url: urls[0] ?? "" },
                  }))
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                label="robots: index"
                checked={settings.seo.robots_index}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    seo: { ...s.seo, robots_index: v },
                  }))
                }
              />
              <Toggle
                label="robots: follow"
                checked={settings.seo.robots_follow}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    seo: { ...s.seo, robots_follow: v },
                  }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <Input
                  label={sf.googleAnalyticsId}
                  value={settings.seo.google_analytics_id}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      seo: {
                        ...s.seo,
                        google_analytics_id: e.target.value,
                        google_analytics_enabled: e.target.value.trim()
                          ? s.seo.google_analytics_enabled
                          : false,
                      },
                    }))
                  }
                  dir="ltr"
                  placeholder="G-XXXXXXXX"
                />
                <Toggle
                  label={sf.googleAnalyticsActive}
                  checked={settings.seo.google_analytics_enabled}
                  disabled={!settings.seo.google_analytics_id.trim()}
                  onChange={(v) =>
                    setSettings((s) => ({
                      ...s,
                      seo: { ...s.seo, google_analytics_enabled: v },
                    }))
                  }
                  hint={
                    settings.seo.google_analytics_id.trim()
                      ? undefined
                      : sf.analyticsNeedsId
                  }
                />
              </div>
              <div className="space-y-3">
                <Input
                  label={sf.metaPixelId}
                  value={settings.seo.meta_pixel_id}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      seo: {
                        ...s.seo,
                        meta_pixel_id: e.target.value,
                        meta_pixel_enabled: e.target.value.trim()
                          ? s.seo.meta_pixel_enabled
                          : false,
                      },
                    }))
                  }
                  dir="ltr"
                />
                <Toggle
                  label={sf.metaPixelActive}
                  checked={settings.seo.meta_pixel_enabled}
                  disabled={!settings.seo.meta_pixel_id.trim()}
                  onChange={(v) =>
                    setSettings((s) => ({
                      ...s,
                      seo: { ...s.seo, meta_pixel_enabled: v },
                    }))
                  }
                  hint={
                    settings.seo.meta_pixel_id.trim()
                      ? undefined
                      : sf.analyticsNeedsId
                  }
                />
              </div>
            </div>
          </Section>
        )}

        {active === "security" && (
          <Section
            title={t.admin.settingsSections.security}
            description={sf.securityDesc}
            onSave={() => saveSection("security")}
            saving={saving}
          >
            <Input
              label={sf.sessionTimeout}
              type="number"
              min={5}
              max={1440}
              dir="ltr"
              value={settings.security.session_timeout_minutes}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  security: {
                    ...s.security,
                    session_timeout_minutes: Math.max(
                      5,
                      Number(e.target.value) || 60
                    ),
                  },
                }))
              }
            />
            <p className="-mt-2 text-xs text-muted">{sf.sessionTimeoutHint}</p>
            <Toggle
              label={sf.maintenanceMode}
              checked={settings.security.maintenance_mode}
              onChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  security: { ...s.security, maintenance_mode: v },
                }))
              }
              hint={sf.maintenanceHint}
            />
            <Textarea
              label={sf.maintenanceMessageAr}
              rows={2}
              value={settings.security.maintenance_message_ar}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  security: {
                    ...s.security,
                    maintenance_message_ar: e.target.value,
                  },
                }))
              }
            />
            <Textarea
              label={sf.maintenanceMessageHe}
              rows={2}
              value={settings.security.maintenance_message_he}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  security: {
                    ...s.security,
                    maintenance_message_he: e.target.value,
                  },
                }))
              }
            />
            <Textarea
              label={sf.maintenanceMessageEn}
              rows={2}
              value={settings.security.maintenance_message_en}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  security: {
                    ...s.security,
                    maintenance_message_en: e.target.value,
                  },
                }))
              }
            />
            <BackupStatusCard
              status={settings.security.backup_status}
              note={settings.security.backup_note}
              lastAt={settings.security.backup_last_at}
              labels={{
                title: sf.backupStatus,
                refresh: sf.backupRefresh,
                refreshing: sf.backupRefreshing,
                lastChecked: sf.backupLastChecked,
                ok: sf.backupStatusOk,
                warning: sf.backupStatusWarning,
                error: sf.backupStatusError,
                unknown: sf.backupStatusUnknown,
              }}
              onUpdated={(next) =>
                setSettings((s) => ({
                  ...s,
                  security: {
                    ...s.security,
                    backup_status: next.backup_status,
                    backup_note: next.backup_note,
                    backup_last_at: next.backup_last_at,
                  },
                }))
              }
            />
          </Section>
        )}

        {active === "integrations" && (
          <Section
            title={t.admin.settingsSections.integrations}
            description={sf.integrationsDesc}
            onSave={() => saveSection("integrations")}
            saving={saving}
          >
            <div className="space-y-3">
              {settings.integrations.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-beige-dark/70 p-4"
                >
                  <div>
                    <p className="font-semibold text-charcoal">{item.name}</p>
                    <p className="mt-1 text-xs text-muted" dir="ltr">
                      {item.env_refs.join(", ") || "—"}
                    </p>
                    <p className="mt-1 text-sm text-muted">{item.notes}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {item.coming_soon ? (
                      <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">
                        {sf.comingSoon}
                      </span>
                    ) : null}
                    <Toggle
                      label="Configured"
                      checked={item.configured}
                      onChange={(v) =>
                        setSettings((s) => {
                          const next = [...s.integrations];
                          next[idx] = { ...next[idx], configured: v };
                          return { ...s, integrations: next };
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {active === "legal" && (
          <Section
            title={t.admin.settingsSections.legal}
            description={sf.legalDesc}
            onSave={() => saveSection("legal")}
            saving={saving}
          >
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
              {sf.legalBannerHint}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                checked={settings.legal.show_template_banner}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    legal: { ...s.legal, show_template_banner: v },
                  }))
                }
                label={sf.showTemplateBanner}
              />
              <Toggle
                checked={settings.legal.require_checkout_acceptance}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    legal: { ...s.legal, require_checkout_acceptance: v },
                  }))
                }
                label={sf.requireCheckoutAcceptance}
              />
            </div>

            <div className="rounded-xl border border-beige-dark/70 bg-beige/20 px-4 py-4 space-y-4">
              <div>
                <p className="font-medium text-charcoal">
                  {sf.cookiesAnalyticsTitle}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {sf.cookiesAnalyticsHint}
                </p>
              </div>
              <Toggle
                checked={settings.legal.cookie_banner_enabled}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    legal: { ...s.legal, cookie_banner_enabled: v },
                  }))
                }
                label={sf.cookieBannerEnabled}
                hint={sf.cookieBannerHint}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <Input
                    label={sf.googleAnalyticsId}
                    value={settings.seo.google_analytics_id}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        seo: {
                          ...s.seo,
                          google_analytics_id: e.target.value,
                          google_analytics_enabled: e.target.value.trim()
                            ? s.seo.google_analytics_enabled
                            : false,
                        },
                      }))
                    }
                    dir="ltr"
                    placeholder="G-XXXXXXXX"
                  />
                  <Toggle
                    label={sf.googleAnalyticsActive}
                    checked={settings.seo.google_analytics_enabled}
                    disabled={!settings.seo.google_analytics_id.trim()}
                    onChange={(v) =>
                      setSettings((s) => ({
                        ...s,
                        seo: { ...s.seo, google_analytics_enabled: v },
                      }))
                    }
                    hint={
                      settings.seo.google_analytics_id.trim()
                        ? undefined
                        : sf.analyticsNeedsId
                    }
                  />
                </div>
                <div className="space-y-3">
                  <Input
                    label={sf.metaPixelId}
                    value={settings.seo.meta_pixel_id}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        seo: {
                          ...s.seo,
                          meta_pixel_id: e.target.value,
                          meta_pixel_enabled: e.target.value.trim()
                            ? s.seo.meta_pixel_enabled
                            : false,
                        },
                      }))
                    }
                    dir="ltr"
                  />
                  <Toggle
                    label={sf.metaPixelActive}
                    checked={settings.seo.meta_pixel_enabled}
                    disabled={!settings.seo.meta_pixel_id.trim()}
                    onChange={(v) =>
                      setSettings((s) => ({
                        ...s,
                        seo: { ...s.seo, meta_pixel_enabled: v },
                      }))
                    }
                    hint={
                      settings.seo.meta_pixel_id.trim()
                        ? undefined
                        : sf.analyticsNeedsId
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                href="/legal/terms"
                className="text-gold underline"
                target="_blank"
              >
                {sf.previewTerms}
              </Link>
              <Link
                href="/legal/privacy"
                className="text-gold underline"
                target="_blank"
              >
                {sf.previewPrivacy}
              </Link>
              <Link
                href="/legal/returns"
                className="text-gold underline"
                target="_blank"
              >
                {sf.previewReturns}
              </Link>
              <Link
                href="/legal/shipping"
                className="text-gold underline"
                target="_blank"
              >
                {sf.previewShipping}
              </Link>
              <Link
                href="/contact"
                className="text-gold underline"
                target="_blank"
              >
                {sf.previewContact}
              </Link>
            </div>
            {(
              [
                ["terms_ar", sf.termsAr],
                ["terms_he", sf.termsHe],
                ["privacy_ar", sf.privacyAr],
                ["privacy_he", sf.privacyHe],
                ["returns_ar", sf.returnsAr],
                ["returns_he", sf.returnsHe],
                ["shipping_policy_ar", sf.shippingPolicyAr],
                ["shipping_policy_he", sf.shippingPolicyHe],
                ["terms_en", sf.termsEn],
                ["privacy_en", sf.privacyEn],
                ["returns_en", sf.returnsEn],
                ["shipping_policy_en", sf.shippingPolicyEn],
              ] as const
            ).map(([key, label]) => (
              <Textarea
                key={key}
                label={label}
                value={settings.legal[key]}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    legal: { ...s.legal, [key]: e.target.value },
                  }))
                }
                rows={key.endsWith("_en") ? 4 : 8}
                dir={key.endsWith("_en") ? "ltr" : "rtl"}
              />
            ))}
          </Section>
        )}

        {active === "tax" && (
          <Section
            title={t.admin.settingsSections.tax}
            description={sf.taxDesc}
            onSave={() => saveSection("tax")}
            saving={saving}
          >
            <div className="rounded-xl border border-beige-dark bg-beige/40 px-4 py-3 text-sm text-muted">
              {settings.tax.provider_notes}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={sf.businessId}
                value={settings.tax.business_id}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    tax: { ...s.tax, business_id: e.target.value },
                  }))
                }
                dir="ltr"
                placeholder="512345678"
              />
              <Select
                label={sf.businessIdType}
                value={settings.tax.business_id_type}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    tax: {
                      ...s.tax,
                      business_id_type: e.target
                        .value as StoreSettings["tax"]["business_id_type"],
                    },
                  }))
                }
                options={[
                  { value: "authorized_dealer", label: sf.idAuthorizedDealer },
                  { value: "company", label: sf.idCompany },
                  { value: "exempt", label: sf.idExempt },
                  { value: "other", label: sf.idOther },
                ]}
              />
              <Input
                label={sf.vatRate}
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={String(settings.tax.vat_rate)}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    tax: {
                      ...s.tax,
                      vat_rate: Number(e.target.value) || 0,
                    },
                  }))
                }
                dir="ltr"
              />
              <Input
                label={sf.invoicePrefix}
                value={settings.tax.invoice_prefix}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    tax: { ...s.tax, invoice_prefix: e.target.value },
                  }))
                }
                dir="ltr"
              />
              <Input
                label={sf.nextInvoiceNumber}
                type="number"
                min={1}
                value={String(settings.tax.next_invoice_number)}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    tax: {
                      ...s.tax,
                      next_invoice_number: Math.max(
                        1,
                        Math.floor(Number(e.target.value) || 1)
                      ),
                    },
                  }))
                }
                dir="ltr"
              />
              <Select
                label={sf.defaultDocumentType}
                value={settings.tax.default_document_type}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    tax: {
                      ...s.tax,
                      default_document_type: e.target
                        .value as StoreTaxDocumentType,
                    },
                  }))
                }
                options={[
                  {
                    value: "tax_invoice_receipt",
                    label: sf.docTaxInvoiceReceipt,
                  },
                  { value: "tax_invoice", label: sf.docTaxInvoice },
                  { value: "receipt", label: sf.docReceipt },
                ]}
              />
              <Select
                label={sf.issueTrigger}
                value={settings.tax.issue_trigger}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    tax: {
                      ...s.tax,
                      issue_trigger: e.target
                        .value as StoreSettings["tax"]["issue_trigger"],
                    },
                  }))
                }
                options={[
                  { value: "on_order", label: sf.issueOnOrder },
                  {
                    value: "on_payment_received",
                    label: sf.issueOnPayment,
                  },
                  { value: "manual", label: sf.issueManual },
                ]}
              />
            </div>
            <Toggle
              checked={settings.tax.prices_include_vat}
              onChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  tax: { ...s.tax, prices_include_vat: v },
                }))
              }
              label={sf.pricesIncludeVat}
              hint={sf.pricesIncludeVatHint}
            />
            <p className="text-xs text-muted">
              {sf.taxFooterHint}
            </p>
          </Section>
        )}

        {active === "health" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-charcoal">
                  {t.admin.settingsSections.health}
                </h2>
                <p className="text-sm text-muted">
                  {sf.healthDesc}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                loading={healthLoading}
                onClick={loadHealth}
              >
                {sf.refreshHealth}
              </Button>
            </div>
            {health ? (
              <>
                <div
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${HEALTH_BG[health.overall]}`}
                >
                  <span
                    className={`h-3 w-3 rounded-full ${HEALTH_COLOR[health.overall]}`}
                  />
                  <span className="text-sm font-medium text-charcoal">
                    {formatMessage(sf.overallStatus, { status: health.overall })}
                  </span>
                  <span className="text-xs text-muted" dir="ltr">
                    {health.checked_at}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {health.checks.map((c) => (
                    <div
                      key={c.id}
                      className={`rounded-xl border px-4 py-3 ${HEALTH_BG[c.status]}`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${HEALTH_COLOR[c.status]}`}
                        />
                        <p className="font-medium text-charcoal">
                          {c.label_ar}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-muted">{c.detail_ar}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-32 animate-pulse rounded-xl bg-beige" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
  onSave,
  saving,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onSave: () => void;
  saving: boolean;
}) {
  const { t } = useLocale();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-charcoal">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
      <div className="border-t border-beige-dark pt-4">
        <Button type="button" loading={saving} onClick={onSave}>
          {t.admin.saveChanges}
        </Button>
      </div>
    </div>
  );
}
