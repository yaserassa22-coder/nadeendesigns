"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type SessionTimeoutGuardProps = {
  /** Minutes of idle time before sign-out. */
  minutes: number;
  /** Only run when the viewer is authenticated. */
  enabled?: boolean;
};

/**
 * Signs the current Supabase user out after `minutes` of idle activity.
 * Used for admin dashboard and logged-in storefront customers.
 */
export function SessionTimeoutGuard({
  minutes,
  enabled = true,
}: SessionTimeoutGuardProps) {
  const minutesRef = useRef(minutes);
  minutesRef.current = Math.min(1440, Math.max(5, minutes || 60));

  useEffect(() => {
    if (!enabled) return;

    let timer: number | null = null;
    const events = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
      "mousemove",
    ] as const;

    const clear = () => {
      if (timer != null) window.clearTimeout(timer);
      timer = null;
    };

    const arm = () => {
      clear();
      const ms = minutesRef.current * 60_000;
      timer = window.setTimeout(() => {
        void (async () => {
          try {
            const supabase = createClient();
            await supabase.auth.signOut();
          } catch {
            /* ignore */
          }
          if (window.location.pathname.startsWith("/admin")) {
            window.location.href = "/admin/login?error=session_timeout";
          } else {
            window.location.reload();
          }
        })();
      }, ms);
    };

    const onActivity = () => arm();
    arm();
    for (const ev of events) {
      window.addEventListener(ev, onActivity, { passive: true });
    }
    return () => {
      clear();
      for (const ev of events) {
        window.removeEventListener(ev, onActivity);
      }
    };
  }, [enabled]);

  return null;
}
