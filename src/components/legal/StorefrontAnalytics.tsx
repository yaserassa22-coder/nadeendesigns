"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import {
  CONSENT_CHANGED_EVENT,
  mayLoadAnalyticsScripts,
} from "@/lib/legal/cookie-consent";

type Props = {
  bannerEnabled: boolean;
  googleAnalyticsId: string;
  googleAnalyticsEnabled: boolean;
  metaPixelId: string;
  metaPixelEnabled: boolean;
};

function normalizeGaId(raw: string): string {
  return raw.trim();
}

function normalizePixelId(raw: string): string {
  return raw.trim();
}

/**
 * Loads GA / Meta Pixel only when admin activated them and consent allows.
 */
export function StorefrontAnalytics({
  bannerEnabled,
  googleAnalyticsId,
  googleAnalyticsEnabled,
  metaPixelId,
  metaPixelEnabled,
}: Props) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setAllowed(mayLoadAnalyticsScripts({ bannerEnabled }));
    };
    refresh();
    window.addEventListener(CONSENT_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [bannerEnabled]);

  const gaId =
    googleAnalyticsEnabled && allowed
      ? normalizeGaId(googleAnalyticsId)
      : "";
  const pixelId =
    metaPixelEnabled && allowed ? normalizePixelId(metaPixelId) : "";

  const gaOk = /^G-[A-Z0-9]+$/i.test(gaId) || /^UA-\d+-\d+$/i.test(gaId);
  const pixelOk = /^\d{5,20}$/.test(pixelId);

  return (
    <>
      {gaOk ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="nadeen-ga4" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', { anonymize_ip: true });
            `}
          </Script>
        </>
      ) : null}
      {pixelOk ? (
        <Script id="nadeen-meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      ) : null}
    </>
  );
}
