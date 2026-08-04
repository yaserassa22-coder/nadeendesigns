"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCustomerAuth } from "@/components/auth/CustomerAuthProvider";

const NAV = [
  { href: "/account", label: "نظرة عامة", exact: true },
  { href: "/account/orders", label: "الطلبات" },
  { href: "/account/appointments", label: "المواعيد" },
  { href: "/account/wishlist", label: "قائمة الأمنيات" },
  { href: "/account/designs", label: "التصاميم المحفوظة" },
  { href: "/account/addresses", label: "العناوين" },
  { href: "/account/reviews", label: "المراجعات" },
  { href: "/account/notifications", label: "الإشعارات" },
  { href: "/account/messages", label: "الرسائل" },
  { href: "/account/profile", label: "الملف الشخصي" },
] as const;

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { customer, logout, loading } = useCustomerAuth();

  const name = customer?.full_name?.trim() || "عزيزتي";

  return (
    <div className="luxury-gradient min-h-[70vh] pb-16 pt-28">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <header className="mb-8">
          <p
            className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.25em]"
            style={{ color: "#C9A14A" }}
          >
            NadEEN Designs
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-amiri)] text-3xl text-charcoal md:text-4xl">
            {loading ? "…" : `مرحباً، ${name}`}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            أديري رحلتك العرائسية — الطلبات، المواعيد، والأمنيات في مكان واحد.
          </p>
        </header>

        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="lg:w-56 shrink-0">
            <nav className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
              {NAV.map((item) => {
                const exact = "exact" in item && item.exact;
                const active = exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "whitespace-nowrap rounded-xl px-4 py-2.5 text-sm transition",
                      active
                        ? "bg-[color:#C9A14A]/15 font-medium text-charcoal"
                        : "text-muted hover:bg-beige hover:text-charcoal"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => void logout(false)}
                className="whitespace-nowrap rounded-xl px-4 py-2.5 text-start text-sm text-red-700/80 hover:bg-red-50"
              >
                تسجيل الخروج
              </button>
              <button
                type="button"
                onClick={() => void logout(true)}
                className="whitespace-nowrap rounded-xl px-4 py-2.5 text-start text-xs text-muted hover:bg-beige"
              >
                الخروج من كل الأجهزة
              </button>
            </nav>
          </aside>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
