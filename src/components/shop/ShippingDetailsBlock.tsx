import { formatPrice } from "@/lib/utils";
import {
  DELIVERY_METHOD_LABELS,
  type DeliveryMethod,
} from "@/types/shop";

export type ShippingDisplay = {
  required?: boolean | null;
  delivery_method?: DeliveryMethod | null;
  full_name?: string | null;
  phone?: string | null;
  city?: string | null;
  region?: string | null;
  region_name_ar?: string | null;
  address?: string | null;
  building_number?: string | null;
  neighborhood?: string | null;
  postal_code?: string | null;
  notes?: string | null;
  cost?: number | null;
};

/** Safe for legacy orders with no shipping columns. */
export function hasShippingDetails(s?: ShippingDisplay | null): boolean {
  if (!s) return false;
  if (s.required === false && !s.delivery_method) return false;
  return Boolean(
    s.delivery_method ||
      s.full_name ||
      s.phone ||
      s.city ||
      s.region ||
      s.region_name_ar ||
      s.address ||
      s.postal_code ||
      s.notes ||
      (typeof s.cost === "number" && s.cost > 0)
  );
}

export function ShippingDetailsBlock({
  shipping,
  title = "عنوان التوصيل",
  className,
  showZeroCost = false,
}: {
  shipping?: ShippingDisplay | null;
  title?: string;
  className?: string;
  showZeroCost?: boolean;
}) {
  if (!hasShippingDetails(shipping) && !showZeroCost) return null;
  if (!shipping) return null;
  const s = shipping;
  const method = s.delivery_method;
  const isPickup = method === "pickup";

  if (isPickup) {
    return (
      <div className={className}>
        <h3 className="text-sm font-semibold text-charcoal">{title}</h3>
        <dl className="mt-2 space-y-1 text-sm text-muted">
          <div>
            <dt className="inline text-charcoal/70">طريقة الاستلام: </dt>
            <dd className="inline">{DELIVERY_METHOD_LABELS.pickup}</dd>
          </div>
          <p className="mt-2 text-sm text-charcoal/80">
            سيتم إشعارك عند جاهزية طلبك للاستلام من البوتيك.
          </p>
          {(typeof s.cost === "number" && s.cost > 0) || showZeroCost ? (
            <div>
              <dt className="inline text-charcoal/70">رسوم الشحن: </dt>
              <dd className="inline text-gold" dir="ltr">
                مجاني
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    );
  }

  const regionLabel = s.region_name_ar || s.region;
  const hasAddress = Boolean(
    s.full_name || s.phone || s.city || regionLabel || s.address
  );
  if (!hasAddress && !showZeroCost && !method) return null;

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-charcoal">{title}</h3>
      <dl className="mt-2 space-y-1 text-sm text-muted">
        {method && (
          <div>
            <dt className="inline text-charcoal/70">طريقة الاستلام: </dt>
            <dd className="inline">{DELIVERY_METHOD_LABELS[method]}</dd>
          </div>
        )}
        {s.full_name && (
          <div>
            <dt className="inline text-charcoal/70">المستلم: </dt>
            <dd className="inline">{s.full_name}</dd>
          </div>
        )}
        {s.phone && (
          <div>
            <dt className="inline text-charcoal/70">الهاتف: </dt>
            <dd className="inline" dir="ltr">
              {s.phone}
            </dd>
          </div>
        )}
        {regionLabel && (
          <div>
            <dt className="inline text-charcoal/70">المنطقة: </dt>
            <dd className="inline">{regionLabel}</dd>
          </div>
        )}
        {s.city && (
          <div>
            <dt className="inline text-charcoal/70">المدينة: </dt>
            <dd className="inline">{s.city}</dd>
          </div>
        )}
        {s.neighborhood && (
          <div>
            <dt className="inline text-charcoal/70">الحي: </dt>
            <dd className="inline">{s.neighborhood}</dd>
          </div>
        )}
        {s.building_number && (
          <div>
            <dt className="inline text-charcoal/70">رقم المبنى: </dt>
            <dd className="inline">{s.building_number}</dd>
          </div>
        )}
        {s.address && (
          <div>
            <dt className="inline text-charcoal/70">العنوان: </dt>
            <dd className="inline whitespace-pre-wrap">{s.address}</dd>
          </div>
        )}
        {s.postal_code && (
          <div>
            <dt className="inline text-charcoal/70">الرمز البريدي: </dt>
            <dd className="inline" dir="ltr">
              {s.postal_code}
            </dd>
          </div>
        )}
        {s.notes && (
          <div>
            <dt className="inline text-charcoal/70">ملاحظات التوصيل: </dt>
            <dd className="inline whitespace-pre-wrap">{s.notes}</dd>
          </div>
        )}
        {(typeof s.cost === "number" && s.cost > 0) ||
        (showZeroCost && s.required) ? (
          <div>
            <dt className="inline text-charcoal/70">رسوم الشحن: </dt>
            <dd className="inline text-gold" dir="ltr">
              {typeof s.cost === "number" && s.cost > 0
                ? formatPrice(s.cost)
                : "مجاني"}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

export function orderToShippingDisplay(order: {
  shipping_required?: boolean | null;
  delivery_method?: DeliveryMethod | null;
  shipping_full_name?: string | null;
  shipping_phone?: string | null;
  shipping_city?: string | null;
  shipping_region?: string | null;
  shipping_region_name_ar?: string | null;
  shipping_address?: string | null;
  shipping_building_number?: string | null;
  shipping_neighborhood?: string | null;
  shipping_postal_code?: string | null;
  shipping_notes?: string | null;
  shipping_cost?: number | null;
}): ShippingDisplay {
  return {
    required: order.shipping_required ?? false,
    delivery_method: order.delivery_method ?? null,
    full_name: order.shipping_full_name ?? null,
    phone: order.shipping_phone ?? null,
    city: order.shipping_city ?? null,
    region: order.shipping_region ?? null,
    region_name_ar: order.shipping_region_name_ar ?? null,
    address: order.shipping_address ?? null,
    building_number: order.shipping_building_number ?? null,
    neighborhood: order.shipping_neighborhood ?? null,
    postal_code: order.shipping_postal_code ?? null,
    notes: order.shipping_notes ?? null,
    cost: order.shipping_cost ?? null,
  };
}
