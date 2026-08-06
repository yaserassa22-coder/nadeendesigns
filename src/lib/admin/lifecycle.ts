import type { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/admin/audit";
import {
  CUSTOMER_KEY_COLUMN,
  MODULE_TABLE,
  type LifecycleModule,
  type ListVisibility,
} from "@/lib/admin/lifecycle-types";
import { isMissingColumnError, isMissingTableError } from "@/lib/supabase/errors";

export type LifecycleActor = {
  id: string;
  email?: string | null;
};

const PRODUCT_MODULES: LifecycleModule[] = ["dresses", "veils", "bridal_robes"];

/** Modules eligible for automatic trash cleanup (never orders/bookings). */
export const CLEANUP_ELIGIBLE_MODULES: LifecycleModule[] = [
  "dresses",
  "veils",
  "bridal_robes",
  "categories",
  "messages",
  "notification_logs",
  "customer_notifications",
  "shipping_regions",
  "gallery",
  "customers",
];

function idColumn(module: LifecycleModule): string {
  return module === "customers" ? CUSTOMER_KEY_COLUMN : "id";
}

function nowIso() {
  return new Date().toISOString();
}

export type CustomerOverlayHint = {
  display_name?: string | null;
  phone?: string | null;
  email?: string | null;
};

/** Keep customer overlay identity when upserting archive/soft-delete for derived keys. */
async function resolveCustomerOverlayIdentity(
  supabase: SupabaseClient,
  customerKey: string,
  hint?: CustomerOverlayHint
): Promise<{
  display_name: string;
  phone: string | null;
  email: string | null;
}> {
  const phoneFromKey = customerKey.startsWith("p:")
    ? customerKey.slice(2)
    : null;
  const emailFromKey = customerKey.startsWith("e:")
    ? customerKey.slice(2)
    : null;

  const { data: existing } = await supabase
    .from("customer_admin_state")
    .select("display_name, phone, email")
    .eq("customer_key", customerKey)
    .maybeSingle();

  let display_name =
    String(hint?.display_name ?? existing?.display_name ?? "").trim();
  let phone =
    hint?.phone ?? (existing?.phone as string | null) ?? phoneFromKey;
  let email =
    hint?.email ?? (existing?.email as string | null) ?? emailFromKey;

  if (!display_name || (!phone && !email)) {
    let cust: {
      full_name?: string | null;
      phone?: string | null;
      email?: string | null;
    } | null = null;

    const byKey = await supabase
      .from("customers")
      .select("full_name, phone, email")
      .eq("customer_key", customerKey)
      .maybeSingle();
    cust = byKey.data;

    if (!cust && phoneFromKey) {
      const byPhone = await supabase
        .from("customers")
        .select("full_name, phone, email")
        .eq("phone", phoneFromKey)
        .maybeSingle();
      cust = byPhone.data;
    }
    if (!cust && emailFromKey) {
      const byEmail = await supabase
        .from("customers")
        .select("full_name, phone, email")
        .ilike("email", emailFromKey)
        .maybeSingle();
      cust = byEmail.data;
    }
    if (cust) {
      if (!display_name) display_name = String(cust.full_name ?? "").trim();
      phone = phone ?? cust.phone ?? null;
      email = email ?? cust.email ?? null;
    }
  }

  return {
    display_name: display_name || phone || email || customerKey,
    phone,
    email,
  };
}

type VisibilityQuery = {
  eq: (column: string, value: unknown) => VisibilityQuery;
  is: (column: string, value: null) => VisibilityQuery;
  not: (column: string, op: string, value: null) => VisibilityQuery;
};

export function applyVisibilityFilter<T extends VisibilityQuery>(
  query: T,
  visibility: ListVisibility
): T {
  if (visibility === "all") return query;
  if (visibility === "deleted") {
    return query.eq("is_deleted", true) as T;
  }
  // active + archived both exclude deleted
  let q = query.eq("is_deleted", false) as T;
  if (visibility === "active") {
    q = q.is("archived_at", null) as T;
  } else if (visibility === "archived") {
    q = q.not("archived_at", "is", null) as T;
  }
  return q;
}

/** Best-effort filter for list queries when columns exist. */
export function withActiveLifecycleFilter<
  T extends {
    eq: (column: string, value: unknown) => T;
    is: (column: string, value: null) => T;
  },
>(query: T): T {
  try {
    return query.eq("is_deleted", false).is("archived_at", null);
  } catch {
    return query;
  }
}

/** Exclude soft-deleted rows only (keeps archived for admin archived view). */
export function withNotDeletedFilter<
  T extends { eq: (column: string, value: unknown) => T },
>(query: T): T {
  try {
    return query.eq("is_deleted", false);
  } catch {
    return query;
  }
}

export function filterRowsByVisibility<T>(
  rows: T[],
  visibility: ListVisibility
): T[] {
  const typed = rows as Array<
    T & { is_deleted?: boolean | null; archived_at?: string | null }
  >;
  if (visibility === "all") return rows;
  if (visibility === "deleted") {
    return typed.filter((r) => r.is_deleted === true) as T[];
  }
  const notDeleted = typed.filter((r) => r.is_deleted !== true);
  if (visibility === "active") {
    return notDeleted.filter((r) => !r.archived_at) as T[];
  }
  if (visibility === "archived") {
    return notDeleted.filter((r) => Boolean(r.archived_at)) as T[];
  }
  return notDeleted as T[];
}

async function touch(
  supabase: SupabaseClient,
  module: LifecycleModule,
  recordId: string,
  patch: Record<string, unknown>,
  actor: LifecycleActor,
  action: "archive" | "unarchive" | "soft_delete" | "restore" | "permanent_delete",
  meta?: Record<string, unknown>,
  customerHint?: CustomerOverlayHint
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const table = MODULE_TABLE[module];
  const col = idColumn(module);

  if (action === "permanent_delete") {
    const { error } = await supabase.from(table).delete().eq(col, recordId);
    if (error) {
      if (isMissingTableError(error, table)) {
        return {
          ok: false,
          status: 503,
          error: "الجدول غير موجود. نفّذ supabase/APPLY_SOFT_DELETE_ARCHIVE.sql",
        };
      }
      return { ok: false, status: 400, error: error.message };
    }
    await writeAuditLog(supabase, {
      module,
      recordId,
      action: "permanent_delete",
      actorId: actor.id,
      actorEmail: actor.email,
      meta,
    });
    return { ok: true };
  }

  let error: { message: string; code?: string } | null = null;

  if (module === "customers") {
    // Overlay keyed by customer_key — upsert so archive/delete works for derived keys.
    // Preserve identity fields: bare upsert would reset display_name/phone/email to defaults.
    const identity = await resolveCustomerOverlayIdentity(
      supabase,
      recordId,
      customerHint
    );
    const upsertRow = {
      customer_key: recordId,
      display_name: identity.display_name,
      phone: identity.phone,
      email: identity.email,
      ...patch,
      updated_at: nowIso(),
    };
    const result = await supabase
      .from(table)
      .upsert(upsertRow, { onConflict: "customer_key" });
    error = result.error;
  } else {
    const result = await supabase.from(table).update(patch).eq(col, recordId);
    error = result.error;
  }

  if (error) {
    if (isMissingColumnError(error) || /is_deleted|archived_at|deleted_at/i.test(error.message)) {
      return {
        ok: false,
        status: 503,
        error:
          "أعمدة الأرشفة/الحذف غير موجودة. نفّذ supabase/APPLY_SOFT_DELETE_ARCHIVE.sql في SQL Editor.",
      };
    }
    if (isMissingTableError(error, table)) {
      return {
        ok: false,
        status: 503,
        error: "الجدول غير موجود. نفّذ supabase/APPLY_SOFT_DELETE_ARCHIVE.sql",
      };
    }
    return { ok: false, status: 400, error: error.message };
  }

  await writeAuditLog(supabase, {
    module,
    recordId,
    action,
    actorId: actor.id,
    actorEmail: actor.email,
    meta,
  });
  return { ok: true };
}

export async function archiveRecord(
  supabase: SupabaseClient,
  module: LifecycleModule,
  recordId: string,
  actor: LifecycleActor,
  customerHint?: CustomerOverlayHint
) {
  return touch(
    supabase,
    module,
    recordId,
    {
      archived_at: nowIso(),
      archived_by: actor.id,
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
    },
    actor,
    "archive",
    undefined,
    customerHint
  );
}

export async function unarchiveRecord(
  supabase: SupabaseClient,
  module: LifecycleModule,
  recordId: string,
  actor: LifecycleActor
) {
  return touch(
    supabase,
    module,
    recordId,
    { archived_at: null, archived_by: null },
    actor,
    "unarchive"
  );
}

export async function softDeleteRecord(
  supabase: SupabaseClient,
  module: LifecycleModule,
  recordId: string,
  actor: LifecycleActor,
  customerHint?: CustomerOverlayHint
) {
  return touch(
    supabase,
    module,
    recordId,
    {
      is_deleted: true,
      deleted_at: nowIso(),
      deleted_by: actor.id,
    },
    actor,
    "soft_delete",
    undefined,
    customerHint
  );
}

export async function restoreRecord(
  supabase: SupabaseClient,
  module: LifecycleModule,
  recordId: string,
  actor: LifecycleActor
) {
  return touch(
    supabase,
    module,
    recordId,
    {
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
      archived_at: null,
      archived_by: null,
    },
    actor,
    "restore"
  );
}

/**
 * Product permanent-delete guard: block if on non-cancelled order items
 * or linked to bookings (dress_id).
 */
export async function assertProductCanPermanentDelete(
  supabase: SupabaseClient,
  module: LifecycleModule,
  recordId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!PRODUCT_MODULES.includes(module)) return { ok: true };

  const { data: orders, error: ordersError } = await supabase
    .from("shop_orders")
    .select("id, status, items")
    .neq("status", "cancelled");

  if (ordersError && !isMissingTableError(ordersError, "shop_orders")) {
    // If schema missing lifecycle on orders, still check items when readable
    if (!isMissingColumnError(ordersError)) {
      return { ok: false, status: 400, error: ordersError.message };
    }
  }

  for (const order of orders ?? []) {
    const status = String((order as { status?: string }).status ?? "");
    if (status === "cancelled") continue;
    const items = (order as { items?: unknown }).items;
    if (!Array.isArray(items)) continue;
    const hit = items.some((item) => {
      if (!item || typeof item !== "object") return false;
      const row = item as Record<string, unknown>;
      return (
        row.product_id === recordId ||
        row.id === recordId ||
        row.dress_id === recordId ||
        row.veil_id === recordId ||
        row.bridal_robe_id === recordId
      );
    });
    if (hit) {
      return {
        ok: false,
        status: 409,
        error:
          "لا يمكن الحذف النهائي: المنتج مرتبط بطلب غير ملغى. ألغِ الطلب أو أزل المنتج منه أولاً.",
      };
    }
  }

  if (module === "dresses") {
    const { count, error } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("dress_id", recordId);
    if (!error && (count ?? 0) > 0) {
      return {
        ok: false,
        status: 409,
        error: "لا يمكن الحذف النهائي: المنتج مرتبط بحجوزات.",
      };
    }
  }

  return { ok: true };
}

