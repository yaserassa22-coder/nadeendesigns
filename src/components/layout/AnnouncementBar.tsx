"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type CSSProperties,
  type ReactNode,
} from "react";
import { pickCmsOrUi } from "@/lib/cms/locale-text";
import { localeDir, type Locale } from "@/lib/i18n";
import type {
  StoreAnnouncementItem,
  StoreAnnouncementSettings,
} from "@/types/store";
import { cn } from "@/lib/utils";

type AnnouncementBarProps = {
  announcement: StoreAnnouncementSettings;
  locale: Locale;
};

const DEFAULTS = {
  background_color: "#f0ebe3",
  text_color: "#2c2419",
} as const;

const FADE_MS = 400;

function resolveItemText(item: StoreAnnouncementItem, locale: Locale): string {
  return pickCmsOrUi(
    {
      ar: item.text_ar,
      he: item.text_he,
      en: item.text_en,
    },
    locale,
    { ar: "", he: "", en: "" }
  ).trim();
}

function isExternalLink(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function normalizeInternalHref(link: string): string {
  return link.startsWith("/") ? link : `/${link.replace(/^\//, "")}`;
}

type ActiveAnnouncement = {
  id: string;
  text: string;
  link: string;
};

function getActiveAnnouncements(
  announcement: StoreAnnouncementSettings,
  locale: Locale
): ActiveAnnouncement[] {
  return [...announcement.items]
    .filter((item) => item.enabled)
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      id: item.id,
      text: resolveItemText(item, locale),
      link: item.link.trim(),
    }))
    .filter((item) => item.text.length > 0);
}

function useAnnouncementHeaderOffset(active: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const supportsScrollTimeline =
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      (CSS.supports("animation-timeline", "scroll()") ||
        CSS.supports("animation-timeline: scroll()"));

    if (supportsScrollTimeline) return;

    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const sync = (atTop: boolean) => {
      if (atTop) document.body.dataset.announcementAtTop = "true";
      else delete document.body.dataset.announcementAtTop;
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        sync(Boolean(entry?.isIntersecting));
      },
      { root: null, threshold: 0 }
    );

    io.observe(el);
    return () => {
      io.disconnect();
      delete document.body.dataset.announcementAtTop;
    };
  }, [active]);

  return ref;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return reduced;
}

function AnnouncementSegmentLabel({ item }: { item: ActiveAnnouncement }) {
  if (!item.link) {
    return <span className="whitespace-nowrap">{item.text}</span>;
  }

  if (isExternalLink(item.link)) {
    return (
      <a
        href={item.link}
        className="whitespace-nowrap no-underline hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
        aria-label={item.text}
      >
        {item.text}
      </a>
    );
  }

  return (
    <Link
      href={normalizeInternalHref(item.link)}
      className="whitespace-nowrap no-underline hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
      aria-label={item.text}
    >
      {item.text}
    </Link>
  );
}

function MarqueeTrack({
  items,
  dir,
  durationSeconds,
  paused,
}: {
  items: ActiveAnnouncement[];
  dir: "ltr" | "rtl";
  durationSeconds: number;
  paused: boolean;
}) {
  const group = (
    <span className="nd-announcement-marquee-group inline-flex shrink-0 items-center justify-center gap-10 px-10">
      {items.map((item, i) => (
        <span key={`${item.id}-${i}`} className="inline-flex items-center gap-10">
          <AnnouncementSegmentLabel item={item} />
          <span aria-hidden className="opacity-35">
            ·
          </span>
        </span>
      ))}
    </span>
  );

  const accessibleLabel = items.map((i) => i.text).join(" · ");

  return (
    <span className="nd-announcement-marquee-shell relative block w-full overflow-hidden">
      <span className="sr-only">{accessibleLabel}</span>
      <span
        dir={dir}
        aria-hidden
        className={cn(
          "nd-announcement-marquee-track inline-flex w-max",
          dir === "rtl"
            ? "nd-announcement-marquee-rtl"
            : "nd-announcement-marquee-ltr"
        )}
        style={
          {
            "--nd-marquee-duration": `${durationSeconds}s`,
            animationPlayState: paused ? "paused" : "running",
          } as CSSProperties
        }
      >
        {group}
        {group}
      </span>
    </span>
  );
}

