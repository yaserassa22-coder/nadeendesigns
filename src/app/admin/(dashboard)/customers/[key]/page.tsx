"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

type Detail = {
  customer_key: string;
  customer: Record<string, unknown> | null;
  overlay: Record<string, unknown> | null;
  orders: Record<string, unknown>[];
  appointments: Record<string, unknown>[];
  wishlist: unknown[];
  designs: unknown[];
  messages: unknown[];
  reviews: unknown[];
  login_history: Record<string, unknown>[];
  stats: {
    orders_count: number;
    total_spent: number;
    aov: number;
    last_login: string | null;
    login_count: number;
  };
};

export default function AdminCustomerDetailPage() {
  const params = useParams();
  const key = decodeURIComponent(String(params.key || ""));
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!key) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/admin/customers/${encodeURIComponent(key)}`)
        .then(async (r) => {
          const j = await r.json();
          if (!r.ok) throw new Error(j.error || "فشل التحميل");
          setData(j as Detail);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "فشل"))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [key]);

  if (loading) {
    return <div className="h-48 animate-pulse rounded-2xl bg-beige" />;
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        {error}
      </div>
    );
  }
  if (!data) return null;

  const name =
    (data.customer?.full_name as string) ||
    (data.overlay?.display_name as string) ||
    data.customer_key;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/customers" className="text-sm text-muted hover:text-gold">
            ← العملاء
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-charcoal">{name}</h1>
          <p className="text-xs text-muted" dir="ltr">
            {data.customer_key}
          </p>
          <p className="mt-2">
            <span
              className={
                data.customer?.auth_user_id || data.customer?.is_guest === false
                  ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-800"
                  : "inline-flex rounded-full border border-beige-dark bg-beige/60 px-3 py-1 text-xs text-muted"
              }
            >
              نوع العميلة:{" "}
              {data.customer?.auth_user_id || data.customer?.is_guest === false
                ? "Registered"
                : "Guest"}
            </span>
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          تحديث
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="الطلبات" value={String(data.stats.orders_count)} />
        <Stat
          label="إجمالي الإنفاق"
          value={`${Math.round(data.stats.total_spent)} ₪`}
        />
        <Stat label="متوسط الطلب" value={`${Math.round(data.stats.aov)} ₪`} />
        <Stat
          label="آخر دخول"
          value={
            data.stats.last_login
              ? new Date(data.stats.last_login).toLocaleString("ar")
              : "—"
          }
        />
      </div>

      <Section title="الملف">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <Row label="هاتف" value={String(data.customer?.phone || data.overlay?.phone || "—")} />
          <Row label="بريد" value={String(data.customer?.email || data.overlay?.email || "—")} />
          <Row
            label="نوع العميلة"
            value={
              data.customer?.auth_user_id || data.customer?.is_guest === false
                ? "Registered"
                : "Guest"
            }
          />
          <Row label="عدد مرات الدخول" value={String(data.stats.login_count ?? data.customer?.login_count ?? 0)} />
          <Row label="نقاط (ولاء)" value={String(data.customer?.reward_points ?? 0)} />
          <Row label="VIP" value={String(data.customer?.vip_tier ?? "standard")} />
          <Row label="رصيد متجر" value={String(data.customer?.store_credit ?? 0)} />
          <Row label="إحالة" value={String(data.customer?.referral_code ?? "—")} />
        </dl>
      </Section>

      <Section title={`الطلبات (${data.orders.length})`}>
        <ul className="space-y-2 text-sm">
          {data.orders.slice(0, 15).map((o) => (
            <li key={String(o.id)} className="flex justify-between border-b border-beige-dark/50 py-2">
              <Link href={`/admin/orders/${o.id}`} className="text-gold hover:underline" dir="ltr">
                #{String(o.id).slice(0, 8)}
              </Link>
              <span>
                {String(o.status || "")} · {String(o.total ?? "")} ₪
              </span>
            </li>
          ))}
          {!data.orders.length && <p className="text-muted">لا طلبات</p>}
        </ul>
      </Section>

      <Section title={`المواعيد (${data.appointments.length})`}>
        <ul className="space-y-2 text-sm">
          {data.appointments.slice(0, 10).map((a) => (
            <li key={String(a.id)} className="border-b border-beige-dark/50 py-2">
              {String(a.service_type || "موعد")} · {String(a.status || "")} ·{" "}
              {String(a.preferred_date || "")}
            </li>
          ))}
          {!data.appointments.length && <p className="text-muted">لا مواعيد</p>}
        </ul>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={`الأمنيات (${data.wishlist.length})`}>
          <p className="text-sm text-muted">{data.wishlist.length} عنصر</p>
        </Section>
        <Section title={`التصاميم (${data.designs.length})`}>
          <p className="text-sm text-muted">{data.designs.length} تصميم</p>
        </Section>
        <Section title={`الرسائل (${data.messages.length})`}>
          <p className="text-sm text-muted">{data.messages.length} رسالة</p>
        </Section>
        <Section title={`المراجعات (${data.reviews.length})`}>
          <p className="text-sm text-muted">{data.reviews.length} مراجعة</p>
        </Section>
      </div>

      <Section title="سجل الدخول">
        <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
          {data.login_history.map((h) => (
            <li key={String(h.id)} className="flex justify-between border-b border-beige-dark/40 py-1.5">
              <span>
                {String(h.method)} · {h.success ? "نجاح" : "فشل"}
              </span>
              <span className="text-xs text-muted" dir="ltr">
                {h.created_at
                  ? new Date(String(h.created_at)).toLocaleString("ar")
                  : ""}
              </span>
            </li>
          ))}
          {!data.login_history.length && (
            <p className="text-muted">لا سجل دخول بعد (يتطلب حساب عميل مسجّل).</p>
          )}
        </ul>
      </Section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-beige-dark bg-white px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-charcoal">{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-beige-dark bg-white p-5">
      <h2 className="mb-3 text-lg font-semibold text-charcoal">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-beige-dark/40 py-1.5">
      <dt className="text-muted">{label}</dt>
      <dd dir="auto">{value}</dd>
    </div>
  );
}
