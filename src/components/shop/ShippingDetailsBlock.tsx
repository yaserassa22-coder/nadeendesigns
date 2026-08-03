import { formatPrice } from "@/lib/utils";

export type ShippingDisplay = {
  required?: boolean | null;
  full_name?: string | null;
  phone?: string | null;
  city?: string | null;
  region?: string | null;
  address?: string | null;
  postal_code?: string | null;
  notes?: string | null;
  cost?: number | null;
};

/** Safe for legacy orders with no shipping columns. */
export function hasShippingDetails(s?: ShippingDisplay | null): boolean {
  if (!s) return false;
  if (s.required === false) return false;
  return Boolean(
    s.full_name ||
      s.phone ||
      s.city ||
      s.region ||
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
}: {
  shipping?: ShippingDisplay | null;
  title?: string;
  className?: string;
}) {
  if (!hasShippingDetails(shipping)) return null;
  const s = shipping!;

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-charcoal">{title}</h3>
      <dl className="mt-2 space-y-1 text-sm text-muted">
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
        {(s.city || s.region) && (
          <div>
            <dt className="inline text-charcoal/70">المدينة / المنطقة: </dt>
            <dd className="inline">
              {[s.city, s.region].filter(Boolean).join(" — ")}
            </dd>
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
        {typeof s.cost === "number" && s.cost > 0 && (
          <div>
            <dt className="inline text-charcoal/70">رسوم الشحن: </dt>
            <dd className="inline text-gold" dir="ltr">
              {formatPrice(s.cost)}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export function orderToShippingDisplay(order: {
  shipping_required?: boolean | null;
  shipping_full_name?: string | null;
  shipping_phone?: string | null;
  shipping_city?: string | null;
  shipping_region?: string | null;
  shipping_address?: string | null;
  shipping_postal_code?: string | null;
  shipping_notes?: string | null;
  shipping_cost?: number | null;
}): ShippingDisplay {
  return {
    required: order.shipping_required ?? false,
    full_name: order.shipping_full_name ?? null,
    phone: order.shipping_phone ?? null,
    city: order.shipping_city ?? null,
    region: order.shipping_region ?? null,
    address: order.shipping_address ?? null,
    postal_code: order.shipping_postal_code ?? null,
    notes: order.shipping_notes ?? null,
    cost: order.shipping_cost ?? null,
  };
}
