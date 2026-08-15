"use client";

import type { ReactNode } from "react";
import { AdminHeader } from "@/components/admin/shell/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  AdminShellProvider,
  useAdminShell,
} from "@/components/admin/shell/AdminShellProvider";
import { cn } from "@/lib/utils";

function AdminChromeInner({
  children,
  email,
}: {
  children: ReactNode;
  email?: string | null;
}) {
  const { collapsed } = useAdminShell();
  return (
    <div data-admin className="min-h-screen bg-[#f6f3ee] print:min-h-0 print:bg-white">
      <div className="print:hidden">
        <AdminSidebar />
        <div
          className={cn(
            "transition-[padding] duration-300",
            collapsed ? "lg:ps-[72px]" : "lg:ps-64"
          )}
        >
          <AdminHeader email={email} />
        </div>
      </div>
      <div
        className={cn(
          "transition-[padding] duration-300 print:ps-0",
          collapsed ? "lg:ps-[72px]" : "lg:ps-64"
        )}
      >
        <div className="w-full px-4 py-6 sm:px-6 lg:px-[4%] lg:py-8 print:p-0">
          {children}
        </div>
      </div>
    </div>
  );
}

export function AdminChrome({
  children,
  email,
}: {
  children: ReactNode;
  email?: string | null;
}) {
  return (
    <AdminShellProvider>
      <AdminChromeInner email={email}>{children}</AdminChromeInner>
    </AdminShellProvider>
  );
}
