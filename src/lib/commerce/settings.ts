/**
 * Commerce platform settings (settings.key = 'commerce').
 * Syncs enabled payment providers into store.payments for storefront display.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  DEFAULT_COMMERCE_SETTINGS,
  type CommerceSettings,
  type CommerceMode,
  type InvoiceProviderSettingsRow,
  type PaymentProviderSettingsRow,
} from "@/lib/commerce/types";
import { ensurePaymentProvidersRegistered } from "@/lib/payments/providers";
import { listPaymentProviders } from "@/lib/payments/registry";
import { ensureInvoiceProvidersRegistered } from "@/lib/invoicing/providers";
import { listInvoiceProviders } from "@/lib/invoicing/registry";
import {
  getStoreSettings,
  mergeStoreSettingsPatch,
  saveStoreSettings,
} from "@/lib/store/settings";
import type { StorePaymentProvider } from "@/types/store";

const SETTINGS_KEY = "commerce";

let memoryCommerce: CommerceSettings | null = null;

function deepMergeCommerce(
  base: CommerceSettings,
  patch: Partial<CommerceSettings>
): CommerceSettings {
  return {
    mode: patch.mode ?? base.mode,
    payments: {
      providers:
        patch.payments?.providers ?? base.payments.providers,
    },
    invoicing: {
      ...base.invoicing,
      ...(patch.invoicing ?? {}),
      providers:
        patch.invoicing?.providers ?? base.invoicing.providers,
    },
  };
}

function ensureProviderRows(settings: CommerceSettings): CommerceSettings {
  ensurePaymentProvidersRegistered();
  ensureInvoiceProvidersRegistered();

  const payById = new Map(
    settings.payments.providers.map((p) => [p.id, p])
  );
  const paymentRows: PaymentProviderSettingsRow[] = listPaymentProviders().map(
    (p) => {
      const existing = payById.get(p.id);
      return (
        existing ?? {
          id: p.id,
          enabled: p.id === "cod",
          sort_order: p.defaultSortOrder,
          public_config: {},
          connection_status: p.id === "cod" ? "ok" : "not_configured",
          last_tested_at: null,
          last_error: null,
        }
      );
    }
  );

  const invById = new Map(
    settings.invoicing.providers.map((p) => [p.id, p])
  );
  const invoiceRows: InvoiceProviderSettingsRow[] = listInvoiceProviders().map(
    (p) => {
      const existing = invById.get(p.id);
      return (
        existing ?? {
          id: p.id,
          public_config: {},
          connection_status: p.id === "internal" ? "ok" : "not_configured",
          last_tested_at: null,
          last_error: null,
        }
      );
    }
  );

  return {
    ...settings,
    payments: {
      providers: paymentRows.sort((a, b) => a.sort_order - b.sort_order),
    },
    invoicing: {
      ...settings.invoicing,
      providers: invoiceRows,
      active_provider_id:
        settings.invoicing.active_provider_id || "internal",
    },
  };
}

export async function getCommerceSettings(
  force = false
): Promise<CommerceSettings> {
  if (!force && memoryCommerce) {
    return ensureProviderRows(memoryCommerce);
  }

  if (!isSupabaseConfigured()) {
    memoryCommerce = ensureProviderRows(
      structuredClone(DEFAULT_COMMERCE_SETTINGS)
    );
    return memoryCommerce;
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    if (error || !data?.value) {
      memoryCommerce = ensureProviderRows(
        structuredClone(DEFAULT_COMMERCE_SETTINGS)
      );
      return memoryCommerce;
    }

    memoryCommerce = ensureProviderRows(
      deepMergeCommerce(
        structuredClone(DEFAULT_COMMERCE_SETTINGS),
        data.value as Partial<CommerceSettings>
      )
    );
    return memoryCommerce;
  } catch {
    memoryCommerce = ensureProviderRows(
      structuredClone(DEFAULT_COMMERCE_SETTINGS)
    );
    return memoryCommerce;
  }
}

export async function saveCommerceSettings(
  next: CommerceSettings
): Promise<CommerceSettings> {
  const normalized = ensureProviderRows(next);
  memoryCommerce = normalized;

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      await supabase.from("settings").upsert({
        key: SETTINGS_KEY,
        value: normalized,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("[commerce] saveCommerceSettings failed", e);
    }
  }

  // Sync storefront payment list (extend — keep COD behavior)
  await syncStorePaymentsFromCommerce(normalized);

  return normalized;
}

/** Push commerce payment enable/order into store.payments for checkout UI. */
async function syncStorePaymentsFromCommerce(
  commerce: CommerceSettings
): Promise<void> {
  try {
    ensurePaymentProvidersRegistered();
    const store = await getStoreSettings(true);
    const byId = new Map(store.payments.providers.map((p) => [p.id, p]));

    const synced: StorePaymentProvider[] = listPaymentProviders().map((reg) => {
      const row = commerce.payments.providers.find((p) => p.id === reg.id);
      const prev = byId.get(reg.id);
      const enabled = row?.enabled ?? reg.id === "cod";
      const configured =
        reg.id === "cod" ||
        row?.connection_status === "ok" ||
        Boolean(prev?.configured);

      return {
        id: reg.id,
        name: reg.label.en,
        name_ar: reg.label.ar,
        name_he: reg.label.he,
        enabled,
        coming_soon: !reg.implementationReady && enabled,
        sort_order: row?.sort_order ?? reg.defaultSortOrder,
        icon: prev?.icon || "wallet",
        description: prev?.description || reg.label.en,
        description_ar: prev?.description_ar || reg.label.ar,
        description_he: prev?.description_he || reg.label.he,
        configuration: {
          ...(prev?.configuration ?? {}),
          ...(row?.public_config ?? {}),
        },
        secret_env_ref: prev?.secret_env_ref ?? null,
        configured: reg.id === "cod" ? true : configured,
      };
    });

    // Preserve any legacy store-only providers (stripe, tranzila, bank_transfer)
    for (const p of store.payments.providers) {
      if (!synced.some((s) => s.id === p.id)) {
        synced.push(p);
      }
    }

    synced.sort((a, b) => a.sort_order - b.sort_order);

    await saveStoreSettings(
      mergeStoreSettingsPatch(store, {
        payments: { providers: synced },
      }),
      ["payments"]
    );
  } catch (e) {
    console.error("[commerce] syncStorePaymentsFromCommerce failed", e);
  }
}

export function getCommerceMode(settings: CommerceSettings): CommerceMode {
  return settings.mode === "live" ? "live" : "test";
}

export function getPaymentRow(
  settings: CommerceSettings,
  providerId: string
): PaymentProviderSettingsRow | undefined {
  return settings.payments.providers.find((p) => p.id === providerId);
}
