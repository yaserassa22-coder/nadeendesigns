"use client";

import type { ReactNode, SVGProps } from "react";
import { cn } from "@/lib/utils";

export type StorefrontSocialUrls = {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  pinterest?: string;
  youtube?: string;
};

function toHref(url: string | undefined): string | null {
  const raw = url?.trim() || "";
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  return `https://${raw.replace(/^\/+/, "")}`;
}

function iconProps(className?: string): SVGProps<SVGSVGElement> {
  return {
    viewBox: "0 0 24 24",
    className,
    "aria-hidden": true,
    focusable: "false",
  };
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)} fill="none">
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="5.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle
        cx="12"
        cy="12"
        r="4.25"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="17.35" cy="6.65" r="1.05" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)} fill="currentColor">
      <path d="M14.5 8.25h2.25V5.1h-2.25C12.2 5.1 10.5 6.86 10.5 9.15V11H8.25v3.15H10.5V21h3.15v-6.85h2.2L16.4 11h-2.75V9.15c0-.5.4-.9.85-.9Z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)} fill="currentColor">
      <path d="M19.59 6.69A4.83 4.83 0 0 1 15.82 2.4V2h-3.45v13.67a2.89 2.89 0 1 1-2.09-2.78v-3.52a6.34 6.34 0 1 0 5.54 6.3V8.73a8.28 8.28 0 0 0 4.77 1.5V6.78a4.86 4.86 0 0 1-1-.09Z" />
    </svg>
  );
}

function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)} fill="currentColor">
      <path d="M12.04 2C6.52 2 3 6.05 3 10.7c0 2.95 1.57 5.2 4.07 6.12.38.07.58-.17.66-.37.07-.17.4-1.63.4-1.63s-.1-.2-.1-.5c0-.47.27-.82.62-.82.29 0 .43.22.43.48 0 .29-.18.73-.28 1.13-.08.33.17.6.49.6 1.17 0 1.96-1.5 1.96-3.28 0-1.35-.9-2.36-2.54-2.36-1.85 0-3 1.38-3 2.9 0 .53.16 1.1.41 1.45.07.08.08.15.06.23l-.16.64c-.02.1-.08.13-.18.08-.68-.28-1-1.04-1-1.88 0-2.22 1.88-4.88 5.62-4.88 3 0 4.97 2.17 4.97 4.5 0 3.08-1.71 5.4-4.23 5.4-.85 0-1.64-.46-1.91-.98l-.52 2.04c-.19.73-.7 1.64-1.04 2.2.78.24 1.61.37 2.47.37 5.52 0 9.04-4.05 9.04-8.7C21.08 6.05 17.56 2 12.04 2Z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)} fill="currentColor">
      <path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.38.46A3.02 3.02 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14C4.5 20.4 12 20.4 12 20.4s7.5 0 9.38-.46a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8ZM9.75 15.57V8.43L15.84 12l-6.09 3.57Z" />
    </svg>
  );
}

const NETWORKS: {
  key: keyof StorefrontSocialUrls;
  label: string;
  Icon: (props: { className?: string }) => ReactNode;
}[] = [
  { key: "instagram", label: "Instagram", Icon: InstagramIcon },
  { key: "facebook", label: "Facebook", Icon: FacebookIcon },
  { key: "tiktok", label: "TikTok", Icon: TikTokIcon },
  { key: "pinterest", label: "Pinterest", Icon: PinterestIcon },
  { key: "youtube", label: "YouTube", Icon: YouTubeIcon },
];

type StorefrontSocialLinksProps = StorefrontSocialUrls & {
  className?: string;
  variant?: "dark" | "light";
  /** Icon-only row (header / journal) vs bordered buttons (footer). */
  appearance?: "buttons" | "plain";
};

export function StorefrontSocialLinks({
  className,
  variant = "dark",
  appearance = "buttons",
  ...urls
}: StorefrontSocialLinksProps) {
  const items = NETWORKS.flatMap((network) => {
    const href = toHref(urls[network.key]);
    if (!href) return [];
    return [{ ...network, href }];
  });

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Social"
      className={cn("flex flex-wrap items-center gap-3", className)}
    >
      {items.map(({ key, href, label, Icon }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className={cn(
            "inline-flex items-center justify-center transition-colors",
            appearance === "buttons"
              ? cn(
                  "h-10 w-10 rounded-full border",
                  variant === "dark"
                    ? "border-ivory/25 text-ivory hover:border-gold hover:text-gold"
                    : "border-beige-dark text-charcoal/70 hover:border-gold hover:text-gold"
                )
              : cn(
                  "min-h-11 min-w-11 text-charcoal/50 hover:text-gold",
                  variant === "dark" && "text-ivory/80 hover:text-gold"
                )
          )}
        >
          <Icon className="h-6 w-6" />
        </a>
      ))}
    </nav>
  );
}
