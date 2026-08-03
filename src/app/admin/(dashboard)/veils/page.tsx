import { ShopProductsManager } from "@/components/admin/ShopProductsManager";
import { getAdminVeils } from "@/lib/admin/shop-data";

export default async function AdminVeilsPage() {
  const veils = await getAdminVeils();
  return <ShopProductsManager kind="veils" title="🕊️ طرحة العروس" initialItems={veils} />;
}
