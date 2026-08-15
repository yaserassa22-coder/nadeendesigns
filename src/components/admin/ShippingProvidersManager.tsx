"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/admin/lifecycle/ConfirmDialog";
import type { ShippingProviderPublic, ShippingRateRow } from "@/lib/shipping/providers/types";

type LocaleKey = "ar" | "he" | "en";

type AdapterOption = {
  code: string;
  label: { ar: string; he: string; en: string };
};

function fieldLabel(
  field: ShippingProviderPublic["credential_fields"][number],
  locale: LocaleKey
) {
  if (locale === "ar" && field.label_ar) return field.label_ar;
  if (locale === "he" && field.label_he) return field.label_he;
  return field.label;
}

function providerName(p: ShippingProviderPublic, locale: LocaleKey) {
  return p.label[locale] || p.label.en || p.code;
}

export function ShippingProvidersManager() {
  const { t, locale } = useLocale();
  const ui = t.admin.shippingProvidersUi;
  const loc = locale as LocaleKey;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [providers, setProviders] = useState<ShippingProviderPublic[]>([]);
  const [adapters, setAdapters] = useState<AdapterOption[]>([]);
  const [rates, setRates] = useState<ShippingRateRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleteCode, setDeleteCode] = useState<string | null>(null);
  const [addDraft, setAddDraft] = useState({
    code: "",
    label_ar: "",
    label_he: "",
    label_en: "",
    adapter_code: "manual",
  });
  const [secretDrafts, setSecretDrafts] = useState<
    Record<string, Record<string, string>>
  >({});
  const [rateDraft, setRateDraft] = useState({
    provider_code: "",
    service_code: "",
    service_name: "",
    price: "",
    free_shipping_threshold: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/shipping/providers");
      const data = (await res.json()) as {
        error?: string;
        can_manage?: boolean;
        providers?: ShippingProviderPublic[];
        rates?: ShippingRateRow[];
        adapters?: AdapterOption[];
      };
      if (!res.ok) throw new Error(data.error || ui.loadFailed);
      setCanManage(Boolean(data.can_manage));
      setProviders(data.providers ?? []);
      setRates(data.rates ?? []);
      if (data.adapters) setAdapters(data.adapters);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : ui.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [ui.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProvider = async (code: string, extra?: Record<string, unknown>) => {
    const p = providers.find((x) => x.code === code);
    if (!p) return;
    setSaving(code);
    setMessage(null);
    try {
      const secrets: Record<string, string> = {
        ...(secretDrafts[code] ?? {}),
      };
      for (const field of p.credential_fields) {
        if (field.kind !== "secret") continue;
        if (secrets[field.key] === undefined) secrets[field.key] = "";
      }
      const public_config: Record<string, string> = { ...p.public_config };
      const res = await fetch("/api/admin/shipping/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providers: [
            {
              code,
              enabled: p.enabled,
              environment: p.environment,
              is_active_provider: p.is_active_provider,
              enabled_services: p.enabled_services,
              public_config,
              secrets,
              ...extra,
            },
          ],
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        providers?: ShippingProviderPublic[];
        rates?: ShippingRateRow[];
      };
      if (!res.ok) throw new Error(data.error || ui.saveFailed);
      if (data.providers) setProviders(data.providers);
      if (data.rates) setRates(data.rates);
      setSecretDrafts((prev) => ({ ...prev, [code]: {} }));
      setMessage(ui.saved);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : ui.saveFailed);
    } finally {
      setSaving(null);
    }
  };

  const testConnection = async (code: string) => {
    setTesting(code);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/shipping/providers/${encodeURIComponent(code)}/test`,
        { method: "POST" }
      );
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || ui.testFailed);
      setMessage(data.message || (data.ok ? ui.testOk : ui.testFailed));
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : ui.testFailed);
    } finally {
      setTesting(null);
    }
  };

  const addProvider = async () => {
    if (!addDraft.label_ar.trim() || !addDraft.code.trim()) return;
    setSaving("add");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/shipping/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: addDraft.code.trim(),
          label_ar: addDraft.label_ar.trim(),
          label_he: addDraft.label_he.trim() || undefined,
          label_en: addDraft.label_en.trim() || undefined,
          adapter_code: addDraft.adapter_code,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        providers?: ShippingProviderPublic[];
        rates?: ShippingRateRow[];
      };
      if (!res.ok) {
        throw new Error(
          data.error === "Provider already exists" ? ui.codeTaken : data.error || ui.saveFailed
        );
      }
      if (data.providers) setProviders(data.providers);
      if (data.rates) setRates(data.rates);
      setAddDraft({
        code: "",
        label_ar: "",
        label_he: "",
        label_en: "",
        adapter_code: addDraft.adapter_code,
      });
      setMessage(ui.created);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : ui.saveFailed);
    } finally {
      setSaving(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteCode) return;
    setSaving(deleteCode);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/shipping/providers/${encodeURIComponent(deleteCode)}`,
        { method: "DELETE" }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || ui.saveFailed);
      setProviders((prev) => prev.filter((p) => p.code !== deleteCode));
      setDeleteCode(null);
      setMessage(ui.deleted);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : ui.saveFailed);
    } finally {
      setSaving(null);
    }
  };

  const statusLabel = (p: ShippingProviderPublic) => {
    if (p.connection_status === "ok") return ui.statusOk;
    if (p.connection_status === "error") return ui.statusError;
    if (p.connection_status === "not_implemented") return ui.statusNotImplemented;
    if (p.connection_status === "not_configured") return ui.statusNotConfigured;
    return ui.statusUnknown;
  };

  const saveRate = async () => {
    if (!rateDraft.provider_code || !rateDraft.service_code.trim()) return;
    setSaving("rate");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/shipping/rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_code: rateDraft.provider_code,
          service_code: rateDraft.service_code.trim(),
          service_name: rateDraft.service_name.trim() || null,
          price: Number(rateDraft.price) || 0,
          free_shipping_threshold: rateDraft.free_shipping_threshold.trim()
            ? Number(rateDraft.free_shipping_threshold)
            : null,
          is_active: true,
        }),
      });
      const data = (await res.json()) as { error?: string; rate?: ShippingRateRow };
      if (!res.ok) throw new Error(data.error || ui.saveFailed);
      if (data.rate) {
        setRates((prev) => {
          const rest = prev.filter((r) => r.id !== data.rate!.id);
          return [...rest, data.rate!];
        });
      }
      setRateDraft((d) => ({
        ...d,
        service_code: "",
        service_name: "",
        price: "",
        free_shipping_threshold: "",
      }));
      setMessage(ui.saved);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : ui.saveFailed);
    } finally {
      setSaving(null);
    }
  };

  if (loading && providers.length === 0) {
    return (
      <section className="rounded-2xl border border-beige-dark bg-white/90 p-5 shadow-sm">
        <p className="text-sm text-muted">{t.common.loading}</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-charcoal">{ui.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">{ui.subtitle}</p>
        </div>
        <Link
          href="/admin/shipping"
          className="text-sm text-gold hover:underline"
        >
          {ui.regionsLink}
        </Link>
      </div>

      {!canManage ? (
        <p className="rounded-xl border border-beige-dark bg-beige/40 px-4 py-3 text-sm text-muted">
          {ui.canManageOnly}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-xl border border-beige-dark bg-white px-4 py-3 text-sm text-charcoal">
          {message}
        </p>
      ) : null}

      {canManage ? (
        <section className="rounded-2xl border border-beige-dark bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-charcoal">{ui.addTitle}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input
              label={ui.addNameAr}
              value={addDraft.label_ar}
              onChange={(e) =>
                setAddDraft((d) => ({ ...d, label_ar: e.target.value }))
              }
            />
            <Input
              label={ui.addCode}
              dir="ltr"
              value={addDraft.code}
              onChange={(e) =>
                setAddDraft((d) => ({ ...d, code: e.target.value }))
              }
            />
            <Input
              label={ui.addNameHe}
              value={addDraft.label_he}
              onChange={(e) =>
                setAddDraft((d) => ({ ...d, label_he: e.target.value }))
              }
            />
            <Input
              label={ui.addNameEn}
              value={addDraft.label_en}
              onChange={(e) =>
                setAddDraft((d) => ({ ...d, label_en: e.target.value }))
              }
            />
            <label className="block text-xs text-muted sm:col-span-2">
              {ui.addAdapter}
              <select
                className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2 text-sm text-charcoal"
                value={addDraft.adapter_code}
                onChange={(e) =>
                  setAddDraft((d) => ({ ...d, adapter_code: e.target.value }))
                }
              >
                {adapters.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.label[loc] || a.label.en || a.code}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-muted">
                {ui.addCodeHint}
              </span>
            </label>
          </div>
          <div className="mt-4">
            <Button
              size="sm"
              loading={saving === "add"}
              disabled={!addDraft.label_ar.trim() || !addDraft.code.trim()}
              onClick={() => void addProvider()}
            >
              {ui.addSubmit}
            </Button>
          </div>
        </section>
      ) : null}

      {providers.length === 0 ? (
        <p className="text-sm text-muted">{ui.noAdapters}</p>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => {
            const open = expanded === p.code;
            return (
              <section
                key={p.code}
                className="rounded-2xl border border-beige-dark bg-white/90 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-start"
                    onClick={() => setExpanded(open ? null : p.code)}
                  >
                    <p className="font-medium text-charcoal">
                      {providerName(p, loc)}
                      <span className="ms-2 text-xs text-muted">({p.code})</span>
                      {p.is_active_provider ? (
                        <span className="ms-2 text-xs text-gold">
                          {ui.activeProvider}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted">
                      {ui.connectionStatus}: {statusLabel(p)}
                      {" · "}
                      {p.enabled ? ui.enabled : ui.disabled}
                      {" · "}
                      {ui.environment}:{" "}
                      {p.environment === "production"
                        ? ui.envProduction
                        : ui.envTest}
                    </p>
                    <p className="text-xs text-muted">
                      {ui.lastTest}:{" "}
                      {p.last_test_at
                        ? `${p.last_test_ok ? ui.testOk : ui.testFailed} — ${p.last_test_message || p.last_test_at}`
                        : ui.lastTestNever}
                    </p>
                  </button>
                  {canManage ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpanded(open ? null : p.code)}
                      >
                        {ui.configure}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        loading={testing === p.code}
                        onClick={() => void testConnection(p.code)}
                      >
                        {ui.testConnection}
                      </Button>
                      <Button
                        size="sm"
                        variant={p.enabled ? "outline" : "primary"}
                        loading={saving === p.code}
                        onClick={() => {
                          setProviders((prev) =>
                            prev.map((x) =>
                              x.code === p.code
                                ? { ...x, enabled: !x.enabled }
                                : x
                            )
                          );
                          void saveProvider(p.code, { enabled: !p.enabled });
                        }}
                      >
                        {p.enabled ? ui.disable : ui.enable}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        loading={saving === p.code}
                        onClick={() => setDeleteCode(p.code)}
                      >
                        {ui.deleteProvider}
                      </Button>
                    </div>
                  ) : null}
                </div>

                {open ? (
                  <div className="space-y-4 border-t border-beige-dark px-4 py-4 text-sm">
                    {!p.implementation_ready ? (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        {ui.notImplementedHint}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2">
                        <span className="text-xs text-muted">{ui.environment}</span>
                        <select
                          className="rounded-lg border border-beige-dark px-2 py-1"
                          value={p.environment}
                          disabled={!canManage}
                          onChange={(e) =>
                            setProviders((prev) =>
                              prev.map((x) =>
                                x.code === p.code
                                  ? {
                                      ...x,
                                      environment: e.target.value as
                                        | "test"
                                        | "production",
                                    }
                                  : x
                              )
                            )
                          }
                        >
                          <option value="test">{ui.envTest}</option>
                          <option value="production">{ui.envProduction}</option>
                        </select>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="accent-gold"
                          checked={p.is_active_provider}
                          disabled={!canManage}
                          onChange={(e) =>
                            setProviders((prev) =>
                              prev.map((x) => ({
                                ...x,
                                is_active_provider:
                                  x.code === p.code
                                    ? e.target.checked
                                    : e.target.checked
                                      ? false
                                      : x.is_active_provider,
                              }))
                            )
                          }
                        />
                        <span className="text-xs text-muted">{ui.setActive}</span>
                      </label>
                    </div>

                    <p className="text-xs text-muted">{ui.credentialsHint}</p>

                    {p.credential_fields.map((field) => {
                      const isSecret = field.kind === "secret";
                      const value = isSecret
                        ? secretDrafts[p.code]?.[field.key] ?? ""
                        : p.public_config[field.key] ?? "";
                      return (
                        <label key={field.key} className="block">
                          <span className="text-xs text-muted">
                            {fieldLabel(field, loc)}
                            {field.required ? " *" : ""}
                          </span>
                          <input
                            type={
                              isSecret
                                ? "password"
                                : field.inputType === "password"
                                  ? "password"
                                  : "text"
                            }
                            autoComplete="off"
                            disabled={!canManage}
                            className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2"
                            placeholder={
                              isSecret
                                ? p.secrets_masked[field.key] || ui.secretKeep
                                : ""
                            }
                            value={value}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (isSecret) {
                                setSecretDrafts((prev) => ({
                                  ...prev,
                                  [p.code]: {
                                    ...(prev[p.code] || {}),
                                    [field.key]: v,
                                  },
                                }));
                              } else {
                                setProviders((prev) =>
                                  prev.map((x) =>
                                    x.code === p.code
                                      ? {
                                          ...x,
                                          public_config: {
                                            ...x.public_config,
                                            [field.key]: v,
                                          },
                                        }
                                      : x
                                  )
                                );
                              }
                            }}
                          />
                        </label>
                      );
                    })}

                    <div>
                      <p className="text-xs font-medium text-muted">
                        {ui.availableServices}
                      </p>
                      {p.available_services.length === 0 ? (
                        <p className="mt-1 text-xs text-muted">{ui.noServices}</p>
                      ) : (
                        <ul className="mt-2 space-y-1">
                          {p.available_services.map((svc) => {
                            const checked = p.enabled_services.includes(svc.code);
                            return (
                              <label
                                key={svc.code}
                                className="flex items-center gap-2"
                              >
                                <input
                                  type="checkbox"
                                  className="accent-gold"
                                  disabled={!canManage}
                                  checked={checked}
                                  onChange={(e) =>
                                    setProviders((prev) =>
                                      prev.map((x) =>
                                        x.code === p.code
                                          ? {
                                              ...x,
                                              enabled_services: e.target.checked
                                                ? [...x.enabled_services, svc.code]
                                                : x.enabled_services.filter(
                                                    (c) => c !== svc.code
                                                  ),
                                            }
                                          : x
                                      )
                                    )
                                  }
                                />
                                <span>{svc.name || svc.code}</span>
                              </label>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    {canManage ? (
                      <Button
                        size="sm"
                        loading={saving === p.code}
                        onClick={() => void saveProvider(p.code)}
                      >
                        {ui.save}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      <section className="rounded-2xl border border-beige-dark bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-charcoal">{ui.ratesTitle}</h2>
        <p className="mt-1 text-sm text-muted">{ui.ratesHint}</p>
        {rates.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{ui.ratesEmpty}</p>
        ) : (
          <ul className="mt-3 divide-y divide-beige-dark text-sm">
            {rates.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  {r.provider_code} · {r.service_name || r.service_code}
                </span>
                <span dir="ltr">
                  {r.price}
                  {r.free_shipping_threshold != null
                    ? ` / free ≥ ${r.free_shipping_threshold}`
                    : ""}
                  {r.is_active ? "" : ` · ${ui.disabled}`}
                </span>
              </li>
            ))}
          </ul>
        )}
        {canManage ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-muted">
              {ui.ratesService}
              <select
                className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2 text-sm text-charcoal"
                value={rateDraft.provider_code}
                onChange={(e) => {
                  const code = e.target.value;
                  const p = providers.find((x) => x.code === code);
                  const first = p?.available_services[0]?.code ?? "";
                  setRateDraft((d) => ({
                    ...d,
                    provider_code: code,
                    service_code: first,
                    service_name:
                      p?.available_services.find((s) => s.code === first)?.name ??
                      "",
                  }));
                }}
              >
                <option value="">{ui.noActiveProvider}</option>
                {providers.map((p) => (
                  <option key={p.code} value={p.code}>
                    {providerName(p, loc)}
                  </option>
                ))}
              </select>
            </label>
            {(() => {
              const p = providers.find((x) => x.code === rateDraft.provider_code);
              const services = p?.available_services ?? [];
              if (services.length > 0) {
                return (
                  <label className="block text-xs text-muted">
                    {ui.ratesService}
                    <select
                      className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2 text-sm text-charcoal"
                      value={rateDraft.service_code}
                      onChange={(e) => {
                        const svc = services.find((s) => s.code === e.target.value);
                        setRateDraft((d) => ({
                          ...d,
                          service_code: e.target.value,
                          service_name: svc?.name ?? "",
                        }));
                      }}
                    >
                      {services.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.name || s.code}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }
              return (
                <Input
                  label={ui.ratesService}
                  value={rateDraft.service_code}
                  onChange={(e) =>
                    setRateDraft((d) => ({ ...d, service_code: e.target.value }))
                  }
                />
              );
            })()}
            <Input
              label={ui.ratesPrice}
              type="number"
              min={0}
              dir="ltr"
              value={rateDraft.price}
              onChange={(e) =>
                setRateDraft((d) => ({ ...d, price: e.target.value }))
              }
            />
            <Input
              label={ui.ratesFreeThreshold}
              type="number"
              min={0}
              dir="ltr"
              value={rateDraft.free_shipping_threshold}
              onChange={(e) =>
                setRateDraft((d) => ({
                  ...d,
                  free_shipping_threshold: e.target.value,
                }))
              }
            />
            <div className="sm:col-span-2">
              <Button
                size="sm"
                loading={saving === "rate"}
                onClick={() => void saveRate()}
              >
                {ui.ratesAdd}
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <ConfirmDialog
        open={Boolean(deleteCode)}
        title={ui.deleteConfirmTitle}
        description={formatMessage(ui.deleteConfirmDesc, {
          name: deleteCode
            ? providerName(
                providers.find((p) => p.code === deleteCode) ?? {
                  code: deleteCode,
                  label: { ar: deleteCode, he: deleteCode, en: deleteCode },
                } as ShippingProviderPublic,
                loc
              )
            : "",
        })}
        confirmLabel={ui.deleteProvider}
        danger
        loading={Boolean(deleteCode) && saving === deleteCode}
        onCancel={() => setDeleteCode(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
