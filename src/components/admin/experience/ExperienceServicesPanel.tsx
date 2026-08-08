"use client";

import { useCallback, useEffect, useState } from "react";
import { GlobalServicesManager } from "@/components/admin/GlobalServicesManager";
import { Button } from "@/components/ui/Button";
import type { StoreExtraService, StoreSettings } from "@/types/store";
import { useLocale } from "@/components/i18n/LocaleProvider";

/**
 * Reuses GlobalServicesManager — dual-writes via store-settings API
 * (same path as Store Settings → Extra Services).
 */
export function ExperienceServicesPanel() {
  const { t } = useLocale();
  const eu = t.admin.experienceUi;
  const [services, setServices] = useState<StoreExtraService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/store-settings", { cache: "no-store" });
      const data = (await res.json()) as {
        settings?: StoreSettings;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "fail");
      setServices(data.settings?.extra_services?.services ?? []);
    } catch {
      setError(eu.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [eu.loadFailed]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const save = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/store-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: { extra_services: { services } },
          sections: ["extra_services"],
        }),
      });
      const data = (await res.json()) as {
        settings?: StoreSettings;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || eu.saveFailed);
      setServices(data.settings?.extra_services?.services ?? services);
      setMessage(eu.saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : eu.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted">{eu.loading}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{eu.servicesHint}</p>
        <Button
          type="button"
          size="sm"
          onClick={() => void save()}
          disabled={saving}
        >
          {eu.saveServices}
        </Button>
      </div>
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}
      <GlobalServicesManager services={services} onChange={setServices} />
    </div>
  );
}
