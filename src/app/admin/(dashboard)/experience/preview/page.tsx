import type { Metadata } from "next";
import { ExperienceEngineShell } from "@/components/admin/experience/ExperienceEngineShell";
import {
  PRODUCT_COMMERCE_TYPES,
  PRODUCT_COMMERCE_TYPE_LABELS,
  applyPurchaseFlowOverride,
  getProductPrimaryAction,
} from "@/lib/products/primary-action";
import { defaultFeatureIdsForProduct } from "@/lib/products/experience-features";
import { listPurchaseFlows } from "@/lib/products/purchase-flows";

export const metadata: Metadata = {
  title: "معاينة التجربة",
};

export default async function ExperiencePreviewPage() {
  const flows = await listPurchaseFlows();

  return (
    <ExperienceEngineShell
      title="معاينة"
      description="مرجع لمسارات الشراء المحفوظة (من محرك التجربة). المعاينة الحية للمنتج تتم من محرر المنتج ← تجربة المنتج."
    >
      <div className="overflow-x-auto rounded-2xl border border-beige-dark bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-beige-dark bg-beige/40 text-start">
              <th className="px-4 py-3 font-medium">نوع المنتج</th>
              <th className="px-4 py-3 font-medium">الزر الأساسي</th>
              <th className="px-4 py-3 font-medium">سلة / شراء</th>
              <th className="px-4 py-3 font-medium">ميزات افتراضية</th>
            </tr>
          </thead>
          <tbody>
            {PRODUCT_COMMERCE_TYPES.map((type) => {
              const flow = flows.find((f) => f.product_type === type);
              const action = applyPurchaseFlowOverride(
                getProductPrimaryAction(type),
                flow
              );
              const features = defaultFeatureIdsForProduct({
                productType: type,
              });
              return (
                <tr key={type} className="border-b border-beige-dark/60">
                  <td className="px-4 py-3">
                    <p className="font-medium text-charcoal">
                      {PRODUCT_COMMERCE_TYPE_LABELS[type]}
                    </p>
                    <p className="text-xs text-muted" dir="ltr">
                      {type}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gold">{action.label}</td>
                  <td className="px-4 py-3 text-muted">
                    {action.hideCart ? "مخفي" : "ظاهر"}
                    {" / "}
                    {action.hideBuyNow ? "مخفي" : "ظاهر"}
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
