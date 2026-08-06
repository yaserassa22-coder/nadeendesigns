import type { LifecycleModule } from "@/lib/admin/lifecycle-types";

export async function postLifecycle(input: {
  action: "archive" | "unarchive" | "soft_delete" | "restore";
  module: LifecycleModule;
  id?: string;
  ids?: string[];
  /** Customers overlay: preserve list identity when upserting derived keys. */
  display_name?: string;
  phone?: string | null;
  email?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch("/api/admin/lifecycle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data.error || "فشلت العملية" };
  }
  return { ok: true };
}

export async function postTrash(input: {
  action: "restore" | "permanent_delete" | "empty";
  module?: LifecycleModule;
  id?: string;
  ids?: string[];
}): Promise<{ ok: true; deleted?: number } | { ok: false; error: string }> {
  const res = await fetch("/api/admin/trash", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data.error || "فشلت العملية" };
  }
  return { ok: true, deleted: data.deleted };
}
