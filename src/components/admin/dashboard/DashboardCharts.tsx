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
import type { DashboardCharts as ChartsData, NamedCount, TimePoint } from "@/lib/admin/dashboard-analytics";
import { formatPrice } from "@/lib/utils";

const GOLD = "var(--gold)";
const GOLD_DARK = "var(--gold-dark)";
const CHARCOAL = "var(--charcoal)";
const MUTED = "var(--muted)";
const BEIGE = "var(--beige)";
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

export function DashboardCharts({ charts }: { charts: ChartsData }) {
  const pieData = charts.deliveryVsPickup.map((r) => ({
    name: r.name,
    value: r.count,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="الإيرادات شهرياً"
        empty={!hasValues(charts.revenuePerMonth)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={charts.revenuePerMonth}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
                <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={BEIGE} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 11 }} />
            <YAxis tick={{ fill: MUTED, fontSize: 11 }} width={48} />
            <Tooltip content={<MoneyTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={GOLD_DARK}
              fill="url(#revFill)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="الطلبات يومياً" empty={!hasValues(charts.ordersPerDay)}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={charts.ordersPerDay}>
            <CartesianGrid stroke={BEIGE} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={{ fill: MUTED, fontSize: 11 }} width={32} />
            <Tooltip content={<CountTooltip />} />
            <Bar dataKey="value" fill={GOLD} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="الحجوزات شهرياً"
        empty={!hasValues(charts.bookingsPerMonth)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={charts.bookingsPerMonth}>
            <CartesianGrid stroke={BEIGE} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fill: MUTED, fontSize: 11 }} width={32} />
            <Tooltip content={<CountTooltip />} />
            <Bar dataKey="value" fill={CHARCOAL} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="توصيل مقابل الاستلام" empty={!hasCounts(charts.deliveryVsPickup)}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={48}
              outerRadius={78}
              paddingAngle={3}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CountTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="أكثر المنتجات طلباً"
        empty={!hasCounts(charts.mostOrderedProducts)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={charts.mostOrderedProducts}
            layout="vertical"
            margin={{ left: 8, right: 8 }}
          >
            <CartesianGrid stroke={BEIGE} strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} tick={{ fill: MUTED, fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              tick={{ fill: MUTED, fontSize: 10 }}
            />
            <Tooltip content={<CountTooltip />} />
            <Bar dataKey="count" fill={GOLD} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="أكثر التصنيفات طلباً"
        empty={!hasCounts(charts.mostOrderedCategories)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={charts.mostOrderedCategories}
            layout="vertical"
            margin={{ left: 8, right: 8 }}
          >
            <CartesianGrid stroke={BEIGE} strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} tick={{ fill: MUTED, fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              tick={{ fill: MUTED, fontSize: 10 }}
            />
            <Tooltip content={<CountTooltip />} />
            <Bar dataKey="count" fill={GOLD_DARK} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="أكثر مناطق الشحن طلباً"
        empty={!hasCounts(charts.mostRequestedRegions)}
        >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={charts.mostRequestedRegions}>
            <CartesianGrid stroke={BEIGE} strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fill: MUTED, fontSize: 11 }} width={32} />
            <Tooltip content={<CountTooltip />} />
            <Bar dataKey="count" fill={CHARCOAL} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
