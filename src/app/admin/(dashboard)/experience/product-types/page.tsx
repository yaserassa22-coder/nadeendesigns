import type { Metadata } from "next";
import Link from "next/link";
import { ExperienceEngineShell } from "@/components/admin/experience/ExperienceEngineShell";
import {
  PRODUCT_COMMERCE_TYPES,
  applyPurchaseFlowOverride,
  getProductCommerceTypeLabel,
  getProductPrimaryAction,
} from "@/lib/products/primary-action";
import { listPurchaseFlows } from "@/lib/products/purchase-flows";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: getDictionary(locale).admin.experienceUi.productTypes };
}

const NOTES: Record<string, string> = {
  rental_dress:
    "فساتين الإيجار (بما فيها الزفاف ونوف بعد الترحيل) — حجز موعد فقط، بدون سلة.",
  bridal_accessory:
    "إكسسوارات العروس (طرحة، برنص، …) — سلة + شراء الآن + مفضلة.",
  ready_to_buy:
    "Alias لسلوك الشراء مثل الإكسسوارات. فساتين الزفاف/نوف تستخدم rental_dress وليس هذا النوع.",
  custom_design: "تصميم خاص — اطلبي تصميم (بدون سلة/شراء).",
  service: "خدمة (مستقبلي) — احجز الآن.",
};

export default async function ProductTypesPage() {
  const locale = await getLocale();
  const flows = await listPurchaseFlows();

  return (
    <ExperienceEngineShell page="productTypes">
      <div className="space-y-4">
        {PRODUCT_COMMERCE_TYPES.map((type) => {
          const flow = flows.find((f) => f.product_type === type);
          const action = applyPurchaseFlowOverride(
            getProductPrimaryAction(type, "ready_to_buy", locale),
            flow
          );
          return (
            <div
              key={type}
              className="rounded-2xl border border-beige-dark bg-white px-5 py-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-charcoal">
                    {getProductCommerceTypeLabel(type, locale)}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted" dir="ltr">
                    {type}
                  </p>
                </div>
                <span className="rounded-full bg-gold/10 px-3 py-1 text-sm font-medium text-gold">
                  {action.label}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted">{NOTES[type]}</p>
              {flow ? (
                <p className="mt-2 text-xs text-muted">
                  {flow.name_ar} ·{" "}
                  <span dir="ltr">{flow.steps.join(" → ")}</span>
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="text-sm text-muted">
        <Link
          href="/admin/experience/purchase-flows"
          className="text-gold hover:underline"
        >
          → purchase flows
        </Link>
      </p>
    </ExperienceEngineShell>
  );
}
