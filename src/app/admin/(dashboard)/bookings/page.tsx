import type { Metadata } from "next";
import { BookingsManager } from "@/components/admin/BookingsManager";
import { getAdminBookings } from "@/lib/admin/data";

export const metadata: Metadata = {
  title: "إدارة الحجوزات",
};

/** Always fetch fresh bookings — never serve a cached empty list */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminBookingsPage() {
  const { bookings, error, count } = await getAdminBookings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">إدارة الحجوزات</h1>
        <p className="mt-2 text-muted">
          متابعة جميع المواعيد من جدول bookings ({count} حجز)
        </p>
      </div>
      <BookingsManager initialBookings={bookings} initialError={error} />
    </div>
  );
}
