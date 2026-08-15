"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { useLocale } from "@/components/i18n/LocaleProvider";

type GuestRow = {
  id: string;
  guest_id: string;
  created_at: string;
  last_seen: string;
  language: string | null;
  country: string | null;
  device: string | null;
  converted_to_customer_id: string | null;
  counts: {
    orders: number;
    bookings: number;
    wishlist: number;
    cart_items: number;
  };
};

type Kpis = {
  total_guests: number;
  returning_guests: number;
  registered_customers: number;
  conversion_rate: number;
  converted_guests: number;
  abandoned_guest_carts: number;
  most_wishlisted: { title: string; count: number }[];
  most_viewed: { title: string; count: number }[];
};

export default function AdminGuestsPage() {
  const { t, dir } = useLocale();
  const g = t.admin.guestsUi;
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ filter, limit: "80" });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/guests?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || g.loadFailed);
      setGuests(data.guests ?? []);
      setKpis(data.kpis ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : g.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [filter, q, g.loadFailed]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-8" dir={dir}>
      <div>
        <h1 className="font-[family-name:var(--font-amiri)] text-3xl text-charcoal">
          {g.title}
        </h1>
        <p className="mt-2 text-sm text-muted">{g.subtitle}</p>
      </div>

      {kpis && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            { label: g.kpiTotalGuests, value: kpis.total_guests },
            { label: g.kpiReturningGuests, value: kpis.returning_guests },
            {
              label: g.kpiRegisteredCustomers,
              value: kpis.registered_customers,
            },
            { label: g.kpiConversionRate, value: kpis.conversion_rate },
            { label: g.kpiConvertedGuests, value: kpis.converted_guests },
            {
              label: g.kpiAbandonedCarts,
              value: kpis.abandoned_guest_carts,
            },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-2xl border border-beige-dark bg-white p-4 shadow-sm"
            >
              <p className="text-xs text-muted">{k.label}</p>
              <p className="mt-2 font-[family-name:var(--font-cormorant)] text-2xl text-gold">
                {k.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {kpis && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-beige-dark bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-charcoal">
              {g.mostWishlisted}
            </h2>
            <ul className="space-y-2 text-sm">
              {kpis.most_wishlisted.length === 0 && (
                <li className="text-muted">{g.noDataYet}</li>
              )}
              {kpis.most_wishlisted.map((item) => (
                <li
                  key={item.title + item.count}
                  className="flex justify-between gap-3"
                >
                  <span className="truncate">{item.title}</span>
                  <span className="text-gold">{item.count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-beige-dark bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-charcoal">
              {g.mostViewed}
            </h2>
            <ul className="space-y-2 text-sm">
              {kpis.most_viewed.length === 0 && (
                <li className="text-muted">{g.noDataYet}</li>
              )}
              {kpis.most_viewed.map((item) => (
                <li
                  key={item.title + item.count}
                  className="flex justify-between gap-3"
                >
                  <span className="truncate">{item.title}</span>
                  <span className="text-gold">{item.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-beige-dark bg-white px-3 py-2 text-sm"
        >
          <option value="all">{g.filterAll}</option>
          <option value="active">{g.filterActive}</option>
          <option value="converted">{g.filterConverted}</option>
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={g.searchPlaceholder}
          className="min-w-[200px] flex-1 rounded-xl border border-beige-dark bg-white px-3 py-2 text-sm"
          dir="ltr"
        />
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl bg-gold px-4 py-2 text-sm font-medium text-white"
        >
          {g.refresh}
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-beige-dark bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-beige-dark bg-beige/40 text-muted">
            <tr>
              <th className="px-4 py-3 text-start font-medium">guest_id</th>
              <th className="px-4 py-3 text-start font-medium">{g.colLastSeen}</th>
              <th className="px-4 py-3 text-start font-medium">{g.colCreated}</th>
              <th className="px-4 py-3 text-start font-medium">{g.colOrders}</th>
              <th className="px-4 py-3 text-start font-medium">{g.colBookings}</th>
              <th className="px-4 py-3 text-start font-medium">{g.colWishlist}</th>
              <th className="px-4 py-3 text-start font-medium">{g.colCart}</th>
              <th className="px-4 py-3 text-start font-medium">{g.colStatus}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  {g.loading}
                </td>
              </tr>
            )}
            {!loading && guests.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  {g.empty}
                </td>
              </tr>
            )}
            {guests.map((row) => (
              <tr
                key={row.id}
                className="border-b border-beige-dark/60 last:border-0"
              >
                <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                  {row.guest_id.slice(0, 8)}…
                </td>
                <td className="px-4 py-3">{formatDate(row.last_seen)}</td>
                <td className="px-4 py-3">{formatDate(row.created_at)}</td>
                <td className="px-4 py-3">{row.counts.orders}</td>
                <td className="px-4 py-3">{row.counts.bookings}</td>
                <td className="px-4 py-3">{row.counts.wishlist}</td>
                <td className="px-4 py-3">{row.counts.cart_items}</td>
                <td className="px-4 py-3">
                  {row.converted_to_customer_id ? (
                    <Link
                      href={`/admin/customers/${row.converted_to_customer_id}`}
                      className="text-gold hover:underline"
                    >
                      {g.statusConverted}
                    </Link>
                  ) : (
                    <span className="text-muted">{g.statusGuest}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
