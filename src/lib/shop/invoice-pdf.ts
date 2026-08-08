/**
 * Israeli tax invoice PDF — Hebrew only.
 *
 * Uses embedded Noto Sans Hebrew (Unicode). Layout is RTL via align:right.
 * Numbers / Latin brand names use Noto Sans to avoid digit reversal.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  INVOICE_TYPE_LABELS_HE,
  computeVatBreakdown,
  orderInvoiceLines,
} from "@/lib/shop/invoice";
import { resolveOrderLineName } from "@/lib/i18n/order-item-labels";
import { formatPrice } from "@/lib/utils";
import type { ShopOrder } from "@/types/shop";
import type { StoreSettings, StoreTaxDocumentType } from "@/types/store";

const BUSINESS_ID_TYPE_LABELS_HE: Record<string, string> = {
  company: "ח.פ.",
  authorized_dealer: "ע.מ.",
  exempt: "עוסק פטור",
  other: "אחר",
};

type JsPdfDoc = {
  addFileToVFS: (name: string, data: string) => void;
  addFont: (file: string, name: string, style: string) => void;
  setFont: (name: string, style?: string) => void;
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  setDrawColor: (r: number, g?: number, b?: number) => void;
  setLineWidth: (w: number) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  text: (
    text: string | string[],
    x: number,
    y: number,
    options?: {
      align?: "left" | "center" | "right";
      maxWidth?: number;
      isInputRtl?: boolean;
      lang?: string;
    }
  ) => void;
  internal: { pageSize: { getWidth: () => number } };
  output: (type: "arraybuffer") => ArrayBuffer;
  setR2L?: (v: boolean) => void;
};

let fontCache: { latin: string; hebrew: string } | null = null;

async function loadFonts(): Promise<{ latin: string; hebrew: string }> {
  if (fontCache) return fontCache;
  const dir = path.join(process.cwd(), "public", "fonts");
  const [latin, hebrew] = await Promise.all([
    readFile(path.join(dir, "NotoSans-Regular.ttf")),
    readFile(path.join(dir, "NotoSansHebrew-Regular.ttf")),
  ]);
  fontCache = {
    latin: latin.toString("base64"),
    hebrew: hebrew.toString("base64"),
  };
  return fontCache;
}

function money(n: number): string {
  try {
    return formatPrice(n).replace(/\s/g, " ");
  } catch {
    return `${n.toFixed(2)} ₪`;
  }
}

/** Hebrew text — RTL input so jsPDF does not mirror Latin digits. */
function heText(
  doc: JsPdfDoc,
  text: string,
  x: number,
  y: number,
  opts?: { align?: "left" | "center" | "right"; size?: number; maxWidth?: number }
) {
  const t = String(text ?? "").trim();
  if (!t) return;
  doc.setFont("NotoSansHebrew", "normal");
  if (opts?.size) doc.setFontSize(opts.size);
  doc.text(t, x, y, {
    align: opts?.align ?? "right",
    maxWidth: opts?.maxWidth,
    isInputRtl: true,
    lang: "he",
  });
}

/** Latin / numbers — LTR, never through RTL path. */
function enText(
  doc: JsPdfDoc,
  text: string,
  x: number,
  y: number,
  opts?: { align?: "left" | "center" | "right"; size?: number }
) {
  const t = String(text ?? "").trim();
  if (!t) return;
  doc.setFont("NotoSans", "normal");
  if (opts?.size) doc.setFontSize(opts.size);
  doc.text(t, x, y, { align: opts?.align ?? "left" });
}

