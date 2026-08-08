"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type Addr = {
  id: string;
  label: string;
  full_name: string;
  phone?: string | null;
  city?: string | null;
  region?: string | null;
  street?: string | null;
  is_default?: boolean;
};

export default function AccountAddressesPage() {
  const { t, locale } = useLocale();
  const [addresses, setAddresses] = useState<Addr[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    label: t.account.addressDefault,
    full_name: "",
    phone: "",
    city: "",
    region: "",
    street: "",
    is_default: true,
  });

  async function load() {
    const d = await fetch("/api/account/addresses").then((r) => r.json());
    setAddresses(d.addresses ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function add() {
    await fetch("/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm((f) => ({ ...f, street: "", city: "" }));
    void load();
  }

  async function remove(id: string) {
    await fetch(`/api/account/addresses?id=${id}`, { method: "DELETE" });
    void load();
  }

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-beige" />;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {addresses.map((a) => (
          <div
            key={a.id}
            className="flex justify-between gap-3 rounded-2xl border border-beige-dark bg-white px-5 py-4"
          >
            <div>
              <p className="font-medium">
                {a.label}
                {a.is_default ? ` · ${t.account.addressDefault}` : ""}
              </p>
              <p className="text-sm text-muted">
                {a.full_name} · {[a.street, a.city, a.region].filter(Boolean).join("، ")}
              </p>
            </div>
            <button
              type="button"
              className="text-xs text-red-700/80"
              onClick={() => void remove(a.id)}
            >{t.common.delete}</button>
          </div>
        ))}
        {!addresses.length && (
          <p className="text-sm text-muted">{t.account.noAddresses}</p>
        )}
      </div>

      <div className="grid gap-3 rounded-2xl border border-beige-dark bg-white p-5 sm:grid-cols-2">
        <h3 className="sm:col-span-2 font-medium">{t.account.newAddress}</h3>
        {(
          [
            ["label", t.account.addressLabel],
            ["full_name", t.account.fullName],
            ["phone", t.account.phone],
            ["city", t.account.city],
            ["region", t.account.region],
            ["street", t.account.street],
          ] as const
        ).map(([k, label]) => (
          <input
            key={k}
            placeholder={label}
            className="rounded-xl border border-beige-dark px-3 py-2.5 text-sm"
            value={form[k]}
            onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
          />
        ))}
        <Button
          className="sm:col-span-2"
          style={{ backgroundColor: "#C9A14A" }}
          onClick={() => void add()}
        >
          {t.account.addAddress}
        </Button>
      </div>
    </div>
  );
}
