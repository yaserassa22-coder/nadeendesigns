import { Suspense } from "react";
import { OrdersManager } from "@/components/admin/OrdersManager";
import { getAdminOrders } from "@/lib/admin/shop-data";

export default async function AdminOrdersPage() {
  const orders = await getAdminOrders();
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-beige-dark bg-white p-8 text-muted">
          جاري تحميل الطلبات...
        </div>
      }
    >
      <OrdersManager initialOrders={orders} />
    </Suspense>
  );
}
