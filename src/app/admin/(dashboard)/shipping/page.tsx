import type { Metadata } from "next";
import { ShippingRegionsManager } from "@/components/admin/ShippingRegionsManager";
import { getAdminShippingRegions } from "@/lib/admin/shipping-regions-data";
import { getAdminSettings } from "@/lib/admin/data";

export const metadata: Metadata = {
  title: "إعدادات الشحن",
};

export default async function AdminShippingPage() {
  const [regions, settings] = await Promise.all([
    getAdminShippingRegions(),
    getAdminSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">إعدادات الشحن</h1>
        <p className="mt-2 text-muted">
          مناطق الشحن، الرسوم، وتفعيل الاستلام من البوتيك أو التوصيل
        </p>
      </div>
      <ShippingRegionsManager
        initialRegions={regions}
        initialSettings={settings}
      />
    </div>
  );
}
