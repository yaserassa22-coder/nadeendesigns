"use client";

/**
 * Admin — Payments & Invoicing settings (plugin architecture).
 */

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Save,
  Wifi,
} from "lucide-react";

type CredentialField = {
  key: string;
  label: string;
  label_he?: string;
  kind: "secret" | "public";
  required?: boolean;
  help?: string;
  inputType?: string;
};

type PaymentProviderRow = {
  id: string;
  label: { ar: string; he: string; en: string };
  enabled: boolean;
  sort_order: number;
  implementation_ready: boolean;
  coming_soon: boolean;
  connection_status: string;
  last_tested_at?: string | null;
  last_error?: string | null;
  public_config: Record<string, string>;
  credential_fields: CredentialField[];
  secrets_masked: Record<string, string>;
  configured: boolean;
  webhook_url: string | null;
  supports_test: boolean;
};

type InvoiceProviderRow = {
  id: string;
  label: { ar: string; he: string; en: string };
  active: boolean;
  implementation_ready: boolean;
  connection_status: string;
  credential_fields: CredentialField[];
  secrets_masked: Record<string, string>;
  public_config: Record<string, string>;
  configured: boolean;
  supports_test: boolean;
  supports_test_document: boolean;
};

type LogRow = {
  id: string;
  category: string;
  level: string;
  provider_id: string | null;
  order_id: string | null;
  message: string;
  created_at: string;
};

