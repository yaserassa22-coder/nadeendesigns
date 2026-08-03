"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  BarChart3,
  CalendarDays,
  Download,
  Mail,
  Printer,
  TrendingDown,
  TrendingUp,
  Wallet,
  Minus,
} from "lucide-react";
import {
  DATE_RANGE_PRESETS,
  type DateRangePreset,
} from "@/lib/admin/dashboard-analytics";
import {
  REPORT_SECTIONS,
  type ReportEmailPreset,
  type ReportSection,
  type ReportsPayload,
} from "@/lib/admin/reports-types";
import { ReportCharts } from "@/components/admin/reports/ReportCharts";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SITE_NAME, DEFAULT_SETTINGS } from "@/lib/constants";
import { formatPrice, cn } from "@/lib/utils";
import "./reports-print.css";

export type ReportsApiResponse = Omit<
  ReportsPayload,
  "range" | "previousRange"
> & {
  range: { preset: DateRangePreset; from: string; to: string };
  previousRange: { preset: DateRangePreset; from: string; to: string };
  error?: string;
};

type FiltersState = {
  preset: DateRangePreset;
  from: string;
  to: string;
  category: string;
  product: string;
  shippingRegion: string;
  deliveryMethod: string;
  orderStatus: string;
  bookingStatus: string;
  customer: string;
};

function toFiltersState(data: ReportsApiResponse): FiltersState {
  return {
    preset: data.range.preset,
    from: data.range.from.slice(0, 10),
    to: data.range.to.slice(0, 10),
    category: data.filters.category ?? "",
    product: data.filters.product ?? "",
    shippingRegion: data.filters.shippingRegion ?? "",
    deliveryMethod: data.filters.deliveryMethod ?? "",
    orderStatus: data.filters.orderStatus ?? "",
    bookingStatus: data.filters.bookingStatus ?? "",
    customer: data.filters.customer ?? "",
  };
}

function buildQuery(filters: FiltersState, section: ReportSection): string {
  const sp = new URLSearchParams();
  sp.set("range", filters.preset);
  if (filters.preset === "custom") {
    if (filters.from) sp.set("from", filters.from);
    if (filters.to) sp.set("to", filters.to);
  }
  if (filters.category) sp.set("category", filters.category);
  if (filters.product) sp.set("product", filters.product);
  if (filters.shippingRegion) sp.set("shippingRegion", filters.shippingRegion);
  if (filters.deliveryMethod) sp.set("deliveryMethod", filters.deliveryMethod);
  if (filters.orderStatus) sp.set("orderStatus", filters.orderStatus);
  if (filters.bookingStatus) sp.set("bookingStatus", filters.bookingStatus);
  if (filters.customer) sp.set("customer", filters.customer);
  sp.set("section", section);
  return sp.toString();
}