/** Customer overlay: block permanent delete when key has non-cancelled orders. */
export async function assertCustomerCanPermanentDelete(
  supabase: SupabaseClient,
  customerKey: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const phone = customerKey.startsWith("p:") ? customerKey.slice(2) : null;
  const email = customerKey.startsWith("e:") ? customerKey.slice(2) : null;

  let query = supabase
    .from("shop_orders")
    .select("id", { count: "exact", head: true })
    .neq("status", "cancelled");

  if (phone) query = query.eq("phone", phone);
  else if (email) query = query.eq("email", email);
  else {
    return { ok: true };
  }

  const { count, error } = await query;
  if (error && !isMissingTableError(error, "shop_orders")) {
    return { ok: false, status: 400, error: error.message };
  }
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      status: 409,
      error: "لا يمكن الحذف النهائي للعميل: توجد طلبات غير ملغاة مرتبطة به.",
    };
  }
  return { ok: true };
}

export async function permanentDeleteRecord(
  supabase: SupabaseClient,
  module: LifecycleModule,
  recordId: string,
  actor: LifecycleActor
) {
  if (PRODUCT_MODULES.includes(module)) {
    const guard = await assertProductCanPermanentDelete(supabase, module, recordId);
    if (!guard.ok) return guard;
  }
  if (module === "customers") {
    const guard = await assertCustomerCanPermanentDelete(supabase, recordId);
    if (!guard.ok) return guard;
  }
  return touch(supabase, module, recordId, {}, actor, "permanent_delete");
}

