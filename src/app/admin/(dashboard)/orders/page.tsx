import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersManager } from "@/components/admin/OrdersManager";
import { getAdminOrders } from "@/lib/admin/shop-data";

export const metadata: Metadata = {
  title: "إدارة الطلبات",
};

/** Always fetch fresh orders — never serve a cached empty list */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminOrdersPage() {
  const { orders, error, count } = await getAdminOrders();
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-beige-dark bg-white p-8 text-muted">
          جاري تحميل الطلبات...
        </div>
      }
    >
      <OrdersManager
        initialOrders={orders}
        initialError={error}
        initialCount={count}
      />
    </Suspense>
  );
}
