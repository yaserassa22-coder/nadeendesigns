"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "@/components/i18n/LocaleProvider";

const MOBILE_MAX = 1023;
const EDGE_PX = 40;
const MIN_SWIPE_X = 72;
const MAX_SWIPE_Y_RATIO = 0.65;

function isMobileViewport() {
  return window.innerWidth <= MOBILE_MAX;
}

function isIgnoredTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable='true'], [role='dialog'], [data-swipe-own], [aria-roledescription='carousel']"
    )
  );
}

/**
 * Mobile storefront: swipe from the start edge (or a clear back-direction swipe)
 * to return to the previous page. Carousels keep their own left/right swipe.
 */
export function MobileSwipeBack() {
  const router = useRouter();
  const pathname = usePathname();
  const { dir } = useLocale();

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;
    let fromEdge = false;

    const onStart = (event: TouchEvent) => {
      if (!isMobileViewport()) return;
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (!touch) return;

      const ignored = isIgnoredTarget(event.target);
      const edge =
        dir === "rtl"
          ? window.innerWidth - touch.clientX
          : touch.clientX;
      fromEdge = edge <= EDGE_PX;

      // Inside a carousel: only the screen-edge gesture may leave the page.
      if (ignored && !fromEdge) {
        tracking = false;
        return;
      }

      tracking = true;
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const onEnd = (event: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      if (!isMobileViewport()) return;
      const touch = event.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) < MIN_SWIPE_X) return;
      if (Math.abs(dy) > Math.abs(dx) * MAX_SWIPE_Y_RATIO) return;

      const isBack = dir === "rtl" ? dx < 0 : dx > 0;
      if (!isBack) return;
      if (!fromEdge && Math.abs(dx) < 110) return;
      if (window.history.length <= 1) return;

      router.back();
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [dir, pathname, router]);

  return null;
}