export type TrashItem = {
  module: LifecycleModule;
  id: string;
  title: string;
  deleted_at: string | null;
  deleted_by: string | null;
  meta?: Record<string, unknown>;
};

function titleFromRow(module: LifecycleModule, row: Record<string, unknown>): string {
  if (module === "orders") {
    return String(row.name || row.phone || row.id || "طلب");
  }
  if (module === "bookings") {
    return String(row.name || row.phone || row.id || "حجز");
  }
  if (module === "customers") {
    return String(row.display_name || row.phone || row.email || row.customer_key || "عميل");
  }
  if (module === "messages") {
    return String(row.subject || row.name || row.id || "رسالة");
  }
  if (
    module === "dresses" ||
    module === "veils" ||
    module === "bridal_robes" ||
    module === "categories" ||
    module === "gallery" ||
    module === "shipping_regions"
  ) {
    return String(row.name_ar || row.name || row.id || module);
  }
  return String(row.id ?? module);
}

export async function listTrashItems(
  supabase: SupabaseClient,
  module?: LifecycleModule
): Promise<{ items: TrashItem[]; error?: string }> {
  const modules = module
    ? [module]
    : (Object.keys(MODULE_TABLE) as LifecycleModule[]).filter(
        (m) => m !== "reports"
      );
  const items: TrashItem[] = [];

  for (const mod of modules) {
    if (mod === "reports") continue;
    const table = MODULE_TABLE[mod];
    const col = idColumn(mod);
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("is_deleted", true)
      .order("deleted_at", { ascending: false })
      .limit(200);

    if (error) {
      if (
        isMissingTableError(error, table) ||
        isMissingColumnError(error) ||
        /is_deleted/i.test(error.message)
      ) {
        continue;
      }
      return { items: [], error: error.message };
    }

    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const id = String(row[col] ?? "");
      if (!id) continue;
      items.push({
        module: mod,
        id,
        title: titleFromRow(mod, row),
        deleted_at: (row.deleted_at as string | null) ?? null,
        deleted_by: (row.deleted_by as string | null) ?? null,
        meta: {
          status: row.status,
          created_at: row.created_at,
        },
      });
    }
  }

  items.sort((a, b) => {
    const ta = a.deleted_at ? Date.parse(a.deleted_at) : 0;
    const tb = b.deleted_at ? Date.parse(b.deleted_at) : 0;
    return tb - ta;
  });

  return { items };
}

