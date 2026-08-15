import type { CarrierEnvironment } from "../carriers/types";

export type ShippingProviderRow = {
  code: string;
  enabled: boolean;
  environment: CarrierEnvironment;
  public_config: Record<string, string>;
  enabled_services: string[];
  last_test_at: string | null;
  last_test_ok: boolean | null;
  last_test_message: string | null;
  is_active_provider: boolean;
  created_at: string;
  updated_at: string;
};

export type ShippingRateRow = {
  id: string;
  provider_code: string;
  service_code: string;
  service_name: string | null;
  price: number;
  free_shipping_threshold: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ShippingProviderPublic = {
  code: string;
  label: { ar: string; he: string; en: string };
  enabled: boolean;
  environment: CarrierEnvironment;
  is_active_provider: boolean;
  implementation_ready: boolean;
  connection_status:
    | "not_configured"
    | "not_implemented"
    | "unknown"
    | "ok"
    | "error";
  last_test_at: string | null;
  last_test_ok: boolean | null;
  last_test_message: string | null;
  configured: boolean;
  credential_fields: {
    key: string;
    label: string;
    label_he?: string;
    label_ar?: string;
    kind: "secret" | "public";
    required?: boolean;
    inputType?: string;
    help?: string;
  }[];
  secrets_masked: Record<string, string>;
  api_key?: string;
  api_secret_set: boolean;
  public_config: Record<string, string>;
  enabled_services: string[];
  available_services: { code: string; name: string }[];
  supports_cancel: boolean;
  supports_list_services: boolean;
  adapter_code: string;
  is_custom: boolean;
  can_delete: boolean;
};

export const SHIPPING_PROVIDER_SELECT =
  "code, enabled, environment, public_config, enabled_services, last_test_at, last_test_ok, last_test_message, is_active_provider, created_at, updated_at";
