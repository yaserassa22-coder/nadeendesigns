"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  persistCookieConsent,
  readCookieConsent,
  CONSENT_VERSION,
} from "@/lib/legal/cookie-consent";

/**
 * Minimal storefront cookie notice.
 * Necessary cookies (auth, guest_id, locale) are never blocked.
 */
export function CookieConsentBanner({
  enabled,
  analyticsConfigured,
}: {
  enabled: boolean;
  /** When true, copy mentions optional analytics cookies. */
  analyticsConfigured?: boolean;
}) {
  const { t, dir } = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setVisible(!readCookieConsent());
    }, 0);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  useEffect(() => {
    if (visible) {
      document.body.dataset.cookieBanner = "open";
    } else {
      delete document.body.dataset.cookieBanner;
    }
    return () => {
      delete document.body.dataset.cookieBanner;
    };
  }, [visible]);

  if (!enabled || !visible) return null;

  const decide = (choice: "accepted" | "declined") => {
    persistCookieConsent({
      v: CONSENT_VERSION,
      necessary: true,
      analytics: choice === "accepted",
      choice,
      decidedAt: new Date().toISOString(),
    });
    setVisible(false);
  };

  return (
    <div
      data-storefront-chrome
      role="dialog"
      aria-live="polite"
      aria-label={t.cookieConsent.accept}
      dir={dir}
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-beige-dark/70 bg-ivory/95 px-4 py-4 shadow-[0_-8px_30px_rgba(44,36,25,0.08)] backdrop-blur-sm md:px-8"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="min-w-0 flex-1 md:pe-20">
          <p className="text-sm leading-relaxed text-charcoal">
            {analyticsConfigured
              ? t.cookieConsent.messageWithAnalytics
              : t.cookieConsent.message}
          </p>
          <p className="mt-1 text-xs text-muted">
            {analyticsConfigured
              ? t.cookieConsent.analyticsNote
              : t.cookieConsent.necessaryNote}{" "}
            <Link
              href="/legal/privacy"
              className="text-gold underline-offset-2 hover:underline"
            >
              {t.cookieConsent.privacyLink}
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3 self-stretch md:self-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => decide("declined")}
            className="min-w-28"
          >
            {t.cookieConsent.decline}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => decide("accepted")}
            className="min-w-28"
          >
            {t.cookieConsent.accept}
          </Button>
        </div>
      </div>
    </div>
  );
}
