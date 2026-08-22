import { DEFAULT_STORE_SETTINGS } from "@/types/store";

/** Boutique calendar — matches Store Settings default timezone. */
export const STORE_TIMEZONE = DEFAULT_STORE_SETTINGS.general.timezone;

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function isYmd(value: string): boolean {
  return YMD.test(value);
}

/** Today's calendar date (YYYY-MM-DD) in the boutique timezone. */
export function storeTodayYmd(
  instant: Date = new Date(),
  timeZone: string = STORE_TIMEZONE
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    numberingSystem: "latn",
  }).formatToParts(instant);
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

/** Minutes from midnight in the boutique timezone (0–1439). */
export function storeMinutesOfDay(
  instant: Date = new Date(),
  timeZone: string = STORE_TIMEZONE
): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    numberingSystem: "latn",
  }).formatToParts(instant);
  const hourRaw = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const hour = hourRaw === 24 ? 0 : hourRaw;
  return hour * 60 + minute;
}

export function isStoreCalendarDateInPast(
  ymd: string,
  instant: Date = new Date(),
  timeZone: string = STORE_TIMEZONE
): boolean {
  if (!isYmd(ymd)) return false;
  return ymd < storeTodayYmd(instant, timeZone);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.slice(0, 5).split(":").map((n) => Number(n));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

/** True when the appointment start is already over (or is this minute). */
export function isStoreAppointmentInPast(
  date: string,
  time: string,
  instant: Date = new Date(),
  timeZone: string = STORE_TIMEZONE
): boolean {
  if (!isYmd(date)) return false;
  const today = storeTodayYmd(instant, timeZone);
  if (date < today) return true;
  if (date > today) return false;
  return timeToMinutes(time) <= storeMinutesOfDay(instant, timeZone);
}
