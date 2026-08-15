import type { ShippingCarrier } from "./types";

const NOT_CONNECTED = {
  ok: false as const,
  reason: "not_connected" as const,
};

/** Default adapter until a real courier is registered. Writes nothing. */
export const NoopCarrier: ShippingCarrier = {
  code: "noop",
  isConnected() {
    return false;
  },
  async createShipment() {
    return NOT_CONNECTED;
  },
  async getTrackingStatus() {
    return NOT_CONNECTED;
  },
  async cancelShipment() {
    return NOT_CONNECTED;
  },
  async getShippingLabel() {
    return NOT_CONNECTED;
  },
  async testConnection() {
    return {
      ok: false,
      reason: "not_connected",
      error: "No shipping carrier is connected.",
    };
  },
  async listServices() {
    return [];
  },
};
