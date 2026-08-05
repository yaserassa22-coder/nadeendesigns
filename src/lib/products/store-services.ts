/**
 * Global Services Library — dual-write between settings.store.extra_services
 * and store_services table (Sprint 2A MASTER).
 */

import {
  normalizeExtraServices,
  type ExtraServiceConfig,
  type ServicePricingMode,
  type ServiceVisibility,
  type StoreExtraServicesSettings,
} from "@/lib/products/order-experience";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type StoreServiceRow = {
  id: string;
  name: string;
  name_ar: string;
  description: string | null;
  description_ar: string | null;
  pricing_mode: string;
  price: number | string;
  enabled: boolean;
  visible: boolean;
  required: boolean;
  default_selected: boolean;
  available_online: boolean;
  available_in_store: boolean;
  sort_order: number;
  visibility: ServiceVisibility | null;
};

function rowToConfig(row: StoreServiceRow): ExtraServiceConfig {
  const price = Math.max(0, Number(row.price) || 0);
  const pricing_mode = (
    row.pricing_mode === "FIXED_PRICE" ? "FIXED_PRICE" : "FREE"
  ) as ServicePricingMode;
  return {
    id: row.id,
    name: row.name || row.id,
    name_ar: row.name_ar || row.id,
    description: row.description ?? "",
    description_ar: row.description_ar ?? "",
    pricing_mode,
    price: pricing_mode === "FREE" ? 0 : price,
    enabled: Boolean(row.enabled),
    visible: row.visible !== false,
    required: Boolean(row.required),
    default_selected: Boolean(row.default_selected) || Boolean(row.required),
    available_online: row.available_online !== false,
    available_in_store: Boolean(row.available_in_store),
    sort_order: Number(row.sort_order) || 0,
    visibility:
      row.visibility && typeof row.visibility === "object"
        ? row.visibility
        : { scope: "all" },
  };
}

function configToRow(svc: ExtraServiceConfig) {
  return {
    id: svc.id,
    name: svc.name,
    name_ar: svc.name_ar,
    description: svc.description ?? "",
    description_ar: svc.description_ar ?? "",
    pricing_mode: svc.pricing_mode,
    price: svc.pricing_mode === "FREE" ? 0 : svc.price,
    enabled: svc.enabled,
    visible: svc.visible !== false,
    required: Boolean(svc.required),
    default_selected: Boolean(svc.default_selected) || Boolean(svc.required),
    available_online: svc.available_online !== false,
    available_in_store: Boolean(svc.available_in_store),
    sort_order: svc.sort_order,
    visibility: svc.visibility ?? { scope: "all" },
    updated_at: new Date().toISOString(),
  };
}

/** Load services from store_services table when available. */
export async function loadStoreServicesFromTable(): Promise<
  ExtraServiceConfig[] | null
> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("store_services")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      // Table may not exist yet before migration 038
      if (/store_services|PGRST205|42P01/i.test(error.message ?? "")) {
        return null;
      }
      console.error("[store-services] load failed", error.message);
      return null;
    }
    if (!data?.length) return null;
    return (data as StoreServiceRow[]).map(rowToConfig);
  } catch {
    return null;
  }
}

/**
 * Prefer table library; fall back to settings JSON normalize.
 * Merges so settings JSON remains a valid mirror.
 */
export async function resolveStoreExtraServices(
  settingsJson: unknown
): Promise<StoreExtraServicesSettings> {
  const fromJson = normalizeExtraServices(settingsJson);
  const fromTable = await loadStoreServicesFromTable();
  if (!fromTable?.length) return fromJson;

  // Table wins for known ids; keep any JSON-only custom ids not in table
  const byId = new Map(fromTable.map((s) => [s.id, s]));
  for (const s of fromJson.services) {
    if (!byId.has(s.id)) byId.set(s.id, s);
  }
  return {
    services: [...byId.values()].sort((a, b) => a.sort_order - b.sort_order),
  };
}

/** Upsert full library into store_services (best-effort; never blocks settings save). */
export async function syncStoreServicesTable(
  services: ExtraServiceConfig[]
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = createAdminClient();
    const rows = services.map(configToRow);
    const { error } = await supabase.from("store_services").upsert(rows, {
      onConflict: "id",
    });
    if (error && !/store_services|PGRST205|42P01/i.test(error.message ?? "")) {
      console.error("[store-services] sync failed", error.message);
    }
  } catch {
    // ignore — JSON settings remain source if table missing
  }
}
