"use client";

import { formatPrice } from "@/lib/utils";
import { formatEstimatedDelivery } from "@/lib/shop/shipping";
import {
  getDeliveryMethodLabel,
  type DeliveryMethod,
  type ShippingRegion,
} from "@/types/shop";
import { useLocale } from "@/components/i18n/LocaleProvider";

export type ShippingDisplay = {
  required?: boolean | null;
  delivery_method?: DeliveryMethod | null;
  full_name?: string | null;
  phone?: string | null;
  city?: string | null;
  region?: string | null;
  region_name_ar?: string | null;
  region_custom?: string | null;
  address?: string | null;
  building_number?: string | null;
  neighborhood?: string | null;
  postal_code?: string | null;
  notes?: string | null;
  cost?: number | null;
  fee_pending?: boolean | null;
  region_configured?: boolean | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  estimated_delivery?: string | null;
  /** Shipping company / carrier code — future-ready */
  carrier_code?: string | null;
  /** Admin-only — rendered when showInternalNotes */
  internal_notes?: string | null;
};

/** Safe for legacy orders with no shipping columns. */
export function hasShippingDetails(s?: ShippingDisplay | null): boolean {
  if (!s) return false;
  // delivery_method=delivery always shows the shipping section (never dress-only).
  if (s.delivery_method === "delivery" || s.delivery_method === "pickup") {
    return true;
  }
  if (s.required === false && !s.delivery_method) return false;
  return Boolean(
    s.delivery_method ||
      s.full_name ||
      s.phone ||
      s.city ||
      s.region ||
      s.region_name_ar ||
      s.region_custom ||
      s.address ||
      s.postal_code ||
      s.notes ||
      s.fee_pending ||
      s.tracking_number ||
      (typeof s.cost === "number" && s.cost > 0)
  );
}