function Kpi({
  title,
  value,
  hint,
}: {
  title: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-beige-dark bg-background p-4 shadow-sm print:break-inside-avoid">
      <p className="text-sm text-muted">{title}</p>
      <p className="mt-2 font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-beige-dark bg-background p-5 shadow-sm print:break-inside-avoid">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function InsightToneIcon({ tone }: { tone: string }) {
  if (tone === "up") return <TrendingUp className="h-4 w-4 text-emerald-700" />;
  if (tone === "down") return <TrendingDown className="h-4 w-4 text-red-600" />;
  return <Minus className="h-4 w-4 text-muted" />;
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<string | number>>;
}) {
  if (!rows.length) {
    return <p className="py-6 text-center text-sm text-muted">لا توجد بيانات</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-beige-dark text-muted">
            {headers.map((h) => (
              <th key={h} className="px-2 py-2 text-start font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-beige-dark/60">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-2 text-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportsCenter({ initialData }: { initialData: ReportsApiResponse }) {
  const [data, setData] = useState(initialData);
  const [section, setSection] = useState<ReportSection>("overview");
  const [filters, setFilters] = useState<FiltersState>(() =>
    toFiltersState(initialData)
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailPreset, setEmailPreset] = useState<ReportEmailPreset>("weekly");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [scheduleEmail, setScheduleEmail] = useState("");
  const [scheduleFreq, setScheduleFreq] = useState<"daily" | "weekly" | "monthly">(
    "weekly"
  );
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null);

  const visibleSections = useMemo(
    () =>
      REPORT_SECTIONS.filter(
        (s) => !s.financial || data.permissions.canViewFinancial
      ),
    [data.permissions.canViewFinancial]
  );

  const reload = useCallback(
    (nextFilters: FiltersState, nextSection: ReportSection) => {
      startTransition(async () => {
        setError(null);
        try {
          const res = await fetch(
            `/api/admin/reports?${buildQuery(nextFilters, nextSection)}`,
            { cache: "no-store" }
          );
          const json = (await res.json()) as ReportsApiResponse;
          if (!res.ok) {
            setError(json.error || "تعذر تحميل التقارير");
            return;
          }
          setData(json);
        } catch (e) {
          setError(e instanceof Error ? e.message : "تعذر تحميل التقارير");
        }
      });
    },
    []
  );

  const applyFilters = () => reload(filters, section);

  const changeSection = (id: ReportSection) => {
    setSection(id);
    reload(filters, id);
  };

  const exportReport = (format: "csv" | "xlsx" | "pdf") => {
    if (section === "financial" && !data.permissions.canExportFinancial) {
      setError("غير مصرح بتصدير التقارير المالية");
      return;
    }
    const href = `/api/admin/reports/export?${buildQuery(filters, section)}&format=${format}`;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const printReport = async () => {
    try {
      await fetch("/api/admin/reports/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, preset: filters.preset }),
      });
    } catch {
      /* ignore */
    }
    window.print();
  };

  const sendEmail = async () => {
    setEmailBusy(true);
    setEmailMsg(null);
    try {
      const res = await fetch("/api/admin/reports/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailTo,
          emailPreset,
          section,
          filters: {
            preset: filters.preset,
            from: filters.from,
            to: filters.to,
            category: filters.category || null,
            product: filters.product || null,
            shippingRegion: filters.shippingRegion || null,
            deliveryMethod: filters.deliveryMethod || null,
            orderStatus: filters.orderStatus || null,
            bookingStatus: filters.bookingStatus || null,
            customer: filters.customer || null,
          },
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setEmailMsg(json.error || "فشل الإرسال");
        return;
      }
      setEmailMsg("تم إرسال التقرير بنجاح");
    } catch (e) {
      setEmailMsg(e instanceof Error ? e.message : "فشل الإرسال");
    } finally {
      setEmailBusy(false);
    }
  };

  const saveSchedule = async () => {
    setScheduleMsg(null);
    try {
      const res = await fetch("/api/admin/reports/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frequency: scheduleFreq,
          report_type: section,
          email: scheduleEmail,
          filters: {
            preset: filters.preset,
            category: filters.category || null,
          },
          enabled: true,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        note?: string;
      };
      if (!res.ok) {
        setScheduleMsg(json.error || "فشل الحفظ");
        return;
      }
      setScheduleMsg(
        json.note ||
          "تم حفظ الجدول (مستقبلي — لن يُرسل تلقائياً حتى يتوفر المشغّل)."
      );
    } catch (e) {
      setScheduleMsg(e instanceof Error ? e.message : "فشل الحفظ");
    }
  };

  const chartFocus =
    section === "sales"
      ? "revenue"
      : section === "bookings"
        ? "bookings"
        : section === "products"
          ? "products"
          : section === "categories"
            ? "categories"
            : section === "customers"
              ? "customers"
              : section === "shipping"
                ? "shipping"
                : section === "financial"
                  ? "revenue"
                  : "all";

  return (
    <div className="reports-print-root space-y-6" dir="rtl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:block">
        <div>
          <p className="text-sm text-gold">{SITE_NAME}</p>
          <h1 className="mt-1 font-[family-name:var(--font-cormorant)] text-3xl font-semibold tracking-wide text-foreground">
            مركز التقارير
          </h1>
          <p className="mt-2 text-sm text-muted">
            تحليلات للقراءة فقط · الفترة:{" "}
            {new Date(data.range.from).toLocaleDateString("ar-SA")} —{" "}
            {new Date(data.range.to).toLocaleDateString("ar-SA")}
          </p>
          <p className="mt-1 hidden text-xs text-muted print:block">
            {DEFAULT_SETTINGS.email} · {DEFAULT_SETTINGS.phone} ·{" "}
            {DEFAULT_SETTINGS.address_ar}
            <br />
            تاريخ الإنشاء: {new Date().toLocaleString("ar-SA")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button type="button" variant="outline" size="sm" onClick={printReport}>
            <Printer className="ms-1 h-4 w-4" />
            طباعة
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => exportReport("csv")}>
            <Download className="ms-1 h-4 w-4" />
            CSV
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => exportReport("xlsx")}>
            Excel
          </Button>
          <Button type="button" size="sm" onClick={() => exportReport("pdf")}>
            PDF
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 print:hidden">
        {visibleSections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => changeSection(s.id)}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              section === s.id
                ? "bg-gold text-white"
                : "border border-beige-dark bg-background text-foreground hover:bg-beige"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <Panel title="الفلاتر" action={<CalendarDays className="h-4 w-4 text-gold print:hidden" />}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 print:hidden">
          <label className="block text-sm">
            <span className="mb-1 block text-muted">الفترة</span>
            <select
              className="w-full rounded-xl border border-beige-dark bg-background px-3 py-2"
              value={filters.preset}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  preset: e.target.value as DateRangePreset,
                }))
              }
            >
              {DATE_RANGE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          {filters.preset === "custom" ? (
            <>
              <Input
                label="من"
                type="date"
                value={filters.from}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, from: e.target.value }))
                }
              />
              <Input
                label="إلى"
                type="date"
                value={filters.to}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, to: e.target.value }))
                }
              />
            </>
          ) : null}
          <label className="block text-sm">
            <span className="mb-1 block text-muted">التصنيف</span>
            <select
              className="w-full rounded-xl border border-beige-dark bg-background px-3 py-2"
              value={filters.category}
              onChange={(e) =>
                setFilters((f) => ({ ...f, category: e.target.value }))
              }
            >
              <option value="">الكل</option>
              {data.filterOptions.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">المنتج</span>
            <select
              className="w-full rounded-xl border border-beige-dark bg-background px-3 py-2"
              value={filters.product}
              onChange={(e) =>
                setFilters((f) => ({ ...f, product: e.target.value }))
              }
            >
              <option value="">الكل</option>
              {data.filterOptions.products.slice(0, 200).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">منطقة الشحن</span>
            <select
              className="w-full rounded-xl border border-beige-dark bg-background px-3 py-2"
              value={filters.shippingRegion}
              onChange={(e) =>
                setFilters((f) => ({ ...f, shippingRegion: e.target.value }))
              }
            >
              <option value="">الكل</option>
              {data.filterOptions.regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">طريقة الاستلام</span>
            <select
              className="w-full rounded-xl border border-beige-dark bg-background px-3 py-2"
              value={filters.deliveryMethod}
              onChange={(e) =>
                setFilters((f) => ({ ...f, deliveryMethod: e.target.value }))
              }
            >
              <option value="">الكل</option>
              <option value="delivery">توصيل</option>
              <option value="pickup">استلام من البوتيك</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">حالة الطلب</span>
            <select
              className="w-full rounded-xl border border-beige-dark bg-background px-3 py-2"
              value={filters.orderStatus}
              onChange={(e) =>
                setFilters((f) => ({ ...f, orderStatus: e.target.value }))
              }
            >
              <option value="">الكل</option>
              {data.filterOptions.orderStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">حالة الحجز</span>
            <select
              className="w-full rounded-xl border border-beige-dark bg-background px-3 py-2"
              value={filters.bookingStatus}
              onChange={(e) =>
                setFilters((f) => ({ ...f, bookingStatus: e.target.value }))
              }
            >
              <option value="">الكل</option>
              {data.filterOptions.bookingStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="عميل (اسم / جوال / بريد)"
            value={filters.customer}
            onChange={(e) =>
              setFilters((f) => ({ ...f, customer: e.target.value }))
            }
          />
          <div className="flex items-end">
            <Button type="button" onClick={applyFilters} disabled={pending} className="w-full">
              {pending ? "جاري التحديث..." : "تطبيق"}
            </Button>
          </div>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-red-600 print:hidden">{error}</p>
        ) : null}
        {(data.errors.orders || data.errors.bookings) && (
          <p className="mt-3 text-sm text-amber-800 print:hidden">
            {data.errors.orders || data.errors.bookings}
          </p>
        )}
      </Panel>

      {(section === "overview" || section === "sales" || section === "financial") && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi title="إجمالي الإيرادات" value={formatPrice(data.sales.totalRevenue)} />
          <Kpi title="صافي الإيرادات" value={formatPrice(data.sales.netRevenue)} />
          <Kpi title="عدد الطلبات" value={data.sales.ordersCount} />
          <Kpi title="متوسط قيمة الطلب" value={formatPrice(data.sales.aov)} />
          <Kpi title="منتجات مباعة" value={data.sales.productsSold} />
          <Kpi title="متوسط رسوم الشحن" value={formatPrice(data.sales.avgShippingFee)} />
          <Kpi title="متوسط الخصم" value={formatPrice(data.sales.avgDiscount)} />
          {data.financial ? (
            <Kpi
              title="طلبات معلّقة"
              value={data.financial.outstandingOrders}
              hint={formatPrice(data.financial.outstandingValue)}
            />
          ) : null}
        </div>
      )}

      {(section === "overview" || section === "bookings") && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi title="حجوزات جديدة" value={data.bookings.newCount} />
          <Kpi title="مؤكدة" value={data.bookings.confirmed} />
          <Kpi title="مكتملة" value={data.bookings.completed} />
          <Kpi title="ملغاة" value={data.bookings.cancelled} />
          <Kpi title="لم تحضر" value={data.bookings.noShows ?? 0} />
          <Kpi
            title="نسبة الإلغاء %"
            value={data.bookings.cancelRate ?? 0}
          />
          <Kpi
            title="نسبة عدم الحضور %"
            value={data.bookings.noShowRate ?? 0}
          />
          <Kpi
            title="إيرادات الحجوزات"
            value={formatPrice(data.bookings.bookingRevenue)}
            hint="مستقبلي — لا يوجد سعر للحجز بعد"
          />
        </div>
      )}

      {(section === "overview" || section === "customers") && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi title="عملاء جدد" value={data.customers.newCustomers} />
          <Kpi title="عملاء عائدون" value={data.customers.returningCustomers} />
          <Kpi title="متوسط الإنفاق" value={formatPrice(data.customers.avgSpend)} />
          <Kpi title="طلبات لكل عميل" value={data.customers.ordersPerCustomer} />
        </div>
      )}

      {(section === "overview" || section === "shipping") && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi title="توصيل" value={data.shipping.deliveryCount} />
          <Kpi title="استلام من البوتيك" value={data.shipping.pickupCount} />
          <Kpi title="متوسط تكلفة الشحن" value={formatPrice(data.shipping.avgShippingCost)} />
          <Kpi title="رسوم معلّقة" value={data.shipping.pendingShippingFees} />
          <Kpi
            title="متوسط وقت التوصيل"
            value={
              data.shipping.avgDeliveryTimeHours == null
                ? "—"
                : `${data.shipping.avgDeliveryTimeHours} س`
            }
            hint="مستقبلي — يحتاج طوابع حالات"
          />
        </div>
      )}

      {section === "financial" && data.financial ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi title="الإجمالي (Gross)" value={formatPrice(data.financial.gross)} />
          <Kpi title="الصافي (Net)" value={formatPrice(data.financial.net)} />
          <Kpi title="دخل الشحن" value={formatPrice(data.financial.shippingIncome)} />
          <Kpi title="خصومات ممنوحة" value={formatPrice(data.financial.discountsGiven)} />
          <Kpi
            title="المستردات"
            value={formatPrice(data.financial.refunds)}
            hint="مستقبلي"
          />
          <Kpi
            title="قيمة معلّقة"
            value={formatPrice(data.financial.outstandingValue)}
          />
        </div>
      ) : null}

      {(section === "overview" ||
        section === "insights" ||
        section === "sales") && (
        <Panel title="رؤى الأعمال" action={<BarChart3 className="h-4 w-4 text-gold" />}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.insights.map((insight) => (
              <div
                key={insight.id}
                className="rounded-xl border border-beige-dark/80 bg-beige/30 p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-medium text-foreground">{insight.title}</p>
                  <InsightToneIcon tone={insight.tone} />
                </div>
                <p className="text-sm leading-relaxed text-muted">{insight.body}</p>
                {insight.metric ? (
                  <p className="mt-2 text-sm font-semibold text-gold" dir="ltr">
                    {insight.metric}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Panel>
      )}

      <ReportCharts
        charts={data.charts}
        focus={chartFocus === "all" ? "all" : chartFocus}
      />

      {(section === "overview" || section === "products") && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="أفضل المنتجات مبيعاً">
            <SimpleTable
              headers={["المنتج", "الكمية", "الطلبات", "الإيرادات"]}
              rows={data.products.bestSelling.map((p) => [
                p.name,
                p.quantity,
                p.orders_count,
                formatPrice(p.revenue),
              ])}
            />
          </Panel>
          <Panel title="أقل المنتجات مبيعاً">
            <SimpleTable
              headers={["المنتج", "الكمية", "الإيرادات"]}
              rows={data.products.worstSelling.map((p) => [
                p.name,
                p.quantity,
                formatPrice(p.revenue),
              ])}
            />
          </Panel>
          <Panel title="لم تُطلب أبداً">
            <SimpleTable
              headers={["المنتج", "النوع"]}
              rows={data.products.neverOrdered.map((p) => [
                p.name,
                p.product_type,
              ])}
            />
          </Panel>
          <Panel title="أعلى إيراداً">
            <SimpleTable
              headers={["المنتج", "الإيرادات", "الكمية"]}
              rows={data.products.highestRevenue.map((p) => [
                p.name,
                formatPrice(p.revenue),
                p.quantity,
              ])}
            />
          </Panel>
          <Panel title="الأعلى مشاهدة">
            <p className="text-sm text-muted">
              مستقبلي — تتبّع المشاهدات غير مفعّل بعد.
            </p>
          </Panel>
        </div>
      )}

      {(section === "overview" || section === "categories") && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="أفضل التصنيفات">
            <SimpleTable
              headers={["التصنيف", "الكمية", "الإيرادات"]}
              rows={data.categories.bestSelling.map((c) => [
                c.name,
                c.quantity,
                formatPrice(c.revenue),
              ])}
            />
          </Panel>
          <Panel title="إيرادات التصنيفات">
            <SimpleTable
              headers={["التصنيف", "الطلبات", "الإيرادات"]}
              rows={data.categories.categoryRevenue.map((c) => [
                c.name,
                c.orders_count,
                formatPrice(c.revenue),
              ])}
            />
          </Panel>
        </div>
      )}

      {(section === "overview" || section === "customers") && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="أكثر العملاء طلباً">
            <SimpleTable
              headers={["الاسم", "الطلبات", "الإنفاق"]}
              rows={data.customers.topCustomers.map((c) => [
                c.name,
                c.orders,
                formatPrice(c.spend),
              ])}
            />
          </Panel>
          <Panel title="أعلى إنفاقاً">
            <SimpleTable
              headers={["الاسم", "الجوال", "الإنفاق"]}
              rows={data.customers.highestSpending.map((c) => [
                c.name,
                c.phone ?? "—",
                formatPrice(c.spend),
              ])}
            />
          </Panel>
        </div>
      )}

      {(section === "overview" || section === "bookings") && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="أكثر الخدمات طلباً">
            <SimpleTable
              headers={["الخدمة", "العدد"]}
              rows={data.bookings.mostRequestedServices.map((s) => [
                s.name,
                s.count,
              ])}
            />
          </Panel>
          <Panel title="الساعات الأكثر ازدحامًا">
            <SimpleTable
              headers={["الساعة", "العدد"]}
              rows={(data.bookings.busyHours ?? []).map((s) => [
                s.name,
                s.count,
              ])}
            />
          </Panel>
          <Panel title="الأيام الأكثر ازدحامًا">
            <SimpleTable
              headers={["اليوم", "العدد"]}
              rows={(data.bookings.busyDays ?? []).map((s) => [
                s.name,
                s.count,
              ])}
            />
          </Panel>
          <Panel title="حسب مصدر الحجز">
            <SimpleTable
              headers={["المصدر", "العدد"]}
              rows={(data.bookings.bySource ?? []).map((s) => [
                s.name,
                s.count,
              ])}
            />
          </Panel>
        </div>
      )}

      {(section === "overview" || section === "shipping") && (
        <Panel title="أكثر المناطق اختياراً">
          <SimpleTable
            headers={["المنطقة", "العدد"]}
            rows={data.shipping.mostSelectedRegions.map((r) => [
              r.name,
              r.count,
            ])}
          />
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-2 print:hidden">
        <Panel
          title="إرسال التقرير بالبريد"
          action={<Mail className="h-4 w-4 text-gold" />}
        >
          <div className="space-y-3">
            <Input
              label="البريد الإلكتروني"
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="name@example.com"
            />
            <label className="block text-sm">
              <span className="mb-1 block text-muted">قالب الفترة</span>
              <select
                className="w-full rounded-xl border border-beige-dark bg-background px-3 py-2"
                value={emailPreset}
                onChange={(e) =>
                  setEmailPreset(e.target.value as ReportEmailPreset)
                }
              >
                <option value="daily">يومي</option>
                <option value="weekly">أسبوعي</option>
                <option value="monthly">شهري</option>
                <option value="custom">حسب الفلاتر الحالية</option>
              </select>
            </label>
            <Button type="button" onClick={sendEmail} disabled={emailBusy}>
              {emailBusy ? "جاري الإرسال..." : "إرسال الآن"}
            </Button>
            {emailMsg ? (
              <p className="text-sm text-muted">{emailMsg}</p>
            ) : null}
          </div>
        </Panel>

        <Panel
          title="جدولة التقارير (مستقبلي)"
          action={<Wallet className="h-4 w-4 text-gold" />}
        >
          <p className="mb-3 text-sm text-muted">
            يُحفظ الجدول في قاعدة البيانات فقط. لن يُرسل تلقائياً حتى يتوفر مشغّل
            الجدولة (cron).
          </p>
          <div className="space-y-3">
            <Input
              label="البريد"
              type="email"
              value={scheduleEmail}
              onChange={(e) => setScheduleEmail(e.target.value)}
            />
            <label className="block text-sm">
              <span className="mb-1 block text-muted">التكرار</span>
              <select
                className="w-full rounded-xl border border-beige-dark bg-background px-3 py-2"
                value={scheduleFreq}
                onChange={(e) =>
                  setScheduleFreq(
                    e.target.value as "daily" | "weekly" | "monthly"
                  )
                }
              >
                <option value="daily">يومي</option>
                <option value="weekly">أسبوعي</option>
                <option value="monthly">شهري</option>
              </select>
            </label>
            <Button type="button" variant="outline" onClick={saveSchedule}>
              حفظ الجدول
            </Button>
            {scheduleMsg ? (
              <p className="text-sm text-muted">{scheduleMsg}</p>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}
