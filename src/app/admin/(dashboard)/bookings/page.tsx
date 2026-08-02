import type { Metadata } from "next";
import { BookingsManager } from "@/components/admin/BookingsManager";
import { getAdminBookings } from "@/lib/admin/data";

export const metadata: Metadata = {
  title: "إدارة الحجوزات",
};

export default async function AdminBookingsPage() {
  const bookings = await getAdminBookings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">إدارة الحجوزات</h1>
        <p className="mt-2 text-muted">
          متابعة طلبات المواعيد وتحديث حالاتها
        </p>
      </div>
      <BookingsManager initialBookings={bookings} />
    </div>
  );
}
