"use client";

import { useEffect, useState } from "react";
import { SessionTimeoutGuard } from "@/components/auth/SessionTimeoutGuard";

/** Idle sign-out for admin dashboard using store security session_timeout_minutes. */
export function AdminSessionTimeout() {
  const [minutes, setMinutes] = useState(60);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch("/api/admin/store-settings", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          const m = Number(d?.settings?.security?.session_timeout_minutes);
          if (Number.isFinite(m) && m >= 5) setMinutes(m);
        })
        .catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return <SessionTimeoutGuard minutes={minutes} enabled />;
}
