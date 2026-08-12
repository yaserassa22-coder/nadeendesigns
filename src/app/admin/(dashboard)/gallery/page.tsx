import type { Metadata } from "next";
import { GalleryManager } from "@/components/admin/GalleryManager";
import { getAdminGallery } from "@/lib/admin/data";
import { getAdminGalleryCategories } from "@/lib/data/gallery-categories";

export const metadata: Metadata = {
  title: "إدارة المعرض",
};

export default async function AdminGalleryPage() {
  const [items, categories] = await Promise.all([
    getAdminGallery(),
    getAdminGalleryCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">إدارة المعرض</h1>
        <p className="mt-2 text-muted">
          رفع وتنظيم صور المعرض، وإدارة تصنيفات الفلتر (تفاصيل، البوتيك، فعاليات،
          …)
        </p>
      </div>
      <GalleryManager initialItems={items} initialCategories={categories} />
    </div>
  );
}
