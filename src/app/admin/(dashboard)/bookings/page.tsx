import type { Metadata } from "next";
import { BookingsManager } from "@/components/admin/BookingsManager";
import { getAdminBookings } from "@/lib/admin/data";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: getDictionary(locale).admin.bookingsUi.pageTitle };
}

/** Always fetch fresh bookings — never serve a cached empty list */
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams: Promise<{ service?: string }>;
};

export default async function AdminBookingsPage({ searchParams }: Props) {
  const { bookings, error } = await getAdminBookings();
  const params = await searchParams;
  const service = params.service?.trim() || null;

  return (
    <BookingsManager
      initialBookings={bookings}
      initialError={error}
      initialServiceFilter={service}
    />
  );
}
