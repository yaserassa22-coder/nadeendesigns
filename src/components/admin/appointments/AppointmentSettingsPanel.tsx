"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import {
  DEFAULT_APPOINTMENT_SETTINGS,
  type AppointmentSettings,
  type BreakWindow,
} from "@/lib/admin/appointment-settings";

type Consultant = { id: string; name_ar: string; active?: boolean };

const DAY_KEYS = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const;

function BreakEditor({
  label,
  value,
  onChange,
  enabledLabel,
  startLabel,
  endLabel,
}: {
  label: string;
  value: BreakWindow;
  onChange: (next: BreakWindow) => void;
  enabledLabel: string;
  startLabel: string;
  endLabel: string;
}) {
  return (
    <section className="rounded-2xl border border-beige-dark bg-white p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-charcoal">{label}</h2>
        <label className="flex items-center gap-2 text-sm text-charcoal">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) =>
              onChange({ ...value, enabled: e.target.checked })
            }
            className="size-4 rounded border-beige-dark text-gold focus:ring-gold/30"
          />
          {enabledLabel}
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          type="time"
          label={startLabel}
          value={value.start}
          disabled={!value.enabled}
          onChange={(e) => onChange({ ...value, start: e.target.value })}
        />
        <Input
          type="time"
          label={endLabel}
          value={value.end}
          disabled={!value.enabled}
          onChange={(e) => onChange({ ...value, end: e.target.value })}
        />
      </div>
    </section>
  );
}

