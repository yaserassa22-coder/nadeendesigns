import type { ShippingCarrierAdapter } from "../carriers/types";
import { MANUAL_ADAPTER_CODE } from "../carriers/manual";
import { adapterCodeFromRow, labelsFromRow } from "./catalog";
import { maskProviderSecrets, type ShippingSecretMap } from "./secrets";
import type { ShippingProviderPublic, ShippingProviderRow } from "./types";

function connectionStatus(input: {
  configured: boolean;
  implementationReady: boolean;
  last_test_ok: boolean | null;
  last_test_message: string | null;
}): ShippingProviderPublic["connection_status"] {
  if (!input.configured) return "not_configured";
  if (input.last_test_ok === true) return "ok";
  if (
    input.last_test_ok === false &&
    /not implemented/i.test(input.last_test_message ?? "")
  ) {
    return "not_implemented";
  }
  if (input.last_test_ok === false) return "error";
  if (!input.implementationReady) return "not_implemented";
  return "unknown";
}

export function toPublicProvider(
  adapter: ShippingCarrierAdapter,
  row: ShippingProviderRow,
  secrets: ShippingSecretMap,
  includeSecretsMasked: boolean
): ShippingProviderPublic {
  const secretKeys = adapter.credentialFields
    .filter((f) => f.kind === "secret")
    .map((f) => f.key);
  const configured = adapter.requiredSecretKeys.every((k) =>
    Boolean(secrets[k]?.trim())
  );
  const masked = includeSecretsMasked
    ? maskProviderSecrets(secrets, secretKeys)
    : { secrets_masked: {}, api_secret_set: false };

  const adapterCode = adapterCodeFromRow(row);
  const isCustom =
    adapterCode === MANUAL_ADAPTER_CODE || adapter.code !== row.code;
  const publicView: ShippingProviderPublic = {
    code: row.code,
    label: labelsFromRow(row, adapter.label),
    enabled: row.enabled,
    environment: row.environment,
    is_active_provider: row.is_active_provider,
    implementation_ready: adapter.implementationReady,
    connection_status: connectionStatus({
      configured,
      implementationReady: adapter.implementationReady,
      last_test_ok: row.last_test_ok,
      last_test_message: row.last_test_message,
    }),
    last_test_at: row.last_test_at,
    last_test_ok: row.last_test_ok,
    last_test_message: row.last_test_message,
    configured,
    credential_fields: adapter.credentialFields,
    secrets_masked: masked.secrets_masked,
    api_secret_set: masked.api_secret_set,
    public_config: row.public_config,
    enabled_services: row.enabled_services,
    available_services: [],
    supports_cancel: adapter.supportsCancel,
    supports_list_services: adapter.supportsListServices,
    adapter_code: adapterCode === row.code ? adapter.code : adapterCode,
    is_custom: isCustom,
    can_delete: true,
  };

  if (includeSecretsMasked && secrets.api_key?.trim()) {
    publicView.api_key = masked.secrets_masked.api_key || "••••••••";
  }

  return publicView;
}
