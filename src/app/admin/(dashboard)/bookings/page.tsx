import type { Metadata } from "next";
import { BookingsManager } from "@/components/admin/BookingsManager";
import { getAdminBookings } from "@/lib/admin/data";

export const metadata: Metadata = {
  title: "إدارة الحجوزات",
};

/** Always fetch fresh bookings — never serve a cached empty list */
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams: Promise<{ service?: string }>;
};

export default async function AdminBookingsPage({ searchParams }: Props) {
  const { bookings, error, count } = await getAdminBookings();
  const params = await searchParams;
  const service = params.service?.trim() || null;
  const isCustomDesign = service === "custom_design";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-charcoal">
          {isCustomDesign ? "طلبات تصميم فستان خاص" : "إدارة الحجوزات"}
        </h1>
        <p className="mt-2 text-muted">
          {isCustomDesign
            ? `حجوزات خدمة تصميم فستان خاص من جدول bookings (${count} حجز إجمالاً)`
            : `متابعة جميع المواعيد من جدول bookings (${count} حجز)`}
        </p>
      </div>
      <BookingsManager
        initialBookings={bookings}
        initialError={error}
        initialServiceFilter={service}
      />
    </div>
  );
}