export function PaymentsInvoicingPanel() {
  const [tab, setTab] = useState<"payments" | "invoicing" | "logs">("payments");
  const [mode, setMode] = useState<"test" | "live">("test");
  const [payments, setPayments] = useState<PaymentProviderRow[]>([]);
  const [invoiceMeta, setInvoiceMeta] = useState({
    active_provider_id: "internal",
    auto_issue_on_payment: true,
    auto_email_on_issue: true,
    retry_max_attempts: 5,
    retry_backoff_seconds: 120,
    company_name: "",
    company_name_he: "",
    vat_number: "",
    logo_url: "",
    email_subject: "",
    email_body_html: "",
  });
  const [invoiceProviders, setInvoiceProviders] = useState<
    InvoiceProviderRow[]
  >([]);
  const [secretDrafts, setSecretDrafts] = useState<
    Record<string, Record<string, string>>
  >({});
  const [invoiceSecretDrafts, setInvoiceSecretDrafts] = useState<
    Record<string, Record<string, string>>
  >({});
  const [expanded, setExpanded] = useState<string | null>("cod");
  const [expandedInv, setExpandedInv] = useState<string | null>("internal");
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [payRes, invRes] = await Promise.all([
        fetch("/api/admin/commerce/payments"),
        fetch("/api/admin/commerce/invoicing"),
      ]);
      const pay = await payRes.json();
      const inv = await invRes.json();
      if (!payRes.ok) throw new Error(pay.error || "Failed to load payments");
      if (!invRes.ok) throw new Error(inv.error || "Failed to load invoicing");
      setMode(pay.mode === "live" ? "live" : "test");
      setPayments(pay.providers || []);
      setInvoiceMeta({
        ...invoiceMeta,
        ...inv.invoicing,
      });
      setInvoiceProviders(inv.providers || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial meta merge once
  }, []);

  const loadLogs = useCallback(async () => {
    const res = await fetch("/api/admin/commerce/logs?limit=80");
    const data = await res.json();
    if (res.ok) setLogs(data.logs || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab === "logs") void loadLogs();
  }, [tab, loadLogs]);

  function moveProvider(id: string, dir: -1 | 1) {
    setPayments((prev) => {
      const sorted = [...prev].sort((a, b) => a.sort_order - b.sort_order);
      const idx = sorted.findIndex((p) => p.id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= sorted.length) return prev;
      const a = sorted[idx];
      const b = sorted[j];
      const tmp = a.sort_order;
      a.sort_order = b.sort_order;
      b.sort_order = tmp;
      return [...sorted].sort((x, y) => x.sort_order - y.sort_order);
    });
  }

  async function savePayments() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/commerce/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          providers: payments.map((p) => ({
            id: p.id,
            enabled: p.enabled,
            sort_order: p.sort_order,
            public_config: p.public_config,
            secrets: secretDrafts[p.id] || {},
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMessage("Payment settings saved");
      setSecretDrafts({});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveInvoicing() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const active = invoiceProviders.find((p) => p.active)?.id || "internal";
      const editing = invoiceProviders.find((p) => p.id === expandedInv);
      const res = await fetch("/api/admin/commerce/invoicing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...invoiceMeta,
          active_provider_id: active,
          provider: editing
            ? {
                id: editing.id,
                public_config: editing.public_config,
                secrets: invoiceSecretDrafts[editing.id] || {},
              }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMessage("Invoicing settings saved");
      setInvoiceSecretDrafts({});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function testPayment(id: string) {
    setMessage("");
    const res = await fetch(`/api/admin/commerce/payments/${id}/test`, {
      method: "POST",
    });
    const data = await res.json();
    setMessage(data.message || (data.ok ? "OK" : "Failed"));
    await load();
  }

  async function testInvoice(id: string, action: "connection" | "document") {
    setMessage("");
    const res = await fetch("/api/admin/commerce/invoicing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_id: id, action }),
    });
    const data = await res.json();
    setMessage(
      data.message ||
        (data.ok
          ? action === "document"
            ? `Test document ${data.documentNumber || "ok"}`
            : "OK"
          : data.error || "Failed")
    );
    await load();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-beige-dark pb-3">
        {(
          [
            ["payments", "Payment providers"],
            ["invoicing", "Invoicing"],
            ["logs", "Logs"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              tab === id
                ? "bg-gold text-white"
                : "border border-beige-dark bg-white text-charcoal"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {message ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {tab === "payments" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted">Mode</span>
              <select
                value={mode}
                onChange={(e) =>
                  setMode(e.target.value === "live" ? "live" : "test")
                }
                className="rounded-lg border border-beige-dark bg-white px-3 py-1.5"
              >
                <option value="test">Test</option>
                <option value="live">Live</option>
              </select>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void savePayments()}
              className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save payments
            </button>
          </div>

          <ul className="space-y-3">
            {payments.map((p) => {
              const open = expanded === p.id;
              return (
                <li
                  key={p.id}
                  className="rounded-2xl border border-beige-dark bg-white"
                >
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        aria-label="Move up"
                        onClick={() => moveProvider(p.id, -1)}
                        className="text-muted hover:text-charcoal"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        onClick={() => moveProvider(p.id, 1)}
                        className="text-muted hover:text-charcoal"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        onChange={(e) =>
                          setPayments((prev) =>
                            prev.map((x) =>
                              x.id === p.id
                                ? { ...x, enabled: e.target.checked }
                                : x
                            )
                          )
                        }
                        className="accent-gold"
                      />
                      Enable
                    </label>
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-start"
                      onClick={() => setExpanded(open ? null : p.id)}
                    >
                      <p className="font-medium text-charcoal">
                        {p.label.he || p.label.en}
                        <span className="ms-2 text-xs text-muted">
                          ({p.id})
                        </span>
                      </p>
                      <p className="text-xs text-muted">
                        Status: {p.connection_status}
                        {p.coming_soon ? " · adapter pending" : ""}
                      </p>
                    </button>
                    {p.supports_test ? (
                      <button
                        type="button"
                        onClick={() => void testPayment(p.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-beige-dark px-3 py-1.5 text-xs"
                      >
                        <Wifi className="h-3.5 w-3.5" /> Test
                      </button>
                    ) : null}
                  </div>
                  {open ? (
                    <div className="space-y-3 border-t border-beige-dark px-4 py-4 text-sm">
                      {p.webhook_url ? (
                        <div>
                          <p className="text-xs font-medium text-muted">
                            Webhook URL
                          </p>
                          <code className="mt-1 block break-all rounded-lg bg-beige/50 px-3 py-2 text-xs">
                            {p.webhook_url}
                          </code>
                        </div>
                      ) : null}
                      {p.credential_fields.map((field) => {
                        const isSecret = field.kind === "secret";
                        const value = isSecret
                          ? secretDrafts[p.id]?.[field.key] ?? ""
                          : p.public_config[field.key] ?? "";
                        const placeholder = isSecret
                          ? p.secrets_masked[field.key] || "••••"
                          : "";
                        return (
                          <label key={field.key} className="block">
                            <span className="text-xs text-muted">
                              {field.label_he || field.label}
                              {field.required ? " *" : ""}
                            </span>
                            <input
                              type={
                                isSecret
                                  ? "password"
                                  : field.inputType || "text"
                              }
                              className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2"
                              placeholder={placeholder}
                              value={value}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (isSecret) {
                                  setSecretDrafts((prev) => ({
                                    ...prev,
                                    [p.id]: {
                                      ...(prev[p.id] || {}),
                                      [field.key]: v,
                                    },
                                  }));
                                } else {
                                  setPayments((prev) =>
                                    prev.map((x) =>
                                      x.id === p.id
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
                            {field.help ? (
                              <span className="mt-1 block text-[11px] text-muted">
                                {field.help}
                              </span>
                            ) : null}
                          </label>
                        );
                      })}
                      {p.last_error ? (
                        <p className="text-xs text-red-600">{p.last_error}</p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {tab === "invoicing" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveInvoicing()}
              className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save invoicing
            </button>
          </div>

          <div className="grid gap-3 rounded-2xl border border-beige-dark bg-white p-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-gold"
                checked={invoiceMeta.auto_issue_on_payment}
                onChange={(e) =>
                  setInvoiceMeta((m) => ({
                    ...m,
                    auto_issue_on_payment: e.target.checked,
                  }))
                }
              />
              Auto-issue after payment
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-gold"
                checked={invoiceMeta.auto_email_on_issue}
                onChange={(e) =>
                  setInvoiceMeta((m) => ({
                    ...m,
                    auto_email_on_issue: e.target.checked,
                  }))
                }
              />
              Email invoice to customer
            </label>
            <label className="block text-sm">
              <span className="text-xs text-muted">Company name (HE)</span>
              <input
                className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2"
                value={invoiceMeta.company_name_he}
                onChange={(e) =>
                  setInvoiceMeta((m) => ({
                    ...m,
                    company_name_he: e.target.value,
                  }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-muted">VAT / Business ID</span>
              <input
                className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2"
                value={invoiceMeta.vat_number}
                onChange={(e) =>
                  setInvoiceMeta((m) => ({
                    ...m,
                    vat_number: e.target.value,
                  }))
                }
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-xs text-muted">Logo URL</span>
              <input
                className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2"
                value={invoiceMeta.logo_url}
                onChange={(e) =>
                  setInvoiceMeta((m) => ({ ...m, logo_url: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-xs text-muted">Email subject</span>
              <input
                className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2"
                value={invoiceMeta.email_subject}
                onChange={(e) =>
                  setInvoiceMeta((m) => ({
                    ...m,
                    email_subject: e.target.value,
                  }))
                }
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-xs text-muted">
                Email body HTML (placeholders: {"{{customer_name}}"},{" "}
                {"{{order_number}}"}, {"{{store_name}}"}, {"{{document_number}}"})
              </span>
              <textarea
                rows={5}
                className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2 font-mono text-xs"
                value={invoiceMeta.email_body_html}
                onChange={(e) =>
                  setInvoiceMeta((m) => ({
                    ...m,
                    email_body_html: e.target.value,
                  }))
                }
              />
            </label>
          </div>

          <p className="text-sm font-medium text-charcoal">
            Active invoice provider
          </p>
          <ul className="space-y-3">
            {invoiceProviders.map((p) => {
              const open = expandedInv === p.id;
              return (
                <li
                  key={p.id}
                  className="rounded-2xl border border-beige-dark bg-white"
                >
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="active_invoice"
                        checked={p.active}
                        onChange={() =>
                          setInvoiceProviders((prev) =>
                            prev.map((x) => ({
                              ...x,
                              active: x.id === p.id,
                            }))
                          )
                        }
                        className="accent-gold"
                      />
                      Active
                    </label>
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-start"
                      onClick={() => setExpandedInv(open ? null : p.id)}
                    >
                      <p className="font-medium">
                        {p.label.he || p.label.en}
                        {p.active ? (
                          <CheckCircle2 className="ms-2 inline h-4 w-4 text-emerald-600" />
                        ) : null}
                      </p>
                      <p className="text-xs text-muted">
                        {p.connection_status}
                        {!p.implementation_ready
                          ? " · API adapter pending"
                          : ""}
                      </p>
                    </button>
                    {p.supports_test ? (
                      <button
                        type="button"
                        onClick={() => void testInvoice(p.id, "connection")}
                        className="rounded-full border border-beige-dark px-3 py-1.5 text-xs"
                      >
                        Test connection
                      </button>
                    ) : null}
                    {p.supports_test_document ? (
                      <button
                        type="button"
                        onClick={() => void testInvoice(p.id, "document")}
                        className="rounded-full border border-beige-dark px-3 py-1.5 text-xs"
                      >
                        Test invoice
                      </button>
                    ) : null}
                  </div>
                  {open ? (
                    <div className="space-y-3 border-t border-beige-dark px-4 py-4 text-sm">
                      {p.credential_fields.length === 0 ? (
                        <p className="text-muted">
                          No external credentials required.
                        </p>
                      ) : (
                        p.credential_fields.map((field) => {
                          const isSecret = field.kind === "secret";
                          const value = isSecret
                            ? invoiceSecretDrafts[p.id]?.[field.key] ?? ""
                            : p.public_config[field.key] ?? "";
                          return (
                            <label key={field.key} className="block">
                              <span className="text-xs text-muted">
                                {field.label}
                              </span>
                              <input
                                type={isSecret ? "password" : "text"}
                                className="mt-1 w-full rounded-lg border border-beige-dark px-3 py-2"
                                placeholder={
                                  isSecret
                                    ? p.secrets_masked[field.key] || "••••"
                                    : ""
                                }
                                value={value}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (isSecret) {
                                    setInvoiceSecretDrafts((prev) => ({
                                      ...prev,
                                      [p.id]: {
                                        ...(prev[p.id] || {}),
                                        [field.key]: v,
                                      },
                                    }));
                                  } else {
                                    setInvoiceProviders((prev) =>
                                      prev.map((x) =>
                                        x.id === p.id
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
                        })
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {tab === "logs" ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadLogs()}
              className="inline-flex items-center gap-1 rounded-full border border-beige-dark px-3 py-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <button
              type="button"
              onClick={async () => {
                const res = await fetch("/api/admin/commerce/logs", {
                  method: "POST",
                });
                const data = await res.json();
                setMessage(`Retried invoice jobs: ${data.processed ?? 0}`);
                await loadLogs();
              }}
              className="rounded-full border border-beige-dark px-3 py-1.5 text-xs"
            >
              Run invoice retries
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-beige-dark">
            <table className="w-full text-start text-sm">
              <thead className="bg-beige/40 text-xs text-muted">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-beige-dark/60">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-xs">{l.category}</td>
                    <td className="px-3 py-2 text-xs">
                      {l.provider_id || "—"}
                    </td>
                    <td className="px-3 py-2">{l.message}</td>
                  </tr>
                ))}
                {!logs.length ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-muted"
                    >
                      No commerce logs yet
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