export async function emptyTrash(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  module?: LifecycleModule
): Promise<{ ok: true; deleted: number } | { ok: false; error: string; status: number }> {
  const listed = await listTrashItems(supabase, module);
  if (listed.error) {
    return { ok: false, status: 400, error: listed.error };
  }

  let deleted = 0;
  for (const item of listed.items) {
    // Never auto-empty orders/bookings unless explicitly scoped — still allow
    // empty trash for those modules when admin confirms via API.
    const result = await permanentDeleteRecord(
      supabase,
      item.module,
      item.id,
      actor
    );
    if (result.ok) deleted += 1;
  }
  return { ok: true, deleted };
}

/**
 * Permanently remove soft-deleted rows older than `days` for cleanup-eligible
 * modules. Never touches orders or bookings.
 */
export async function runTrashCleanup(
  supabase: SupabaseClient,
  actor: LifecycleActor,
  days: number
): Promise<{ ok: true; deleted: number } | { ok: false; error: string; status: number }> {
  if (!Number.isFinite(days) || days < 1) {
    return { ok: false, status: 400, error: "عدد الأيام غير صالح" };
  }

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  let deleted = 0;

  for (const mod of CLEANUP_ELIGIBLE_MODULES) {
    const table = MODULE_TABLE[mod];
    const col = idColumn(mod);
    const { data, error } = await supabase
      .from(table)
      .select(col)
      .eq("is_deleted", true)
      .lt("deleted_at", cutoff)
      .limit(500);

    if (error) {
      if (
        isMissingTableError(error, table) ||
        isMissingColumnError(error) ||
        /is_deleted|deleted_at/i.test(error.message)
      ) {
        continue;
      }
      return { ok: false, status: 400, error: error.message };
    }

    for (const row of data ?? []) {
      const id = String(
        (row as unknown as Record<string, unknown>)[col] ?? ""
      );
      if (!id) continue;
      const result = await permanentDeleteRecord(supabase, mod, id, actor);
      if (result.ok) deleted += 1;
    }
  }

  await writeAuditLog(supabase, {
    module: "messages",
    recordId: "cleanup",
    action: "permanent_delete",
    actorId: actor.id,
    actorEmail: actor.email,
    meta: { type: "trash_cleanup", days, deleted },
  });

  return { ok: true, deleted };
}

export function isLifecycleModule(value: unknown): value is LifecycleModule {
  return (
    typeof value === "string" &&
    value in MODULE_TABLE &&
    value !== "reports"
  );
}
