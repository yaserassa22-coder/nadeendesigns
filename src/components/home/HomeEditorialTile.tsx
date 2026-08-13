"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { UnifiedProductPhoto } from "@/components/home/UnifiedProductPhoto";
import { productDropShadow } from "@/lib/home/visual-unified-background";
import { cn } from "@/lib/utils";

type HomeEditorialTileProps = {
  href: string;
  imageUrl: string | null | undefined;
  /** Stored product URL — fallback if Cloudinary isolation fails. */
  originalImageUrl?: string | null | undefined;
  title: string;
  eyebrow?: string;
  ctaLabel?: string;
  ctaVariant?: "quiet" | "outline";
  secondaryHref?: string;
  secondaryCtaLabel?: string;
  titleSize?: "sm" | "md" | "lg";
  priority?: boolean;
  className?: string;
  aspectClassName?: string;
  sizes?: string;
  emphasize?: boolean;
  presentation?: "card" | "float";
  /** Cloudinary AI background removal for post-grid presentation. */
  productIsolation?: boolean;
  /** @deprecated Use productIsolation */
  softIsolate?: boolean;
  canvasColor?: string;
  imageScale?: number;
  imageOffsetX?: number;
  imageOffsetY?: number;
  dropShadow?: boolean;
  shadowIntensity?: number;
};

const FLOAT_CAPTION_ROW = "2.75rem";

function FloatCaption({
  title,
  eyebrow,
  ctaLabel,
  ctaVariant,
  secondaryHref,
  secondaryCtaLabel,
  href,
  titleSize,
  emphasize,
  dir,
}: {
  title: string;
  eyebrow?: string;
  ctaLabel?: string;
  ctaVariant: "quiet" | "outline";
  secondaryHref?: string;
  secondaryCtaLabel?: string;
  href: string;
  titleSize: "sm" | "md" | "lg";
  emphasize: boolean;
  dir: "ltr" | "rtl";
}) {
  const hasSecondary = Boolean(secondaryHref && secondaryCtaLabel);
  const showCta = emphasize || hasSecondary;

  return (
    <div
      className={cn(
        "relative z-20 flex h-full w-full shrink-0 flex-col items-center justify-center text-center",
        "px-1 isolation-isolate",
        emphasize ? "gap-0.5" : "gap-0"
      )}
      dir={dir}
      style={{ mixBlendMode: "normal" }}
    >
      {eyebrow ? (
        <p className="text-[8px] font-medium tracking-[0.24em] text-charcoal/50 uppercase md:text-[9px]">
          {eyebrow}
        </p>
      ) : null}
      <h3
        className={cn(
          "line-clamp-2 max-w-full font-[family-name:var(--font-cormorant)] font-normal leading-[1.3] text-charcoal",
          titleSize === "lg" && "text-sm md:text-[15px]",
          titleSize === "md" && "text-[12px] md:text-[13px]",
          titleSize === "sm" && "text-[11px] md:text-xs"
        )}
      >
        {title}
      </h3>
      {showCta && hasSecondary ? (
        <div className="mt-0.5 flex flex-wrap justify-center gap-x-3 gap-y-1">
          {ctaLabel ? (
            <Link
              href={href}
              className="relative z-20 border-b border-charcoal/30 pb-0.5 text-[9px] tracking-[0.12em] text-charcoal/70 uppercase transition-colors hover:border-charcoal hover:text-charcoal md:text-[10px]"
            >
              {ctaLabel}
            </Link>
          ) : null}
          <Link
            href={secondaryHref!}
            className="relative z-20 text-[9px] tracking-[0.12em] text-charcoal/50 uppercase transition-colors hover:text-charcoal md:text-[10px]"
          >
            {secondaryCtaLabel}
          </Link>
        </div>
      ) : showCta && ctaLabel ? (
        ctaVariant === "outline" ? (
          <span className="mt-0.5 inline-flex border border-charcoal/70 bg-transparent px-2.5 py-1 text-[9px] font-medium tracking-[0.14em] text-charcoal uppercase md:text-[10px]">
            {ctaLabel}
          </span>
        ) : (
          <span className="mt-0.5 border-b border-charcoal/30 pb-0.5 text-[9px] tracking-[0.12em] text-charcoal/70 uppercase transition-colors duration-300 group-hover:border-charcoal group-hover:text-charcoal md:text-[10px]">
            {ctaLabel}
          </span>
        )
      ) : null}
    </div>
  );
}

/**
 * Full-bleed editorial tile: photography first, restrained type + quiet CTA.
 */