export function AppointmentSettingsPanel() {
  const { t } = useLocale();
  const ui = t.admin.appointmentSettingsUi;
  const [settings, setSettings] = useState<AppointmentSettings>(
    DEFAULT_APPOINTMENT_SETTINGS
  );
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [settingsRes, consultantsRes] = await Promise.all([
          fetch("/api/admin/appointments/settings", { cache: "no-store" }),
          fetch("/api/admin/appointments/consultants", { cache: "no-store" }),
        ]);
        const settingsData = (await settingsRes.json()) as {
          settings?: AppointmentSettings;
          error?: string;
        };
        if (!settingsRes.ok) {
          throw new Error(settingsData.error || ui.loadFailed);
        }
        const consultantsData = (await consultantsRes.json()) as {
          consultants?: Consultant[];
        };
        if (!cancelled) {
          if (settingsData.settings) setSettings(settingsData.settings);
          setConsultants(consultantsData.consultants ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : ui.loadFailed);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ui.loadFailed]);

  const patch = <K extends keyof AppointmentSettings>(
    key: K,
    value: AppointmentSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleDay = (day: number) => {
    setSettings((prev) => {
      const has = prev.working_days.includes(day);
      const working_days = has
        ? prev.working_days.filter((d) => d !== day)
        : [...prev.working_days, day].sort((a, b) => a - b);
      return { ...prev, working_days };
    });
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/appointments/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = (await res.json()) as {
        settings?: AppointmentSettings;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || ui.saveFailed);
      if (data.settings) setSettings(data.settings);
      setMessage(ui.saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : ui.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-muted">{ui.loading}</p>;
  }

  return (
    <div className="space-y-6">
      {(error || message) && (
        <p
          className={
            error
              ? "rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600"
              : "rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          }
        >
          {error || message}
        </p>
      )}

      <section className="rounded-2xl border border-beige-dark bg-white p-5 space-y-4">
        <h2 className="font-semibold text-charcoal">{ui.hoursTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            type="time"
            label={ui.openingTime}
            value={settings.opening_time}
            onChange={(e) => patch("opening_time", e.target.value)}
          />
          <Input
            type="time"
            label={ui.closingTime}
            value={settings.closing_time}
            onChange={(e) => patch("closing_time", e.target.value)}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-charcoal">
            {ui.workingDays}
          </p>
          <div className="flex flex-wrap gap-2">
            {DAY_KEYS.map((key, day) => {
              const active = settings.working_days.includes(day);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={
                    active
                      ? "rounded-xl border border-gold bg-gold/10 px-3 py-2 text-sm font-medium text-charcoal"
                      : "rounded-xl border border-beige-dark bg-beige/30 px-3 py-2 text-sm text-muted"
                  }
                >
                  {ui.days[key]}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <BreakEditor
        label={ui.lunchBreak}
        value={settings.lunch_break}
        onChange={(lunch_break) => patch("lunch_break", lunch_break)}
        enabledLabel={ui.enabled}
        startLabel={ui.breakStart}
        endLabel={ui.breakEnd}
      />

      <BreakEditor
        label={ui.prayerBreak}
        value={settings.prayer_break}
        onChange={(prayer_break) => patch("prayer_break", prayer_break)}
        enabledLabel={ui.enabled}
        startLabel={ui.breakStart}
        endLabel={ui.breakEnd}
      />

      <section className="rounded-2xl border border-beige-dark bg-white p-5 space-y-4">
        <h2 className="font-semibold text-charcoal">{ui.slotsTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            type="number"
            min={5}
            step={5}
            label={ui.slotInterval}
            value={settings.slot_interval_minutes}
            onChange={(e) =>
              patch("slot_interval_minutes", Number(e.target.value) || 30)
            }
          />
          <Input
            type="number"
            min={0}
            step={5}
            label={ui.bufferBefore}
            value={settings.default_buffer_before}
            onChange={(e) =>
              patch("default_buffer_before", Number(e.target.value) || 0)
            }
          />
          <Input
            type="number"
            min={0}
            step={5}
            label={ui.bufferAfter}
            value={settings.default_buffer_after}
            onChange={(e) =>
              patch("default_buffer_after", Number(e.target.value) || 0)
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            type="number"
            min={15}
            step={5}
            label={ui.durationConsultation}
            value={settings.duration_presets.consultation}
            onChange={(e) =>
              patch("duration_presets", {
                ...settings.duration_presets,
                consultation: Number(e.target.value) || 60,
              })
            }
          />
          <Input
            type="number"
            min={15}
            step={5}
            label={ui.durationPremium}
            value={settings.duration_presets.premium}
            onChange={(e) =>
              patch("duration_presets", {
                ...settings.duration_presets,
                premium: Number(e.target.value) || 90,
              })
            }
          />
          <Input
            type="number"
            min={15}
            step={5}
            label={ui.durationFitting}
            value={settings.duration_presets.fitting}
            onChange={(e) =>
              patch("duration_presets", {
                ...settings.duration_presets,
                fitting: Number(e.target.value) || 45,
              })
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-beige-dark bg-white p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-charcoal">{ui.remindersTitle}</h2>
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input
              type="checkbox"
              checked={settings.reminders.enabled}
              onChange={(e) =>
                patch("reminders", {
                  ...settings.reminders,
                  enabled: e.target.checked,
                })
              }
              className="size-4 rounded border-beige-dark text-gold focus:ring-gold/30"
            />
            {ui.enabled}
          </label>
        </div>
        <Input
          label={ui.reminderOffsets}
          value={settings.reminders.offsets.join(", ")}
          disabled={!settings.reminders.enabled}
          placeholder="7d, 3d, 1d, 2h"
          onChange={(e) =>
            patch("reminders", {
              ...settings.reminders,
              offsets: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
        <Select
          label={ui.defaultConsultant}
          value={settings.default_consultant_id ?? ""}
          options={[
            { value: "", label: ui.noDefaultConsultant },
            ...consultants.map((c) => ({
              value: c.id,
              label: c.name_ar,
            })),
          ]}
          onChange={(e) =>
            patch(
              "default_consultant_id",
              e.target.value ? e.target.value : null
            )
          }
        />
      </section>

      <div className="flex justify-end">
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? ui.saving : t.admin.saveChanges}
        </Button>
      </div>
    </div>
  );
}
