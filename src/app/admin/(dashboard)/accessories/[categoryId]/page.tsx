import { notFound } from "next/navigation";
import { ShopProductsManager } from "@/components/admin/ShopProductsManager";
import { getAdminAccessoryItems } from "@/lib/admin/shop-data";
import { getCategoryById } from "@/lib/data/categories";

type PageProps = {
  params: Promise<{ categoryId: string }>;
};

/** Generic bridal-accessory admin manager — one page per custom sub-category. */
export default async function AdminAccessoryCategoryPage({ params }: PageProps) {
  const { categoryId } = await params;
  const category = await getCategoryById(categoryId);
  if (!category) notFound();

  const items = await getAdminAccessoryItems(categoryId);

  return (
    <ShopProductsManager
      kind="accessory-item"
      title={category.name_ar}
      initialItems={items}
      categoryId={categoryId}
    />
  );
}
