import type { CredentialFieldDef, LocalizedProviderLabel } from "@/lib/commerce/types";
import type { DeliveryMethod } from "@/types/shop";

export type CarrierEnvironment = "test" | "production";

export type CarrierCreateInput = {
  orderId: string;
  orderNumber: string;
  shipmentId: string;
  publicToken: string;
  deliveryMethod: DeliveryMethod | null;
  serviceCode?: string | null;
};

export type CarrierCreateResult =
  | {
      ok: true;
      carrierShipmentId: string;
      trackingNumber: string;
      trackingUrl?: string | null;
      labelUrl?: string | null;
      service?: string | null;
    }
  | {
      ok: false;
      reason: "not_connected" | "not_configured" | "not_implemented" | "error";
      error?: string;
    };

export type CarrierTrackingResult =
  | {
      ok: true;
      status: string;
      trackingNumber?: string | null;
      shippedAt?: string | null;
      deliveredAt?: string | null;
    }
  | {
      ok: false;
      reason: "not_connected" | "not_configured" | "not_implemented" | "error";
      error?: string;
    };

export type CarrierLabelResult =
  | { ok: true; labelUrl: string }
  | {
      ok: false;
      reason: "not_connected" | "not_configured" | "not_implemented" | "error";
      error?: string;
    };

export type CarrierCancelResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_connected" | "not_configured" | "not_implemented" | "error";
      error?: string;
    };

export type CarrierServiceInfo = {
  code: string;
  name: string;
};

export type CarrierTestResult =
  | { ok: true; message: string; services?: CarrierServiceInfo[] }
  | {
      ok: false;
      reason: "not_connected" | "not_configured" | "not_implemented" | "error";
      error?: string;
    };

export type CarrierRuntimeConfig = {
  secrets: Record<string, string>;
  publicConfig: Record<string, string>;
  environment: CarrierEnvironment;
  enabledServices: string[];
};

/**
 * Runtime carrier bound to credentials. Register a real Israeli courier later
 * without changing shop_orders or product tables.
 */
export interface ShippingCarrier {
  code: string;
  isConnected(): boolean;
  createShipment(input: CarrierCreateInput): Promise<CarrierCreateResult>;
  getTrackingStatus(carrierShipmentId: string): Promise<CarrierTrackingResult>;
  cancelShipment(carrierShipmentId: string): Promise<CarrierCancelResult>;
  getShippingLabel(carrierShipmentId: string): Promise<CarrierLabelResult>;
  testConnection(): Promise<CarrierTestResult>;
  listServices(): Promise<CarrierServiceInfo[]>;
}

/**
 * Catalog entry for Admin. Only registered adapters appear in the UI.
 * Adding a carrier later = implement this + register it.
 */
export type ShippingCarrierAdapter = {
  code: string;
  label: LocalizedProviderLabel;
  credentialFields: CredentialFieldDef[];
  requiredSecretKeys: string[];
  supportsListServices: boolean;
  supportsCancel: boolean;
  /** False = placeholder: credentials can be stored; live API is not wired. */
  implementationReady: boolean;
  bind(config: CarrierRuntimeConfig): ShippingCarrier;
};
