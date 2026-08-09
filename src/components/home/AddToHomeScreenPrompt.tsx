"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "nadeen_pwa_install_dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return true;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || iosStandalone;
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}

/**
 * Homepage install chip — Android uses native install prompt; iPhone shows Share → Add to Home Screen.
 */
export function AddToHomeScreenPrompt() {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );

  useEffect(() => {
    if (isStandaloneDisplay()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    // iOS never fires beforeinstallprompt — show quiet chip after a short delay.
    const iosTimer = window.setTimeout(() => {
      if (isIosDevice() && !isStandaloneDisplay()) {
        setVisible(true);
      }
    }, 2200);

    // Desktop/Android without BIP yet: still allow later BIP; optional soft show after delay
    // only when we already have deferred (handled in BIP). Don't spam desktop Chrome without prompt.

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    setIosHelp(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const onInstallClick = async () => {
    if (deferred) {
      await deferred.prompt();
      try {
        await deferred.userChoice;
      } catch {
        /* ignore */
      }
      setDeferred(null);
      dismiss();
      return;
    }
    if (isIosDevice()) {
      setIosHelp(true);
    }
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[45] flex justify-center px-3",
        "bottom-[5.5rem] sm:bottom-8"
      )}
      role="region"
      aria-label={t.home.pwaAddTitle}
    >
      <div className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-beige-dark/80 bg-ivory/95 shadow-[0_12px_40px_rgba(40,30,20,0.12)] backdrop-blur-md">
        <div className="flex items-start gap-3 p-3.5 sm:p-4">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-beige-dark bg-beige">
            <Image
              src="/icons/apple-touch-icon.png"
              alt=""
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.08em] text-charcoal uppercase">
              {t.home.pwaAddTitle}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              {iosHelp ? t.home.pwaIosHint : t.home.pwaAddBody}
            </p>
            {iosHelp ? (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] tracking-[0.06em] text-charcoal">
                <Share className="h-3.5 w-3.5 text-gold" aria-hidden />
                {t.home.pwaIosShare}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => void onInstallClick()}
                className="mt-2.5 inline-flex items-center gap-1.5 border-b border-gold/50 pb-0.5 text-[11px] tracking-[0.18em] text-charcoal uppercase transition-colors hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                {t.home.pwaInstall}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-beige hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            aria-label={t.home.pwaDismiss}
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        <p className="border-t border-beige-dark/60 px-3.5 py-2 text-[10px] tracking-[0.12em] text-muted/80 uppercase sm:px-4">
          {SITE_NAME}
        </p>
      </div>
    </div>
  );
}
