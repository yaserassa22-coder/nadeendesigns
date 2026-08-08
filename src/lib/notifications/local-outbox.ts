/**
 * Local notification outbox for development / pre-Resend-Twilio.
 * File-backed so entries survive Next.js HMR and process restarts.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

export type LocalOutboxChannel = "email" | "whatsapp";

export type LocalOutboxEntry = {
  id: string;
  channel: LocalOutboxChannel;
  to: string;
  subject?: string;
  body: string;
  html?: string;
  created_at: string;
  meta?: Record<string, unknown>;
};

const MAX_ENTRIES = 100;
const STORE_DIR = join(process.cwd(), ".next", "cache");
const STORE_FILE = join(STORE_DIR, "nadeen-local-notification-outbox.json");

type GlobalOutbox = typeof globalThis & {
  __nadeenLocalOutbox?: LocalOutboxEntry[];
};

function memoryStore(): LocalOutboxEntry[] {
  const g = globalThis as GlobalOutbox;
  if (!g.__nadeenLocalOutbox) {
    g.__nadeenLocalOutbox = loadFromDisk();
  }
  return g.__nadeenLocalOutbox;
}

function loadFromDisk(): LocalOutboxEntry[] {
  try {
    if (!existsSync(STORE_FILE)) return [];
    const raw = readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is LocalOutboxEntry =>
        Boolean(row) &&
        typeof row === "object" &&
        typeof (row as LocalOutboxEntry).id === "string" &&
        typeof (row as LocalOutboxEntry).channel === "string" &&
        typeof (row as LocalOutboxEntry).to === "string" &&
        typeof (row as LocalOutboxEntry).body === "string"
    );
  } catch {
    return [];
  }
}

function persist(entries: LocalOutboxEntry[]) {
  try {
    if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true });
    writeFileSync(STORE_FILE, JSON.stringify(entries.slice(0, MAX_ENTRIES)), "utf8");
  } catch (e) {
    console.warn("[local-outbox] persist failed", e);
  }
}

/** Prefer explicit env; otherwise enable outside production. */
export function shouldUseLocalNotificationOutbox(): boolean {
  const flag = process.env.NOTIFICATIONS_LOCAL_OUTBOX?.trim().toLowerCase();
  if (flag === "true" || flag === "1") return true;
  if (flag === "false" || flag === "0") return false;
  return process.env.NODE_ENV !== "production";
}

export function pushLocalOutbox(
  entry: Omit<LocalOutboxEntry, "id" | "created_at"> & {
    id?: string;
    created_at?: string;
  }
): LocalOutboxEntry {
  const row: LocalOutboxEntry = {
    id: entry.id || `local_${crypto.randomUUID()}`,
    channel: entry.channel,
    to: entry.to,
    subject: entry.subject,
    body: entry.body,
    html: entry.html,
    created_at: entry.created_at || new Date().toISOString(),
    meta: entry.meta,
  };
  const entries = memoryStore();
  entries.unshift(row);
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
  persist(entries);
  return row;
}

export function listLocalOutbox(limit = 40): LocalOutboxEntry[] {
  return memoryStore().slice(0, Math.max(1, Math.min(limit, MAX_ENTRIES)));
}

export function clearLocalOutbox() {
  const entries = memoryStore();
  entries.length = 0;
  persist(entries);
}
