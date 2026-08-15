"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NamedCount, TimePoint } from "@/lib/admin/dashboard-analytics";
import type { ReportsCharts } from "@/lib/admin/reports-types";
import { formatPrice } from "@/lib/utils";

const PIE_COLORS = [
  "var(--gold)",
  "var(--gold-dark)",
  "var(--charcoal)",
  "var(--gold-light)",
  "#8a7f72",
  "#c4b09a",
];

function ChartCard({
  title,
  empty,
  children,
}: {
  title: string;
  empty?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-beige-dark bg-background p-5 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-foreground">{title}</h3>
      {empty ? (
        <p className="flex h-52 items-center justify-center text-sm text-muted">
          لا توجد بيانات لهذه الفترة
        </p>
      ) : (
        <div className="h-52 w-full" dir="ltr">
          {children}
        </div>
      )}
    </section>
  );
}

function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-beige-dark bg-background px-3 py-2 text-xs shadow-sm">
      <p className="text-muted">{label}</p>
      <p className="font-medium text-foreground" dir="ltr">
        {formatPrice(Number(payload[0]?.value ?? 0))}
      </p>
    </div>
  );
}

function CountTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-beige-dark bg-background px-3 py-2 text-xs shadow-sm">
      <p className="text-muted">{label ?? payload[0]?.name}</p>
      <p className="font-medium text-foreground">{payload[0]?.value ?? 0}</p>
    </div>
  );
}

function hasValues(points: TimePoint[]): boolean {
  return points.some((p) => (p.value ?? 0) > 0);
}

function hasCounts(rows: NamedCount[]): boolean {
  return rows.some((r) => (r.count ?? 0) > 0);
}

export function ReportCharts({
  charts,
  focus,
}: {
  charts: ReportsCharts;
  focus?:
    | "all"
    | "revenue"
    | "orders"
    | "bookings"
    | "products"
    | "shipping"
    | "categories"
    | "customers";
}) {
  const show = (key: NonNullable<typeof focus>) =>
    !focus || focus === "all" || focus === key;

  return (
    <div className="reports-chart-grid grid gap-4 lg:grid-cols-2">
      {show("revenue") ? (
        <ChartCard title="الإيرادات" empty={!hasValues(charts.revenue)}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={charts.revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--beige-dark)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <Tooltip content={<MoneyTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--gold)"
                fill="var(--gold)"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}

      {show("orders") ? (
        <ChartCard title="الطلبات" empty={!hasValues(charts.orders)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.orders}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--beige-dark)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <Tooltip content={<CountTooltip />} />
              <Bar dataKey="value" fill="var(--charcoal)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}

      {show("bookings") ? (
        <ChartCard title="الحجوزات" empty={!hasValues(charts.bookings)}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={charts.bookings}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--beige-dark)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <Tooltip content={<CountTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--gold-dark)"
                fill="var(--gold-dark)"
                fillOpacity={0.15}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}

      {show("products") ? (
        <ChartCard title="المنتجات" empty={!hasCounts(charts.products)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.products} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--beige-dark)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tick={{ fontSize: 10, fill: "var(--muted)" }}
              />
              <Tooltip content={<CountTooltip />} />
              <Bar dataKey="count" fill="var(--gold)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}

      {show("shipping") ? (
        <ChartCard title="الشحن" empty={!hasCounts(charts.shipping)}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={charts.shipping}
                dataKey="count"
                nameKey="name"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={3}
              >
                {charts.shipping.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CountTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}

      {show("categories") ? (
        <ChartCard title="التصنيفات" empty={!hasCounts(charts.categories)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.categories}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--beige-dark)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <Tooltip content={<CountTooltip />} />
              <Bar dataKey="count" fill="var(--gold-dark)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}

      {show("customers") ? (
        <ChartCard title="العملاء النشطون" empty={!hasValues(charts.customers)}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={charts.customers}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--beige-dark)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <Tooltip content={<CountTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--charcoal)"
                fill="var(--beige)"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}
    </div>
  );
}