export function HomeEditorialTile({
  href,
  imageUrl,
  originalImageUrl,
  title,
  eyebrow,
  ctaLabel,
  ctaVariant = "quiet",
  secondaryHref,
  secondaryCtaLabel,
  titleSize = "md",
  priority = false,
  className,
  aspectClassName = "aspect-[3/4]",
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 33vw",
  emphasize = false,
  presentation = "card",
  productIsolation,
  softIsolate,
  canvasColor: _canvasColor = "#FFFFFF",
  imageScale = 1,
  imageOffsetX = 0,
  imageOffsetY = 0,
  dropShadow = false,
  shadowIntensity = 28,
}: HomeEditorialTileProps) {
  const { dir } = useLocale();
  const cover = imageUrl?.trim() || "";
  const originalCover = originalImageUrl?.trim() || cover;
  const hasSecondary = Boolean(secondaryHref && secondaryCtaLabel);
  const isFloat = presentation === "float";
  const scale = Math.min(1.2, Math.max(0.7, imageScale));
  const ox = Math.min(20, Math.max(-20, imageOffsetX));
  const oy = Math.min(20, Math.max(-20, imageOffsetY));
  const isolateOn =
    productIsolation ?? softIsolate ?? false;
  const useIsolation = isFloat && isolateOn;
  const shadowFilter =
    useIsolation && dropShadow
      ? productDropShadow(shadowIntensity)
      : undefined;
  const legacyShadow =
    isFloat && dropShadow && !useIsolation
      ? productDropShadow(shadowIntensity)
      : undefined;

  const floatImage = (
    <div className="relative h-full min-h-0 w-full min-w-0 self-stretch">
      {cover ? (
        <div className="absolute inset-0 flex items-end justify-center">
          <div
            className="relative h-full w-full origin-bottom transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            style={{
              transform: `translate(${ox}%, ${oy}%) scale(${scale})`,
            }}
          >
            {useIsolation ? (
              <UnifiedProductPhoto
                src={cover}
                fallbackSrc={originalCover}
                alt={title}
                priority={priority}
                dropShadow={shadowFilter}
                className="absolute inset-0"
              />
            ) : (
              <div
                className="relative h-full w-full"
                style={{ filter: legacyShadow }}
              >
                <Image
                  src={cover}
                  alt={title}
                  fill
                  priority={priority}
                  quality={85}
                  sizes={sizes}
                  className="bg-transparent object-contain object-bottom"
                />
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );

  const floatContent = (
    <div
      className={cn("grid h-full w-full bg-transparent", aspectClassName)}
      style={{
        gridTemplateRows: `minmax(0, 1fr) ${FLOAT_CAPTION_ROW}`,
      }}
    >
      {floatImage}
      <FloatCaption
        title={title}
        eyebrow={eyebrow}
        ctaLabel={ctaLabel}
        ctaVariant={ctaVariant}
        secondaryHref={secondaryHref}
        secondaryCtaLabel={secondaryCtaLabel}
        href={href}
        titleSize={titleSize}
        emphasize={emphasize}
        dir={dir}
      />
    </div>
  );

  const cardMedia = (
    <div className={cn("relative w-full overflow-hidden", aspectClassName)}>
      {cover ? (
        <Image
          src={cover}
          alt={title}
          fill
          priority={priority}
          quality={85}
          sizes={sizes}
          className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-beige via-beige-dark/70 to-beige-dark" />
      )}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t to-transparent",
          emphasize
            ? "h-[42%] from-charcoal/45 via-charcoal/15"
            : "h-[36%] from-charcoal/35 via-charcoal/10"
        )}
      />

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 flex flex-col items-start",
          emphasize
            ? "gap-1.5 p-4 md:gap-2 md:p-6 lg:p-7"
            : "gap-1 p-3.5 md:gap-1.5 md:p-4 lg:p-5"
        )}
      >
        {eyebrow ? (
          <p className="text-[9px] font-medium tracking-[0.3em] text-ivory/70 uppercase md:text-[10px]">
            {eyebrow}
          </p>
        ) : null}
        <h3
          className={cn(
            "max-w-[20ch] font-[family-name:var(--font-cormorant)] leading-tight tracking-[0.08em] text-ivory uppercase",
            titleSize === "lg" && "text-xl md:text-2xl lg:text-[1.85rem]",
            titleSize === "md" && "text-base md:text-lg lg:text-xl",
            titleSize === "sm" && "text-sm md:text-base"
          )}
        >
          {title}
        </h3>
        {hasSecondary ? (
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2">
            {ctaLabel ? (
              <Link
                href={href}
                className="relative z-20 border-b border-ivory/45 pb-0.5 text-[10px] tracking-[0.18em] text-ivory/80 uppercase transition-colors hover:border-ivory hover:text-ivory md:text-[11px]"
              >
                {ctaLabel}
              </Link>
            ) : null}
            <Link
              href={secondaryHref!}
              className="relative z-20 text-[10px] tracking-[0.18em] text-ivory/65 uppercase transition-colors hover:text-ivory md:text-[11px]"
            >
              {secondaryCtaLabel}
            </Link>
          </div>
        ) : ctaLabel ? (
          ctaVariant === "outline" ? (
            <span className="mt-1 inline-flex border border-ivory/90 bg-ivory/95 px-4 py-2 text-[10px] font-medium tracking-[0.2em] text-charcoal uppercase transition-colors duration-300 group-hover:bg-ivory md:text-[11px]">
              {ctaLabel}
            </span>
          ) : (
            <span
              className={cn(
                "border-b border-ivory/45 pb-0.5 text-[10px] tracking-[0.2em] text-ivory/80 uppercase transition-colors duration-300 group-hover:border-ivory group-hover:text-ivory md:text-[11px]",
                emphasize ? "mt-1" : "mt-0.5"
              )}
            >
              {ctaLabel}
            </span>
          )
        ) : null}
      </div>
    </div>
  );

  const shellClass = cn(
    "group relative block h-full",
    isFloat ? "overflow-visible bg-transparent" : "overflow-hidden bg-white",
    className
  );

  const content = isFloat ? floatContent : cardMedia;

  if (hasSecondary) {
    return (
      <div className={shellClass}>
        <Link
          href={href}
          className="absolute inset-0 z-[1]"
          aria-label={title}
        />
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className={shellClass}>
      {content}
    </Link>
  );
}
