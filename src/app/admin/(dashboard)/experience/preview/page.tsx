import type { Metadata } from "next";
import { ExperienceEngineShell } from "@/components/admin/experience/ExperienceEngineShell";
import {
  PRODUCT_COMMERCE_TYPES,
  applyPurchaseFlowOverride,
  getProductCommerceTypeLabel,
  getProductPrimaryAction,
} from "@/lib/products/primary-action";
import { defaultFeatureIdsForProduct } from "@/lib/products/experience-features";
import { listPurchaseFlows } from "@/lib/products/purchase-flows";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: getDictionary(locale).admin.experienceUi.preview };
}

export default async function ExperiencePreviewPage() {
  const locale = await getLocale();
  const flows = await listPurchaseFlows();

  return (
    <ExperienceEngineShell page="preview">
      <div className="overflow-x-auto rounded-2xl border border-beige-dark bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-beige-dark bg-beige/40 text-start">
              <th className="px-4 py-3 font-medium">product_type</th>
              <th className="px-4 py-3 font-medium">primary</th>
              <th className="px-4 py-3 font-medium">cart / buy</th>
              <th className="px-4 py-3 font-medium">default features</th>
            </tr>
          </thead>
          <tbody>
            {PRODUCT_COMMERCE_TYPES.map((type) => {
              const flow = flows.find((f) => f.product_type === type);
              const action = applyPurchaseFlowOverride(
                getProductPrimaryAction(type, "ready_to_buy", locale),
                flow
              );
              const features = defaultFeatureIdsForProduct({
                productType: type,
              });
              return (
                <tr key={type} className="border-b border-beige-dark/60">
                  <td className="px-4 py-3">
                    <p className="font-medium text-charcoal">
                      {getProductCommerceTypeLabel(type, locale)}
                    </p>
                    <p className="text-xs text-muted" dir="ltr">
                      {type}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gold">{action.label}</td>
                  <td className="px-4 py-3 text-muted" dir="ltr">
                    {action.hideCart ? "hidden" : "visible"}
                    {" / "}
                    {action.hideBuyNow ? "hidden" : "visible"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted" dir="ltr">
                    {features.join(", ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ExperienceEngineShell>
  );
}
