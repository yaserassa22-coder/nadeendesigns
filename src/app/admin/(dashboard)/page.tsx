import Link from "next/link";
import type { Metadata } from "next";
import {
  CalendarDays,
  Image as ImageIcon,
  Shirt,
  Clock3,
  Truck,
  WandSparkles,
} from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { getDashboardStats } from "@/lib/admin/data";
import {
  BOOKING_STATUS_LABELS,
  DRESS_CATEGORY_HREFS,
  getServiceTypeLabel,
} from "@/types";
import { isShopSchemaReady } from "@/lib/supabase/shop-schema";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "لوحة التحكم",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboardPage() {
  const [stats, shopReady] = await Promise.all([
    getDashboardStats(),
    isShopSchemaReady(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.25em] text-gold uppercase">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-bold text-charcoal">لوحة التحكم</h1>
        <p className="mt-2 text-muted">
          نظرة عامة على التصنيفات، الحجوزات، وخدمة التوصيل
        </p>
      </div>

      {stats.bookingsError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <p className="font-medium">تعذر قراءة جدول الحجوزات</p>
          <p className="mt-1" dir="ltr">
            {stats.bookingsError}
          </p>
        </div>
      )}

      {!shopReady && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          جداول المتجر (`veils` / `bridal_robes` / `shop_orders`) غير موجودة في
          Supabase — لذلك يفشل تأكيد الطلب وحفظ منتجات طرحة العروس/برنص العروس. افتحي{" "}
          <strong>SQL Editor</strong> ونفّذي ملف{" "}
          <code className="rounded bg-white px-1">supabase/APPLY_SHOP_CHECKOUT.sql</code>{" "}
          ثم أعيدي تحميل الصفحة.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="إجمالي المنتجات"
          value={stats.dressesCount}
          icon={Shirt}
          hint={`${stats.featuredDresses} مميزة`}
        />
        <StatCard
          title="تصميم خاص"
          value={
            stats.byCategory.find((c) => c.category === "custom_design")
              ?.count ?? 0
          }
          icon={WandSparkles}
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
          hint={`${stats.pendingBookings} بانتظار التأكيد`}
        />
        <StatCard
          title="طلبات توصيل"
          value={stats.deliveryBookings}
          icon={Truck}
        />
      </div>

      <section className="rounded-2xl border border-beige-dark bg-white p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">إحصائيات التصنيفات</h2>
            <p className="text-sm text-muted">
              فساتين الزفاف، الإيجار، تصميم خاص، فساتين نوف، طرحة العروس، وبرنص العروس
            </p>
          </div>
          <Link href="/admin/dresses">
            <Button variant="ghost" size="sm">
              إدارة الكل
            </Button>
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {stats.byCategory.map((item) => (
            <Link
              key={item.category}
              href={
                item.category === "nouf_dresses"
                  ? "/admin/nouf-dresses"
                  : `/admin/dresses?category=${item.category}`
              }
              className="rounded-xl border border-beige-dark bg-beige/30 px-4 py-4 transition-colors hover:border-gold hover:bg-gold/5"
            >
              <p className="text-sm text-muted">{item.label}</p>
              <p className="mt-2 font-[family-name:var(--font-cormorant)] text-2xl text-charcoal">
                {item.count}
              </p>
              <p className="mt-1 text-xs text-gold">
                {DRESS_CATEGORY_HREFS[item.category]}
              </p>
            </Link>
          ))}
        </div>
      </section>

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
                      {getServiceTypeLabel(booking.service_type)} —{" "}
                      {formatDate(booking.date)}
                      {booking.delivery_required ? " · توصيل" : ""}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2">
                    {booking.delivery_required && (
                      <span className="rounded-full bg-gold/10 px-2.5 py-1 text-xs text-gold">
                        <Clock3 className="mr-1 inline h-3 w-3" />
                        توصيل
                      </span>
                    )}
                    <span className="rounded-full bg-beige px-3 py-1 text-xs">
                      {BOOKING_STATUS_LABELS[booking.status]}
                    </span>
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
                إدارة المنتجات والتصنيفات
              </Button>
            </Link>
            <Link href="/admin/bookings" className="block">
              <Button variant="outline" className="w-full justify-start">
                الحجوزات والتوصيل
              </Button>
            </Link>
            <Link href="/admin/gallery" className="block">
              <Button variant="outline" className="w-full justify-start">
                إدارة المعرض
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
