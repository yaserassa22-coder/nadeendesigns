import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import {
  listPurchaseFlows,
  savePurchaseFlow,
  type PurchaseFlowCtaKind,
} from "@/lib/products/purchase-flows";

const CTA_KINDS: readonly PurchaseFlowCtaKind[] = [
  "add_to_cart",
  "book_appointment",
  "request_design",
  "book_now",
];

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const flows = await listPurchaseFlows();
  return NextResponse.json({ flows });
}

export async function POST(req: Request) {
  const { error } = await requireAdminApi("canMutateStore");
  if (error) return error;
  const body = (await req.json()) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const product_type =
    typeof body.product_type === "string" ? body.product_type.trim() : "";
  if (!id || !product_type) {
    return NextResponse.json(
      { error: "id و product_type مطلوبان" },
      { status: 400 }
    );
  }
  const primary_cta = (
    typeof body.primary_cta === "string" &&
    (CTA_KINDS as readonly string[]).includes(body.primary_cta)
      ? body.primary_cta
      : "add_to_cart"
  ) as PurchaseFlowCtaKind;

  const saved = await savePurchaseFlow({
    id,
    product_type,
    name: typeof body.name === "string" ? body.name : "",
    name_ar: typeof body.name_ar === "string" ? body.name_ar : "",
    description_ar:
      typeof body.description_ar === "string" ? body.description_ar : "",
    primary_cta,
    primary_label_ar:
      typeof body.primary_label_ar === "string" ? body.primary_label_ar : "",
    secondary_ctas: Array.isArray(body.secondary_ctas)
      ? body.secondary_ctas.filter((x): x is string => typeof x === "string")
      : [],
    hide_cart: Boolean(body.hide_cart),
    hide_buy_now: Boolean(body.hide_buy_now),
    steps: Array.isArray(body.steps)
      ? body.steps.filter((x): x is string => typeof x === "string")
      : [],
    is_system: Boolean(body.is_system),
    sort_order: typeof body.sort_order === "number" ? body.sort_order : 0,
  });
  if (!saved) {
    return NextResponse.json(
      { error: "فشل الحفظ — تأكد من تطبيق ترحيل 040" },
      { status: 500 }
    );
  }
  return NextResponse.json({ flow: saved });
}
