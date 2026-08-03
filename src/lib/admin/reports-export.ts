/**
 * CSV / Excel / PDF builders for Report Center exports.
 */

import { rowsToCsv } from "@/lib/admin/csv-export";
import { SITE_NAME, DEFAULT_SETTINGS } from "@/lib/constants";
import type { ReportsPayload, ReportSection } from "@/lib/admin/reports-types";
import { formatPrice } from "@/lib/utils";

export type ExportTable = {
  title: string;
  headers: string[];
  rows: Array<Array<string | number>>;
};

function periodLabel(data: ReportsPayload): string {
  const from = data.range.from.toLocaleDateString("ar-SA");
  const to = data.range.to.toLocaleDateString("ar-SA");
  return `${from} — ${to}`;
}

function kpiRows(data: ReportsPayload): ExportTable {
  const rows: Array<Array<string | number>> = [
    ["إجمالي الإيرادات", data.sales.totalRevenue],
    ["صافي الإيرادات", data.sales.netRevenue],
    ["عدد الطلبات", data.sales.ordersCount],
    ["المنتجات المباعة", data.sales.productsSold],
    ["متوسط قيمة الطلب", data.sales.aov],
    ["متوسط رسوم الشحن", data.sales.avgShippingFee],
    ["متوسط الخصم", data.sales.avgDiscount],
    ["حجوزات جديدة", data.bookings.newCount],
    ["حجوزات مؤكدة", data.bookings.confirmed],
    ["حجوزات مكتملة", data.bookings.completed],
    ["حجوزات ملغاة", data.bookings.cancelled],
    ["عملاء جدد", data.customers.newCustomers],
    ["عملاء عائدون", data.customers.returningCustomers],
    ["توصيل", data.shipping.deliveryCount],
    ["استلام من البوتيك", data.shipping.pickupCount],
  ];
  if (data.financial) {
    rows.push(
      ["إجمالي مالي (Gross)", data.financial.gross],
      ["صافي مالي (Net)", data.financial.net],
      ["دخل الشحن", data.financial.shippingIncome],
      ["خصومات ممنوحة", data.financial.discountsGiven],
      ["مبالغ مستردة", data.financial.refunds],
      ["طلبات معلّقة", data.financial.outstandingOrders],
      ["قيمة معلّقة", data.financial.outstandingValue]
    );
  }
  return { title: "ملخص المؤشرات", headers: ["المؤشر", "القيمة"], rows };
}

export function buildExportTables(
  data: ReportsPayload,
  section: ReportSection = "overview"
): ExportTable[] {
  const tables: ExportTable[] = [kpiRows(data)];

  const includeProducts =
    section === "overview" ||
    section === "products" ||
    section === "sales" ||
    section === "categories";
  const includeCustomers =
    section === "overview" || section === "customers";
  const includeShipping =
    section === "overview" || section === "shipping";
  const includeBookings =
    section === "overview" || section === "bookings";
  const includeInsights =
    section === "overview" || section === "insights";
  const includeFinancial =
    (section === "overview" || section === "financial") && data.financial;

  if (includeProducts) {
    tables.push({
      title: "أفضل المنتجات مبيعاً",
      headers: ["المنتج", "الكمية", "الطلبات", "الإيرادات"],
      rows: data.products.bestSelling.map((p) => [
        p.name,
        p.quantity,
        p.orders_count,
        p.revenue,
      ]),
    });
    tables.push({
      title: "إيرادات التصنيفات",
      headers: ["التصنيف", "الكمية", "الطلبات", "الإيرادات"],
      rows: data.categories.categoryRevenue.map((c) => [
        c.name,
        c.quantity,
        c.orders_count,
        c.revenue,
      ]),
    });
  }

  if (includeBookings) {
    tables.push({
      title: "أكثر الخدمات طلباً",
      headers: ["الخدمة", "العدد"],
      rows: data.bookings.mostRequestedServices.map((s) => [s.name, s.count]),
    });
  }

  if (includeCustomers) {
    tables.push({
      title: "أعلى العملاء إنفاقاً",
      headers: ["الاسم", "الهاتف", "الطلبات", "الإنفاق"],
      rows: data.customers.highestSpending.map((c) => [
        c.name,
        c.phone ?? "",
        c.orders,
        c.spend,
      ]),
    });
  }

  if (includeShipping) {
    tables.push({
      title: "مناطق الشحن",
      headers: ["المنطقة", "العدد"],
      rows: data.shipping.mostSelectedRegions.map((r) => [r.name, r.count]),
    });
  }

  if (includeFinancial && data.financial) {
    tables.push({
      title: "الملخص المالي",
      headers: ["البند", "القيمة"],
      rows: [
        ["الإجمالي", data.financial.gross],
        ["الصافي", data.financial.net],
        ["دخل الشحن", data.financial.shippingIncome],
        ["الخصومات", data.financial.discountsGiven],
        ["المستردات (مستقبلي)", data.financial.refunds],
        ["طلبات معلّقة", data.financial.outstandingOrders],
        ["قيمة معلّقة", data.financial.outstandingValue],
      ],
    });
  }

  if (includeInsights) {
    tables.push({
      title: "رؤى الأعمال",
      headers: ["العنوان", "التفاصيل", "المقياس"],
      rows: data.insights.map((i) => [i.title, i.body, i.metric ?? ""]),
    });
  }

  return tables;
}