export function ShippingDetailsBlock({
  shipping,
  title,
  className,
  showZeroCost = false,
  showInternalNotes = false,
}: {
  shipping?: ShippingDisplay | null;
  title?: string;
  className?: string;
  showZeroCost?: boolean;
  showInternalNotes?: boolean;
}) {
  const { locale, t } = useLocale();
  const heading = title ?? t.shippingUi.addressTitle;
  if (!hasShippingDetails(shipping) && !showZeroCost) return null;
  if (!shipping) return null;
  const s = shipping;
  const method = s.delivery_method;
  const isPickup = method === "pickup";

  if (isPickup) {
    return (
      <div className={className}>
        <h3 className="text-sm font-semibold text-charcoal">{heading}</h3>
        <dl className="mt-2 space-y-1 text-sm text-muted">
          <div>
            <dt className="inline text-charcoal/70">{t.shippingUi.deliveryMethod} </dt>
            <dd className="inline">{getDeliveryMethodLabel("pickup", locale)}</dd>
          </div>
          <p className="mt-2 text-sm text-charcoal/80">
            {t.shippingUi.pickupReadyHint}
          </p>
          {(typeof s.cost === "number" && s.cost > 0) || showZeroCost ? (
            <div>
              <dt className="inline text-charcoal/70">{t.shippingUi.shippingFee} </dt>
              <dd className="inline text-gold" dir="ltr">
                {t.shippingUi.free}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    );
  }

  const regionLabel =
    s.region_name_ar || s.region_custom || s.region;
  const hasAddress = Boolean(
    s.full_name || s.phone || s.city || regionLabel || s.address
  );
  if (!hasAddress && !showZeroCost && !method && !s.fee_pending) return null;

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-charcoal">{heading}</h3>
      <dl className="mt-2 space-y-1 text-sm text-muted">
        {method && (
          <div>
            <dt className="inline text-charcoal/70">{t.shippingUi.deliveryMethod} </dt>
            <dd className="inline">{getDeliveryMethodLabel(method, locale)}</dd>
          </div>
        )}
        {s.full_name && (
          <div>
            <dt className="inline text-charcoal/70">{t.shippingUi.recipient} </dt>
            <dd className="inline">{s.full_name}</dd>
          </div>
        )}
        {s.phone && (
          <div>
            <dt className="inline text-charcoal/70">{t.shippingUi.phone} </dt>
            <dd className="inline" dir="ltr">
              {s.phone}
            </dd>
          </div>
        )}
        {regionLabel && (
          <div>
            <dt className="inline text-charcoal/70">{t.shippingUi.region} </dt>
            <dd className="inline">
              {regionLabel}
              {s.region_configured === false || s.fee_pending ? (
                <span className="mr-2 text-xs text-amber-700">
                  {t.shippingUi.regionUnconfigured}
                </span>
              ) : null}
            </dd>
          </div>
        )}
        {s.city && (
          <div>
            <dt className="inline text-charcoal/70">{t.shippingUi.city} </dt>
            <dd className="inline">{s.city}</dd>
          </div>
        )}
        {s.neighborhood && (
          <div>
            <dt className="inline text-charcoal/70">{t.shippingUi.neighborhood} </dt>
            <dd className="inline">{s.neighborhood}</dd>
          </div>
        )}
        {s.building_number && (
          <div>
            <dt className="inline text-charcoal/70">{t.shippingUi.building} </dt>
            <dd className="inline">{s.building_number}</dd>
          </div>
        )}
        {s.address && (
          <div>
            <dt className="inline text-charcoal/70">{t.shippingUi.address} </dt>
            <dd className="inline whitespace-pre-wrap">{s.address}</dd>
          </div>
        )}
        {s.postal_code && (
          <div>
            <dt className="inline text-charcoal/70">{t.shippingUi.postal} </dt>
            <dd className="inline" dir="ltr">
              {s.postal_code}
            </dd>
          </div>
        )}
        {s.notes && (
          <div>
            <dt className="inline text-charcoal/70">{t.shippingUi.deliveryNotes} </dt>
            <dd className="inline whitespace-pre-wrap">{s.notes}</dd>
          </div>
        )}
        {s.estimated_delivery && (
          <div>
            <dt className="inline text-charcoal/70">{t.shippingUi.eta} </dt>
            <dd className="inline">{s.estimated_delivery}</dd>
          </div>
        )}
        {s.carrier_code && (
          <div>
            <dt className="inline text-charcoal/70">{t.shippingUi.carrier} </dt>
            <dd className="inline" dir="ltr">
              {s.carrier_code}
            </dd>
          </div>
        )}
        {s.tracking_number && (
          <div>
            <dt className="inline text-charcoal/70">{t.shippingUi.tracking} </dt>
            <dd className="inline" dir="ltr">
              {s.tracking_url ? (
                <a
                  href={s.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold underline"
                >
                  {s.tracking_number}
                </a>
              ) : (
                s.tracking_number
              )}
            </dd>
          </div>
        )}
        {s.fee_pending ? (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
            <dt className="inline font-medium">{t.shippingUi.shippingFee} </dt>
            <dd className="inline">{t.shippingUi.feePending}</dd>
            <p className="mt-1 text-xs">{t.shippingUi.feePendingHint}</p>
          </div>
        ) : (typeof s.cost === "number" && s.cost > 0) ||
          (showZeroCost &&
            (s.required || s.delivery_method === "delivery")) ? (
          <div>
            <dt className="inline text-charcoal/70">{t.shippingUi.shippingFee} </dt>
            <dd className="inline text-gold" dir="ltr">
              {typeof s.cost === "number" && s.cost > 0
                ? formatPrice(s.cost)
                : t.shippingUi.free}
            </dd>
          </div>
        ) : null}
        {showInternalNotes && s.internal_notes && (
          <div className="mt-2 rounded-lg border border-dashed border-beige-dark bg-beige/30 px-3 py-2">
            <dt className="text-xs font-medium text-charcoal/70">
              {t.shippingUi.internalNotes}
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-charcoal">
              {s.internal_notes}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export function orderToShippingDisplay(
  order: {
    shipping_required?: boolean | null;
    delivery_method?: DeliveryMethod | null;
    shipping_full_name?: string | null;
    shipping_phone?: string | null;
    shipping_city?: string | null;
    shipping_region?: string | null;
    shipping_region_name_ar?: string | null;
    shipping_region_custom?: string | null;
    shipping_address?: string | null;
    shipping_building_number?: string | null;
    shipping_neighborhood?: string | null;
    shipping_postal_code?: string | null;
    shipping_notes?: string | null;
    shipping_cost?: number | null;
    shipping_fee_pending?: boolean | null;
    region_configured?: boolean | null;
    tracking_number?: string | null;
    tracking_url?: string | null;
    internal_shipping_notes?: string | null;
    carrier_code?: string | null;
    estimated_delivery?: string | null;
  },
  region?: Pick<
    ShippingRegion,
    | "estimated_delivery_ar"
    | "estimated_days_min"
    | "estimated_days_max"
    | "estimated_days"
  > | null
): ShippingDisplay {
  return {
    required:
      order.shipping_required === true ||
      order.delivery_method === "delivery" ||
      order.delivery_method === "pickup",
    delivery_method: order.delivery_method ?? null,
    full_name: order.shipping_full_name ?? null,
    phone: order.shipping_phone ?? null,
    city: order.shipping_city ?? null,
    region: order.shipping_region ?? null,
    region_name_ar: order.shipping_region_name_ar ?? null,
    region_custom: order.shipping_region_custom ?? null,
    address: order.shipping_address ?? null,
    building_number: order.shipping_building_number ?? null,
    neighborhood: order.shipping_neighborhood ?? null,
    postal_code: order.shipping_postal_code ?? null,
    notes: order.shipping_notes ?? null,
    cost: order.shipping_cost ?? null,
    fee_pending: order.shipping_fee_pending ?? false,
    region_configured: order.region_configured ?? true,
    tracking_number: order.tracking_number ?? null,
    tracking_url: order.tracking_url ?? null,
    estimated_delivery:
      formatEstimatedDelivery(region) || order.estimated_delivery || null,
    carrier_code: order.carrier_code ?? null,
    internal_notes: order.internal_shipping_notes ?? null,
  };
}
