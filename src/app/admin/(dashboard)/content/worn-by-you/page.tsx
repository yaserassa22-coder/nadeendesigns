import type { Metadata } from "next";
import { WornByYouManager } from "@/components/admin/WornByYouManager";
import { getAdminWornByYouItems } from "@/lib/admin/data";
import { getStoreSettings } from "@/lib/store/settings";

export const metadata: Metadata = {
  title: "Worn by You",
};

export default async function AdminWornByYouPage() {
  const [items, store] = await Promise.all([
    getAdminWornByYouItems(),
    getStoreSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">Worn by You</h1>
        <p className="mt-2 text-muted">
          Manage real customer photos and videos for the homepage gallery.
          Items appear only when enabled — nothing is invented.
        </p>
      </div>
      <WornByYouManager
        initialItems={items}
        initialEyebrow={store.homepage.worn_by_you_eyebrow}
        initialTitle={store.homepage.worn_by_you_title}
      />
    </div>
  );
}