export function buildReportCsv(
  data: ReportsPayload,
  section: ReportSection = "overview"
): string {
  const tables = buildExportTables(data, section);
  const chunks: string[] = [];
  chunks.push(
    rowsToCsv(
      ["التقرير", "الفترة", "تاريخ الإنشاء"],
      [["NadEEN Designs — التقارير", periodLabel(data), new Date().toISOString()]]
    ).replace(/^\uFEFF/, "")
  );
  for (const table of tables) {
    chunks.push("");
    chunks.push(table.title);
    chunks.push(
      rowsToCsv(table.headers, table.rows).replace(/^\uFEFF/, "")
    );
  }
  return `\uFEFF${chunks.join("\n")}`;
}

export async function buildReportXlsx(
  data: ReportsPayload,
  section: ReportSection = "overview"
): Promise<Uint8Array> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const meta = [
    ["الشركة", SITE_NAME],
    ["البريد", DEFAULT_SETTINGS.email],
    ["الهاتف", DEFAULT_SETTINGS.phone],
    ["العنوان", DEFAULT_SETTINGS.address_ar],
    ["الفترة", periodLabel(data)],
    ["تاريخ الإنشاء", new Date().toLocaleString("ar-SA")],
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(meta),
    "معلومات"
  );

  const tables = buildExportTables(data, section);
  for (const table of tables) {
    const aoa = [table.headers, ...table.rows];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    const name = table.title.slice(0, 28) || "Sheet";
    XLSX.utils.book_append_sheet(wb, sheet, name);
  }

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as number[];
  return new Uint8Array(buf);
}

export async function buildReportPdf(
  data: ReportsPayload,
  section: ReportSection = "overview"
): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(SITE_NAME, pageWidth / 2, 18, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Report Center / التقارير", pageWidth / 2, 26, { align: "center" });
  doc.setFontSize(9);
  doc.text(
    `${DEFAULT_SETTINGS.email} | ${DEFAULT_SETTINGS.phone}`,
    pageWidth / 2,
    32,
    { align: "center" }
  );
  doc.text(`Period: ${periodLabel(data)}`, pageWidth / 2, 38, {
    align: "center",
  });
  doc.text(
    `Generated: ${new Date().toLocaleString("en-GB")}`,
    pageWidth / 2,
    43,
    { align: "center" }
  );

  let startY = 50;
  const tables = buildExportTables(data, section);

  for (const table of tables) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(table.title, 14, startY);
    startY += 2;

    autoTable(doc, {
      startY: startY + 2,
      head: [table.headers],
      body: table.rows.map((r) =>
        r.map((cell) =>
          typeof cell === "number" && cell >= 100
            ? formatPrice(cell).replace(/[^\d.,]/g, "") || String(cell)
            : String(cell)
        )
      ),
      styles: { fontSize: 8, halign: "right" },
      headStyles: { fillColor: [184, 149, 106], textColor: 255 },
      margin: { left: 14, right: 14 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable?.finalY ?? startY + 20;
    startY = finalY + 10;
    if (startY > 260) {
      doc.addPage();
      startY = 20;
    }
  }

  const summary = data.sales;
  doc.setFontSize(9);
  doc.text(
    `Totals — Revenue: ${summary.totalRevenue} | Orders: ${summary.ordersCount} | AOV: ${summary.aov}`,
    14,
    Math.min(startY + 4, 285)
  );

  const arrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}

export function buildReportEmailHtml(
  data: ReportsPayload,
  presetLabel: string
): string {
  const sales = data.sales;
  const insights = data.insights
    .slice(0, 5)
    .map(
      (i) =>
        `<li style="margin-bottom:8px"><strong>${escapeHtml(i.title)}</strong>: ${escapeHtml(i.body)}</li>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<body style="font-family:Tahoma,Arial,sans-serif;background:#f7f3ee;color:#2c241b;padding:24px">
  <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e6dccf;border-radius:12px;padding:24px">
    <h1 style="color:#b8956a;margin:0 0 8px">${escapeHtml(SITE_NAME)}</h1>
    <p style="margin:0 0 16px;color:#6b5e52">تقرير ${escapeHtml(presetLabel)} — ${escapeHtml(periodLabel(data))}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr><td style="padding:8px;border-bottom:1px solid #eee">إجمالي الإيرادات</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:left">${sales.totalRevenue}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee">صافي الإيرادات</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:left">${sales.netRevenue}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee">الطلبات</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:left">${sales.ordersCount}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee">الحجوزات</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:left">${data.bookings.newCount}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee">متوسط قيمة الطلب</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:left">${sales.aov}</td></tr>
    </table>
    <h2 style="font-size:16px;color:#2c241b">رؤى سريعة</h2>
    <ul style="padding-right:18px;line-height:1.6">${insights || "<li>لا توجد رؤى لهذه الفترة</li>"}</ul>
    <p style="margin-top:24px;font-size:12px;color:#8a7f72">تم الإنشاء تلقائياً من مركز تقارير NadEEN Designs · ${escapeHtml(new Date().toLocaleString("ar-SA"))}</p>
  </div>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
