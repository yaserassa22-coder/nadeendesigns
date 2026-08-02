import Link from "next/link";
import type { Metadata } from "next";
import {
  CalendarDays,
  ImageIcon,
  Shirt,
  Clock3,
} from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { getDashboardStats } from "@/lib/admin/data";
import { BOOKING_STATUS_LABELS, SERVICE_TYPE_LABELS } from "@/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "لوحة التحكم",
};

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <div>
        <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.25em] text-gold uppercase">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-bold text-charcoal">لوحة التحكم</h1>
        <p className="mt-2 text-muted">
          نظرة عامة على محتوى الموقع والحجوزات
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="الفساتين"
          value={stats.dressesCount}
          icon={Shirt}
          hint={`${stats.featuredDresses} مميزة`}
        />
        <StatCard
          title="صور المعرض"
          value={stats.galleryCount}
          icon={ImageIcon}
        />
        <StatCard
          title="الحجوزات"
          value={stats.bookingsCount}
          icon={CalendarDays}
        />
        <StatCard
          title="بانتظار التأكيد"
          value={stats.pendingBookings}
          icon={Clock3}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-beige-dark bg-white p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">أحدث الحجوزات</h2>
            <Link href="/admin/bookings">
              <Button variant="ghost" size="sm">
                عرض الكل
              </Button>
            </Link>
          </div>
          {stats.recentBookings.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              لا توجد حجوزات بعد
            </p>
          ) : (
            <ul className="divide-y divide-beige-dark">
              {stats.recentBookings.map((booking) => (
                <li
                  key={booking.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-charcoal">{booking.name}</p>
                    <p className="text-muted">
                      {SERVICE_TYPE_LABELS[booking.service_type]} —{" "}
                      {formatDate(booking.date)}
                    </p>
                  </div>
                  <span className="rounded-full bg-beige px-3 py-1 text-xs">
                    {BOOKING_STATUS_LABELS[booking.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-beige-dark bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">اختصارات سريعة</h2>
          <div className="space-y-3">
            <Link href="/admin/dresses" className="block">
              <Button variant="outline" className="w-full justify-start">
                إدارة الفساتين
              </Button>
            </Link>
            <Link href="/admin/gallery" className="block">
              <Button variant="outline" className="w-full justify-start">
                إدارة المعرض
              </Button>
            </Link>
            <Link href="/admin/bookings" className="block">
              <Button variant="outline" className="w-full justify-start">
                إدارة الحجوزات
              </Button>
            </Link>
            <Link href="/admin/settings" className="block">
              <Button variant="outline" className="w-full justify-start">
                إعدادات الموقع
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
