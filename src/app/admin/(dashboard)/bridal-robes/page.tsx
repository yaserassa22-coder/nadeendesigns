import { ShopProductsManager } from "@/components/admin/ShopProductsManager";
import { getAdminBridalRobes } from "@/lib/admin/shop-data";

export default async function AdminBridalRobesPage() {
  const robes = await getAdminBridalRobes();
  return (
    <ShopProductsManager
      kind="bridal-robes"
      title="🥻 برنص العروس"
      initialItems={robes}
    />
  );
}
