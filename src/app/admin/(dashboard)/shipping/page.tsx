import type { Metadata } from "next";
import Link from "next/link";
import { ShippingRegionsManager } from "@/components/admin/ShippingRegionsManager";
import {
  getAdminShippingRegions,
  getUnknownShippingRegionHints,
} from "@/lib/admin/shipping-regions-data";
import { getAdminSettings } from "@/lib/admin/data";

export const metadata: Metadata = {
  title: "إعدادات الشحن",
};

export default async function AdminShippingPage() {
  const [regions, settings, unknownRegions] = await Promise.all([
    getAdminShippingRegions(),
    getAdminSettings(),
    getUnknownShippingRegionHints(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">إعدادات الشحن</h1>
        <p className="mt-2 text-muted">
          مناطق الشحن، الرسوم، مدة التوصيل، وتفعيل الاستلام من البوتيك أو التوصيل
        </p>
        <Link
          href="/admin/shipping/providers"
          className="mt-3 inline-block text-sm text-gold hover:underline"
        >
          شركات الشحن — ربط وإعداد شركات التوصيل
        </Link>
      </div>
      <ShippingRegionsManager
        initialRegions={regions}
        initialSettings={settings}
        initialUnknownRegions={unknownRegions}
      />
    </div>
  );
}
