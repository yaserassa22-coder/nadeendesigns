"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHero } from "@/components/dresses/DressCatalog";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { resolveCarrierLabel } from "@/lib/i18n/carrier-labels";
import type { ShipmentStatus } from "@/types/shop";

type LookupPayload = {
  order_number: string;
  order_status: string | null;
  shipment: {
    public_token: string;
    carrier: string | null;
    carrier_tracking_number: string | null;
    shipment_status: ShipmentStatus;
  };
};

function shipmentStatusLabel(
  status: ShipmentStatus,
  t: {
    shipmentStatusPending: string;
    shipmentStatusLabelCreated: string;
    shipmentStatusInTransit: string;
    shipmentStatusDelivered: string;
    shipmentStatusCancelled: string;
    shipmentStatusFailed: string;
  }
): string {
  if (status === "label_created") return t.shipmentStatusLabelCreated;
  if (status === "in_transit") return t.shipmentStatusInTransit;
  if (status === "delivered") return t.shipmentStatusDelivered;
  if (status === "cancelled") return t.shipmentStatusCancelled;
  if (status === "failed") return t.shipmentStatusFailed;
  return t.shipmentStatusPending;
}

export default function ShipmentLookupPage() {
  const { t, locale } = useLocale();
  const ui = t.orders;
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [data, setData] = useState<LookupPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError(ui.invalidId);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/shipments/by-token/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || ui.notFound);
        if (!cancelled) setData(json as LookupPayload);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : ui.loadFailed);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, ui.invalidId, ui.notFound, ui.loadFailed]);

  return (
    <div>
      <PageHero
        title={ui.shipmentLookupTitle}
        description={ui.shippingStatusTitle}
      />
      <div className="mx-auto max-w-lg px-4 py-10">
        {loading ? (
          <p className="text-center text-muted">{ui.loading}</p>
        ) : error || !data ? (
          <p className="text-center text-red-600">{error || ui.notFound}</p>
        ) : (
          <dl className="space-y-3 rounded-2xl border border-beige-dark bg-white p-6 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{ui.orderNumber}</dt>
              <dd className="font-medium" dir="ltr">
                {data.order_number}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{ui.shippingStatus}</dt>
              <dd>
                {shipmentStatusLabel(data.shipment.shipment_status, ui)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{ui.carrier}</dt>
              <dd>
                {data.shipment.carrier
                  ? resolveCarrierLabel(data.shipment.carrier, locale)
                  : ui.carrierNotConnected}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{ui.trackingNumber}</dt>
              <dd dir="ltr">
                {data.shipment.carrier_tracking_number ||
                  ui.trackingUnavailable}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}
