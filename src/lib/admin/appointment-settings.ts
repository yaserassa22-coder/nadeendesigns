/**
 * Appointment settings — stored under settings.key = 'appointments' (merge-safe).
 */

export type BreakWindow = {
  enabled: boolean;
  start: string;
  end: string;
};

export type AppointmentSettings = {
  opening_time: string;
  closing_time: string;
  /** JS getDay(): 0=Sun … 6=Sat. Default Sun–Thu + Sat (Fri off). */
  working_days: number[];
  lunch_break: BreakWindow;
  prayer_break: BreakWindow;
  default_buffer_before: number;
  default_buffer_after: number;
  slot_interval_minutes: number;
  duration_presets: {
    consultation: number;
    premium: number;
    fitting: number;
  };
  reminders: {
    enabled: boolean;
    offsets: string[];
  };
  default_consultant_id: string | null;
};

export const DEFAULT_APPOINTMENT_SETTINGS: AppointmentSettings = {
  opening_time: "10:00",
  closing_time: "20:00",
  working_days: [0, 1, 2, 3, 4, 6],
  lunch_break: { enabled: true, start: "13:00", end: "14:00" },
  prayer_break: { enabled: false, start: "12:00", end: "12:30" },
  default_buffer_before: 0,
  default_buffer_after: 15,
  slot_interval_minutes: 30,
  duration_presets: {
    consultation: 60,
    premium: 90,
    fitting: 45,
  },
  reminders: {
    enabled: true,
    offsets: ["7d", "3d", "1d", "2h"],
  },
  default_consultant_id: null,
};

function asBreak(raw: unknown, fallback: BreakWindow): BreakWindow {
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  return {
    enabled: typeof o.enabled === "boolean" ? o.enabled : fallback.enabled,
    start: typeof o.start === "string" ? o.start : fallback.start,
    end: typeof o.end === "string" ? o.end : fallback.end,
  };
}

export function normalizeAppointmentSettings(
  raw?: Partial<AppointmentSettings> | null
): AppointmentSettings {
  const s = (raw ?? {}) as Partial<AppointmentSettings> & Record<string, unknown>;
  const presets = (s.duration_presets ?? {}) as Partial<
    AppointmentSettings["duration_presets"]
  >;
  const reminders = (s.reminders ?? {}) as Partial<
    AppointmentSettings["reminders"]
  >;

  return {
    opening_time:
      typeof s.opening_time === "string"
        ? s.opening_time
        : DEFAULT_APPOINTMENT_SETTINGS.opening_time,
    closing_time:
      typeof s.closing_time === "string"
        ? s.closing_time
        : DEFAULT_APPOINTMENT_SETTINGS.closing_time,
    working_days: Array.isArray(s.working_days)
      ? s.working_days.filter((n): n is number => typeof n === "number")
      : DEFAULT_APPOINTMENT_SETTINGS.working_days,
    lunch_break: asBreak(s.lunch_break, DEFAULT_APPOINTMENT_SETTINGS.lunch_break),
    prayer_break: asBreak(
      s.prayer_break,
      DEFAULT_APPOINTMENT_SETTINGS.prayer_break
    ),
    default_buffer_before:
      typeof s.default_buffer_before === "number"
        ? s.default_buffer_before
        : DEFAULT_APPOINTMENT_SETTINGS.default_buffer_before,
    default_buffer_after:
      typeof s.default_buffer_after === "number"
        ? s.default_buffer_after
        : DEFAULT_APPOINTMENT_SETTINGS.default_buffer_after,
    slot_interval_minutes:
      typeof s.slot_interval_minutes === "number" && s.slot_interval_minutes > 0
        ? s.slot_interval_minutes
        : DEFAULT_APPOINTMENT_SETTINGS.slot_interval_minutes,
    duration_presets: {
      consultation:
        typeof presets.consultation === "number"
          ? presets.consultation
          : DEFAULT_APPOINTMENT_SETTINGS.duration_presets.consultation,
      premium:
        typeof presets.premium === "number"
          ? presets.premium
          : DEFAULT_APPOINTMENT_SETTINGS.duration_presets.premium,
      fitting:
        typeof presets.fitting === "number"
          ? presets.fitting
          : DEFAULT_APPOINTMENT_SETTINGS.duration_presets.fitting,
    },
    reminders: {
      enabled:
        typeof reminders.enabled === "boolean"
          ? reminders.enabled
          : DEFAULT_APPOINTMENT_SETTINGS.reminders.enabled,
      offsets: Array.isArray(reminders.offsets)
        ? reminders.offsets.filter((x): x is string => typeof x === "string")
        : DEFAULT_APPOINTMENT_SETTINGS.reminders.offsets,
    },
    default_consultant_id:
      typeof s.default_consultant_id === "string"
        ? s.default_consultant_id
        : s.default_consultant_id === null
          ? null
          : DEFAULT_APPOINTMENT_SETTINGS.default_consultant_id,
  };
}

export function mergeAppointmentSettings(
  current: AppointmentSettings,
  patch: Partial<AppointmentSettings>
): AppointmentSettings {
  return normalizeAppointmentSettings({
    ...current,
    ...patch,
    lunch_break: patch.lunch_break
      ? { ...current.lunch_break, ...patch.lunch_break }
      : current.lunch_break,
    prayer_break: patch.prayer_break
      ? { ...current.prayer_break, ...patch.prayer_break }
      : current.prayer_break,
    duration_presets: patch.duration_presets
      ? { ...current.duration_presets, ...patch.duration_presets }
      : current.duration_presets,
    reminders: patch.reminders
      ? { ...current.reminders, ...patch.reminders }
      : current.reminders,
  });
}

/** Parse "HH:MM" or "HH:MM:SS" → minutes from midnight */
export function timeToMinutes(time: string): number {
  const parts = time.trim().split(":");
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  return h * 60 + m;
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