export async function buildOrderInvoicePdf(
  order: ShopOrder,
  store: StoreSettings
): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const fonts = await loadFonts();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  }) as unknown as JsPdfDoc;

  doc.addFileToVFS("NotoSans-Regular.ttf", fonts.latin);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFileToVFS("NotoSansHebrew-Regular.ttf", fonts.hebrew);
  doc.addFont("NotoSansHebrew-Regular.ttf", "NotoSansHebrew", "normal");
  // Keep global R2L off — we pass isInputRtl per Hebrew string only
  doc.setR2L?.(false);

  const pageWidth = doc.internal.pageSize.getWidth();
  const right = pageWidth - 14;
  const left = 14;
  const g = store.general;
  const c = store.contact;
  const tax = store.tax;

  const type = (order.invoice_type ||
    tax.default_document_type) as StoreTaxDocumentType;
  const typeLabel = INVOICE_TYPE_LABELS_HE[type] || "חשבונית";

  const vat = computeVatBreakdown(Number(order.total) || 0, {
    vat_rate: order.vat_rate ?? tax.vat_rate,
    prices_include_vat: order.prices_include_vat ?? tax.prices_include_vat,
  });

  const businessName = g.store_name || "Nadeen Designs";
  const phone = c.phone || g.business_phone || "";
  const email = c.email || g.business_email || "";
  const address =
    (g as { business_address_he?: string }).business_address_he ||
    (c as { location_he?: string }).location_he ||
    g.business_address_ar ||
    g.business_address ||
    "";
  const businessId = tax.business_id?.trim() || "—";
  const idType = BUSINESS_ID_TYPE_LABELS_HE[tax.business_id_type] || "מזהה";

  let y = 18;
  doc.setTextColor(40, 40, 40);

  // Brand (Latin)
  enText(doc, businessName, pageWidth / 2, y, { align: "center", size: 16 });
  y += 8;
  heText(doc, typeLabel, pageWidth / 2, y, { align: "center", size: 14 });
  y += 8;

  if (address) {
    heText(doc, address, pageWidth / 2, y, {
      align: "center",
      size: 9,
      maxWidth: pageWidth - 28,
    });
    y += 5;
  }
  if (phone) {
    heText(doc, "טלפון", pageWidth / 2, y, { align: "center", size: 9 });
    y += 4;
    enText(doc, phone, pageWidth / 2, y, { align: "center", size: 9 });
    y += 5;
  }
  if (email) {
    enText(doc, email, pageWidth / 2, y, { align: "center", size: 8 });
    y += 5;
  }
  heText(doc, idType, pageWidth / 2, y, { align: "center", size: 9 });
  y += 4;
  enText(doc, businessId, pageWidth / 2, y, { align: "center", size: 9 });
  y += 6;

  doc.setDrawColor(184, 149, 106);
  doc.setLineWidth(0.45);
  doc.line(left, y, right, y);
  y += 8;

  const issued =
    order.invoice_issued_at ||
    order.created_at ||
    new Date().toISOString();
  const issuedDate = new Date(issued).toLocaleDateString("he-IL");

  const colGap = 8;
  const mid = (left + right) / 2;
  const docColRight = right;
  const custColRight = mid - colGap / 2;
  const rowStart = y;

  // Right column (RTL): document meta
  heText(doc, "פרטי מסמך", docColRight, y, { align: "right", size: 11 });
  y += 6;
  heText(doc, "מס׳ מסמך:", docColRight, y, { align: "right", size: 9 });
  enText(doc, order.invoice_number || "—", docColRight - 32, y, {
    align: "right",
    size: 9,
  });
  y += 5;
  heText(doc, "תאריך:", docColRight, y, { align: "right", size: 9 });
  enText(doc, issuedDate, docColRight - 22, y, { align: "right", size: 9 });
  y += 5;
  heText(doc, "הזמנה:", docColRight, y, { align: "right", size: 9 });
  enText(doc, order.id.slice(0, 8).toUpperCase(), docColRight - 22, y, {
    align: "right",
    size: 9,
  });
  const docColEnd = y;

  // Left column (RTL visual left): customer block
  y = rowStart;
  heText(doc, "פרטי לקוחה", custColRight, y, { align: "right", size: 11 });
  y += 6;
  heText(doc, "שם:", custColRight, y, { align: "right", size: 9 });
  heText(doc, order.name || "—", custColRight - 14, y, {
    align: "right",
    size: 9,
    maxWidth: custColRight - left - 16,
  });
  y += 5;
  if (order.phone) {
    heText(doc, "טלפון:", custColRight, y, { align: "right", size: 9 });
    enText(doc, order.phone, custColRight - 20, y, {
      align: "right",
      size: 9,
    });
    y += 5;
  }
  if (order.email) {
    heText(doc, "דוא״ל:", custColRight, y, { align: "right", size: 9 });
    enText(doc, order.email, custColRight - 20, y, {
      align: "right",
      size: 8,
    });
    y += 5;
  }
  const shipAddr = [
    order.shipping_address,
    order.shipping_city,
    (order as { shipping_region_name_he?: string }).shipping_region_name_he ||
      order.shipping_region_name_ar ||
      order.shipping_region,
  ]
    .filter(Boolean)
    .join(", ");
  if (shipAddr) {
    heText(doc, "כתובת:", custColRight, y, { align: "right", size: 9 });
    heText(doc, shipAddr, custColRight - 20, y, {
      align: "right",
      size: 8,
      maxWidth: custColRight - left - 22,
    });
    y += 6;
  }
  y = Math.max(docColEnd, y) + 4;

  const lines = (order.items ?? []).map((item) => {
    const fromInvoice = orderInvoiceLines([item])[0];
    return {
      name: resolveOrderLineName(item, "he") || item.name_ar || "מוצר",
      quantity: item.quantity,
      unit: money(fromInvoice?.unitPrice ?? (Number(item.unit_price) || 0)),
      total: money(fromInvoice?.lineTotal ?? 0),
    };
  });

  if ((Number(order.shipping_cost) || 0) > 0) {
    lines.push({
      name: "שילוח",
      quantity: 1,
      unit: money(Number(order.shipping_cost) || 0),
      total: money(Number(order.shipping_cost) || 0),
    });
  }

  autoTable(doc, {
    startY: y,
    head: [["סה״כ", "מחיר", "כמות", "פריט"]],
    body: lines.map((l) => [l.total, l.unit, String(l.quantity), l.name]),
    styles: {
      font: "NotoSansHebrew",
      fontSize: 9,
      halign: "right",
      valign: "middle",
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: [184, 149, 106],
      textColor: 255,
      font: "NotoSansHebrew",
      halign: "right",
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 32, font: "NotoSans", halign: "right" },
      1: { cellWidth: 32, font: "NotoSans", halign: "right" },
      2: { cellWidth: 18, font: "NotoSans", halign: "center" },
      3: { cellWidth: 90, font: "NotoSansHebrew", halign: "right" },
    },
    margin: { left: 14, right: 14 },
    // Hebrew product names in last column
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 3) {
        data.cell.styles.font = "NotoSansHebrew";
      }
      if (data.section === "head") {
        data.cell.styles.font = "NotoSansHebrew";
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = ((doc as any).lastAutoTable?.finalY as number) ?? y + 40;
  finalY += 10;

  heText(doc, "סכום לפני מע״מ", right, finalY, { align: "right", size: 10 });
  enText(doc, money(vat.net), left, finalY, { align: "left", size: 10 });
  finalY += 6;
  heText(doc, `מע״מ ${vat.rate}%`, right, finalY, {
    align: "right",
    size: 10,
  });
  enText(doc, money(order.vat_amount ?? vat.vat), left, finalY, {
    align: "left",
    size: 10,
  });
  finalY += 7;
  heText(doc, "סה״כ לתשלום", right, finalY, { align: "right", size: 12 });
  enText(doc, money(vat.gross), left, finalY, { align: "left", size: 12 });
  finalY += 10;

  heText(
    doc,
    vat.pricesIncludeVat
      ? 'המחירים כוללים מע"מ'
      : 'המחירים לפני מע"מ',
    pageWidth / 2,
    finalY,
    { align: "center", size: 8 }
  );
  finalY += 8;
  doc.setTextColor(110, 110, 110);
  heText(
    doc,
    "מסמך פנימי של החנות — אינו מוגש לרשות המסים דרך מערכת זו. יש לבדוק מול רואה החשבון.",
    pageWidth / 2,
    finalY,
    { align: "center", size: 7, maxWidth: pageWidth - 28 }
  );

  return new Uint8Array(doc.output("arraybuffer"));
}