function StaticAnnouncement({
  item,
  fading,
  reduceMotion,
  className,
  style,
  mobileAttr,
  desktopAttr,
}: {
  item: ActiveAnnouncement;
  fading: boolean;
  reduceMotion: boolean;
  className: string;
  style: CSSProperties;
  mobileAttr: { "data-announcement-bar-mobile"?: true };
  desktopAttr: { "data-announcement-bar-desktop"?: true };
}) {
  const opacityClass =
    reduceMotion || !fading ? "opacity-100" : "opacity-0";
  const transitionClass = reduceMotion
    ? ""
    : "transition-opacity duration-[400ms] ease-in-out";

  const inner = (
    <span className="block max-w-full truncate md:whitespace-normal md:overflow-visible md:text-clip">
      {item.text}
    </span>
  );

  const sharedClass = cn(className, transitionClass, opacityClass);
  const hasLink = item.link.length > 0;

  if (hasLink) {
    if (isExternalLink(item.link)) {
      return (
        <a
          href={item.link}
          data-announcement-bar
          {...mobileAttr}
          {...desktopAttr}
          className={sharedClass}
          style={style}
          aria-label={item.text}
        >
          {inner}
        </a>
      );
    }

    return (
      <Link
        href={normalizeInternalHref(item.link)}
        data-announcement-bar
        {...mobileAttr}
        {...desktopAttr}
        className={sharedClass}
        style={style}
        aria-label={item.text}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div
      data-announcement-bar
      {...mobileAttr}
      {...desktopAttr}
      className={sharedClass}
      style={style}
    >
      {inner}
    </div>
  );
}

export function AnnouncementBar({
  announcement,
  locale,
}: AnnouncementBarProps) {
  const reduceMotion = usePrefersReducedMotion();
  const dir = localeDir(locale);
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [paused, setPaused] = useState(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeItems = useMemo(
    () => getActiveAnnouncements(announcement, locale),
    [announcement, locale]
  );

  const barEnabled =
    announcement.enabled &&
    (announcement.desktop_enabled || announcement.mobile_enabled);

  const visible = barEnabled && activeItems.length > 0;
  const shellRef = useAnnouncementHeaderOffset(visible);

  const marqueeEnabled = Boolean(announcement.marquee_enabled) && !reduceMotion;

  // Fade-rotation only when marquee is off (marquee already shows all items).
  const shouldRotate =
    visible &&
    !marqueeEnabled &&
    announcement.rotation_enabled &&
    activeItems.length >= 2;

  const durationSeconds = Math.min(
    180,
    Math.max(5, Math.round(announcement.marquee_duration_seconds || 30))
  );

  useEffect(() => {
    if (activeItems.length === 0) {
      setIndex(0);
      return;
    }
    setIndex((i) => (i >= activeItems.length ? 0 : i));
  }, [activeItems.length]);

  useEffect(() => {
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    setFading(false);

    if (!shouldRotate || paused) return;

    const intervalMs = Math.max(4, announcement.rotation_interval) * 1000;

    const tickId = window.setInterval(() => {
      if (reduceMotion) {
        setIndex((i) => (i + 1) % activeItems.length);
        return;
      }

      setFading(true);
      fadeTimerRef.current = setTimeout(() => {
        setIndex((i) => (i + 1) % activeItems.length);
        setFading(false);
        fadeTimerRef.current = null;
      }, FADE_MS);
    }, intervalMs);

    return () => {
      window.clearInterval(tickId);
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    };
  }, [
    shouldRotate,
    paused,
    announcement.rotation_interval,
    activeItems.length,
    reduceMotion,
  ]);

  if (!visible) return null;

  const { desktop_enabled, mobile_enabled } = announcement;
  const bg =
    announcement.background_color.trim() || DEFAULTS.background_color;
  const color = announcement.text_color.trim() || DEFAULTS.text_color;

  const barClassName = cn(
    "relative z-[60] flex h-8 w-full max-w-full min-w-0 items-center justify-center overflow-hidden border-b border-beige-dark/40 text-center md:h-[2.125rem]",
    !mobile_enabled && "max-md:hidden",
    !desktop_enabled && "md:hidden",
    "text-[11px] font-medium uppercase tracking-[0.16em] leading-none sm:text-xs sm:tracking-[0.18em]",
    marqueeEnabled ? "px-0" : "px-3 md:px-6"
  );

  const style = {
    backgroundColor: bg,
    color,
  } as const;

  const mobileAttr = mobile_enabled
    ? { "data-announcement-bar-mobile": true as const }
    : {};
  const desktopAttr = desktop_enabled
    ? { "data-announcement-bar-desktop": true as const }
    : {};

  const pauseHandlers =
    shouldRotate || marqueeEnabled
      ? {
          onMouseEnter: () => {
            if (
              window.matchMedia("(hover: hover) and (pointer: fine)").matches
            ) {
              setPaused(true);
            }
          },
          onMouseLeave: () => setPaused(false),
          onFocusCapture: () => setPaused(true),
          onBlurCapture: (e: FocusEvent<HTMLDivElement>) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setPaused(false);
            }
          },
        }
      : {};

  let content: ReactNode;

  if (marqueeEnabled) {
    content = (
      <div
        data-announcement-bar
        {...mobileAttr}
        {...desktopAttr}
        className={barClassName}
        style={style}
      >
        <MarqueeTrack
          items={activeItems}
          dir={dir}
          durationSeconds={durationSeconds}
          paused={paused}
        />
      </div>
    );
  } else {
    const current = activeItems[Math.min(index, activeItems.length - 1)];
    if (!current) return null;
    content = (
      <StaticAnnouncement
        item={current}
        fading={fading}
        reduceMotion={reduceMotion}
        className={cn(
          barClassName,
          current.link &&
            "no-underline hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-1"
        )}
        style={style}
        mobileAttr={mobileAttr}
        desktopAttr={desktopAttr}
      />
    );
  }

  return (
    <div ref={shellRef} className="w-full" {...pauseHandlers}>
      {content}
    </div>
  );
}
