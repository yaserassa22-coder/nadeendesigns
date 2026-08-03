export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatPrice(price: number) {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(price);
  return `₪ ${formatted}`;
}

/** Parse date inputs without UTC day-shift for YYYY-MM-DD strings. */
function parseDateInput(date: string | Date): Date {
  if (date instanceof Date) return date;
  const trimmed = date.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    return new Date(year, month - 1, day);
  }
  return new Date(trimmed);
}

export type FormatDateWesternOptions = {
  /** Include hours:minutes (24h, Latin digits). Default false. */
  withTime?: boolean;
};

/**
 * Display dates with Western (Latin) numerals as YYYY/MM/DD.
 * Use for all user-facing dates — Arabic UI labels stay elsewhere; digits stay latn.
 */
export function formatDateWestern(
  date: string | Date,
  options?: FormatDateWesternOptions
) {
  const d = parseDateInput(date);
  if (Number.isNaN(d.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    numberingSystem: "latn",
  }).formatToParts(d);

  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const datePart = `${year}/${month}/${day}`;

  if (!options?.withTime) return datePart;

  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    numberingSystem: "latn",
  }).format(d);

  return `${datePart} ${time}`;
}

/** Date + time with Western numerals (YYYY/MM/DD HH:mm). */
export function formatDateTimeWestern(date: string | Date) {
  return formatDateWestern(date, { withTime: true });
}

/** Primary display helper — always Western numerals (YYYY/MM/DD). */
export function formatDate(date: string | Date) {
  return formatDateWestern(date);
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
}
