"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, type MutableRefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SITE_NAME } from "@/lib/constants";
import { formatMessage } from "@/lib/i18n";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

export type CustomDesignSectionProps = {
  /** Up to 5 CMS images — one visual beat per scroll stage. */
  imageUrls?: (string | null | undefined)[];
  /** @deprecated Prefer `imageUrls[0]` */
  imageUrl?: string | null;
  imageAlt?: string;
  /** @deprecated Prefer `imageUrls[2]` */
  craftImageUrl?: string | null;
  /** @deprecated Prefer `imageUrls[3]` */
  dressImageUrl?: string | null;
};

const STAGES = ["01", "02", "03", "04", "05"] as const;
const MAX_IMAGES = 5;

function WordReveal({
  text,
  wordsRef,
}: {
  text: string;
  wordsRef: MutableRefObject<HTMLSpanElement[]>;
}) {
  wordsRef.current = [];
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((part, i) => {
        if (/^\s+$/.test(part)) return <span key={`s-${i}`}>{part}</span>;
        return (
          <span
            key={`w-${i}`}
            ref={(el) => {
              if (el) wordsRef.current.push(el);
            }}
            className="inline-block will-change-transform"
          >
            {part}
          </span>
        );
      })}
    </>
  );
}

/** Normalize up to 5 unique URLs; pad later slots by reusing the last distinct. */
function resolveStageImages(props: CustomDesignSectionProps): string[] {
  const fromList = (props.imageUrls ?? [])
    .map((u) => u?.trim() || "")
    .filter(Boolean);
  const legacy = [props.imageUrl, props.craftImageUrl, props.dressImageUrl]
    .map((u) => u?.trim() || "")
    .filter(Boolean);

  const raw = fromList.length ? fromList : legacy;
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const url of raw) {
    if (seen.has(url)) continue;
    seen.add(url);
    unique.push(url);
    if (unique.length >= MAX_IMAGES) break;
  }

  if (!unique.length) return ["", "", "", "", ""];

  const out: string[] = [];
  for (let i = 0; i < MAX_IMAGES; i++) {
    out.push(unique[i] ?? unique[unique.length - 1]!);
  }
  return out;
}

/**
 * Text unlocks ONE line per scroll stage (accumulates).
 * Imagery: up to 5 photos — one reveal per stage (01–05).
 * CTAs appear only on the final step — never the full stack at once.
 */
export function CustomDesignSection(props: CustomDesignSectionProps) {
  const { imageAlt } = props;
  const { t, dir, locale } = useLocale();
  const displayFont =
    locale === "ar"
      ? "font-[family-name:var(--font-amiri)]"
      : "font-[family-name:var(--font-cormorant)]";

  const [src0, src1, src2, src3, src4] = resolveStageImages(props);
  const stageKey = [src0, src1, src2, src3, src4].join("|");

  const sectionRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);

  const layer0Ref = useRef<HTMLDivElement | null>(null);
  const layer1Ref = useRef<HTMLDivElement | null>(null);
  const layer2Ref = useRef<HTMLDivElement | null>(null);
  const layer3MaskRef = useRef<HTMLDivElement | null>(null);
  const layer3Ref = useRef<HTMLDivElement | null>(null);
  const layer4Ref = useRef<HTMLDivElement | null>(null);
  const dimRef = useRef<HTMLDivElement | null>(null);

  const eyebrowWrapRef = useRef<HTMLDivElement | null>(null);
  const eyebrowRef = useRef<HTMLParagraphElement | null>(null);
  const eyebrowLineRef = useRef<HTMLSpanElement | null>(null);
  const titleWrapRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const leadWrapRef = useRef<HTMLDivElement | null>(null);
  const bodyWrapRef = useRef<HTMLDivElement | null>(null);
  const ctasWrapRef = useRef<HTMLDivElement | null>(null);
  const ctaARef = useRef<HTMLAnchorElement | null>(null);
  const ctaBRef = useRef<HTMLAnchorElement | null>(null);

  const leadWordsRef = useRef<HTMLSpanElement[]>([]);
  const progressFillRef = useRef<HTMLDivElement | null>(null);
  const stageLabelRef = useRef<HTMLSpanElement | null>(null);
  const stageNumRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const frame = frameRef.current;
    if (!section || !frame) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const xIn = dir === "rtl" ? 28 : -28;

    const setStage = (idx: number) => {
      stageNumRefs.current.forEach((el, i) => {
        if (!el) return;
        const on = i === idx;
        el.classList.toggle("text-gold", on);
        el.classList.toggle("opacity-100", on);
        el.classList.toggle("scale-125", on);
        el.classList.toggle("text-ivory", !on);
        el.classList.toggle("opacity-30", !on);
        el.classList.toggle("scale-100", !on);
      });
      if (stageLabelRef.current) {
        stageLabelRef.current.textContent = STAGES[idx] ?? "01";
      }
    };

    const allText = [
      eyebrowWrapRef.current,
      titleWrapRef.current,
      leadWrapRef.current,
      bodyWrapRef.current,
      ctasWrapRef.current,
    ];

    if (reduce) {
      gsap.set(layer0Ref.current, { opacity: 0.15 });
      gsap.set(layer1Ref.current, { opacity: 0 });
      gsap.set(layer2Ref.current, { opacity: 0 });
      gsap.set(layer3MaskRef.current, { clipPath: "inset(0% 0% 0% 0%)" });
      gsap.set(layer4Ref.current, { opacity: 1 });
      gsap.set(allText, { opacity: 1, y: 0, x: 0, clipPath: "none", filter: "none" });
      gsap.set(leadWordsRef.current, { opacity: 1, y: 0, filter: "none" });
      gsap.set([ctaARef.current, ctaBRef.current], { opacity: 1, y: 0 });
      gsap.set(eyebrowLineRef.current, { scaleX: 1 });
      gsap.set(progressFillRef.current, { scaleY: 1 });
      setStage(4);
      return;
    }

    const ctx = gsap.context(() => {
      const craftFrom = dir === "rtl" ? 36 : -36;

      gsap.set(layer0Ref.current, { opacity: 1, scale: 1.12 });
      gsap.set(layer1Ref.current, { opacity: 0, scale: 1.1 });
      gsap.set(layer2Ref.current, {
        opacity: 0,
        xPercent: craftFrom,
        scale: 1.08,
      });
      gsap.set(layer3MaskRef.current, {
        clipPath: "circle(0% at 65% 50%)",
      });
      gsap.set(layer3Ref.current, { scale: 1.18 });
      gsap.set(layer4Ref.current, { opacity: 0, scale: 1.08 });
      gsap.set(dimRef.current, { opacity: 0.2 });

      gsap.set(eyebrowWrapRef.current, { opacity: 0, y: 20 });
      gsap.set(eyebrowRef.current, { letterSpacing: "0.55em" });
      gsap.set(eyebrowLineRef.current, {
        scaleX: 0,
        transformOrigin: dir === "rtl" ? "100% 50%" : "0% 50%",
      });

      gsap.set(titleWrapRef.current, {
        opacity: 1,
        clipPath: dir === "rtl" ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)",
      });
      gsap.set(titleRef.current, {
        opacity: 0.5,
        y: 40,
        scale: 0.92,
      });

      gsap.set(leadWrapRef.current, { opacity: 1 });
      gsap.set(leadWordsRef.current, {
        opacity: 0,
        y: 22,
        filter: "blur(8px)",
      });

      gsap.set(bodyWrapRef.current, {
        opacity: 0,
        y: 28,
        clipPath: "inset(100% 0 0 0)",
      });

      gsap.set(ctasWrapRef.current, { opacity: 0 });
      gsap.set([ctaARef.current, ctaBRef.current], {
        opacity: 0,
        y: 20,
        x: xIn * 0.4,
      });

      gsap.set(progressFillRef.current, {
        scaleY: 0,
        transformOrigin: "top center",
      });
      setStage(0);

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: frame,
          start: "top 14%",
          end: mobile ? "+=300%" : "+=380%",
          pin: true,
          scrub: mobile ? 0.5 : 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const p = self.progress;
            if (progressFillRef.current) {
              gsap.set(progressFillRef.current, { scaleY: p });
            }
            if (p < 0.18) setStage(0);
            else if (p < 0.36) setStage(1);
            else if (p < 0.54) setStage(2);
            else if (p < 0.74) setStage(3);
            else setStage(4);
          },
        },
      });

      // ─── 01 ATELIER → image 1 + eyebrow ───
      tl.to(layer0Ref.current, { scale: 1.18, duration: 0.14 }, 0);
      tl.to(dimRef.current, { opacity: 0.28, duration: 0.1 }, 0);
      tl.to(eyebrowWrapRef.current, { opacity: 1, y: 0, duration: 0.08 }, 0.05);
      tl.to(
        eyebrowRef.current,
        { letterSpacing: "0.3em", duration: 0.1 },
        0.05
      );
      tl.to(eyebrowLineRef.current, { scaleX: 1, duration: 0.1 }, 0.08);
      tl.to({}, { duration: 0.06 }, 0.14);

      // ─── 02 IDEA → image 2 + title ───
      tl.to(
        layer1Ref.current,
        { opacity: 1, scale: 1.04, duration: 0.12 },
        0.18
      );
      tl.to(
        layer0Ref.current,
        { opacity: 0.35, scale: 1.22, duration: 0.12 },
        0.18
      );
      tl.to(dimRef.current, { opacity: 0.4, duration: 0.1 }, 0.18);
      tl.to(
        titleWrapRef.current,
        { clipPath: "inset(0% 0% 0% 0%)", duration: 0.12 },
        0.2
      );
      tl.to(
        titleRef.current,
        { opacity: 1, y: 0, scale: 1, duration: 0.12 },
        0.2
      );
      tl.to({}, { duration: 0.06 }, 0.3);

      // ─── 03 CRAFT → image 3 + lead ───
      tl.to(
        layer2Ref.current,
        { opacity: 1, xPercent: 0, scale: 1.04, duration: 0.14 },
        0.36
      );
      tl.to(layer1Ref.current, { opacity: 0.18, duration: 0.1 }, 0.36);
      tl.to(layer0Ref.current, { opacity: 0.12, duration: 0.1 }, 0.36);
      tl.to(dimRef.current, { opacity: 0.32, duration: 0.08 }, 0.36);
      {
        const words = leadWordsRef.current;
        const step = 0.12 / Math.max(words.length, 1);
        words.forEach((w, i) => {
          tl.to(
            w,
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              duration: Math.max(0.045, step * 2),
            },
            0.38 + i * step
          );
        });
      }
      tl.to({}, { duration: 0.05 }, 0.5);

      // ─── 04 DRESS → image 4 + body ───
      tl.to(
        layer3MaskRef.current,
        { clipPath: "circle(150% at 65% 50%)", duration: 0.16 },
        0.54
      );
      tl.to(layer3Ref.current, { scale: 1.03, duration: 0.16 }, 0.54);
      tl.to(layer2Ref.current, { opacity: 0.12, duration: 0.1 }, 0.56);
      tl.to(layer1Ref.current, { opacity: 0.05, duration: 0.08 }, 0.56);
      tl.to(layer0Ref.current, { opacity: 0.05, duration: 0.08 }, 0.56);
      tl.to(dimRef.current, { opacity: 0.35, duration: 0.08 }, 0.56);
      tl.to(
        bodyWrapRef.current,
        {
          opacity: 1,
          y: 0,
          clipPath: "inset(0% 0 0 0)",
          duration: 0.1,
        },
        0.58
      );
      tl.to(layer3Ref.current, { scale: 1.0, duration: 0.08 }, 0.66);

      // ─── 05 CUSTOM → image 5 + CTAs ───
      tl.to(
        layer4Ref.current,
        { opacity: 1, scale: 1.0, duration: 0.12 },
        0.74
      );
      tl.to(dimRef.current, { opacity: 0.48, duration: 0.08 }, 0.74);
      tl.to(layer2Ref.current, { opacity: 0, duration: 0.06 }, 0.76);
      tl.to(layer1Ref.current, { opacity: 0, duration: 0.06 }, 0.76);
      tl.to(ctasWrapRef.current, { opacity: 1, duration: 0.04 }, 0.78);
      tl.to(
        ctaARef.current,
        { opacity: 1, y: 0, x: 0, duration: 0.08 },
        0.8
      );
      tl.to(
        ctaBRef.current,
        { opacity: 1, y: 0, x: 0, duration: 0.08 },
        0.86
      );
    }, section);

    return () => ctx.revert();
  }, [dir, stageKey, t.home.customLead]);

  const alt = imageAlt || SITE_NAME;
  const bodyText = formatMessage(t.home.customBody, { name: SITE_NAME });

  const objectPos = [
    "object-[center_28%]",
    "object-[center_35%]",
    "object-[center_45%]",
    "object-[center_20%]",
    "object-[center_30%]",
  ] as const;

  return (
    <section
      ref={sectionRef}
      className="bg-ivory pt-8 pb-8 sm:pt-12 sm:pb-12 md:pt-16 md:pb-16"
      aria-labelledby="custom-design-heading"
    >
      <div className="w-full px-1 sm:px-1.5">
        <div
          ref={frameRef}
          className="relative min-h-[88vw] overflow-hidden bg-charcoal sm:min-h-[58vw] lg:min-h-[42rem]"
        >
          {/* 01 */}
          <div ref={layer0Ref} className="absolute inset-0 will-change-transform">
            {src0 ? (
              <Image
                src={src0}
                alt={alt}
                fill
                priority
                quality={90}
                sizes="100vw"
                className={cn("object-cover", objectPos[0])}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-beige via-beige-dark/50 to-charcoal/40" />
            )}
          </div>

          {/* 02 */}
          <div
            ref={layer1Ref}
            className="absolute inset-0 will-change-transform"
            aria-hidden
          >
            {src1 ? (
              <Image
                src={src1}
                alt=""
                fill
                quality={88}
                sizes="100vw"
                className={cn("object-cover", objectPos[1])}
              />
            ) : null}
          </div>

          {/* 03 */}
          <div
            ref={layer2Ref}
            className="absolute inset-0 will-change-transform"
            aria-hidden
          >
            {src2 ? (
              <Image
                src={src2}
                alt=""
                fill
                quality={88}
                sizes="100vw"
                className={cn("object-cover", objectPos[2])}
              />
            ) : null}
          </div>

          {/* 04 */}
          <div
            ref={layer3MaskRef}
            className="absolute inset-0 will-change-[clip-path]"
            aria-hidden
          >
            <div ref={layer3Ref} className="absolute inset-0 will-change-transform">
              {src3 ? (
                <Image
                  src={src3}
                  alt=""
                  fill
                  quality={90}
                  sizes="100vw"
                  className={cn("object-cover", objectPos[3])}
                />
              ) : null}
            </div>
          </div>

          {/* 05 */}
          <div
            ref={layer4Ref}
            className="absolute inset-0 will-change-transform"
            aria-hidden
          >
            {src4 ? (
              <Image
                src={src4}
                alt=""
                fill
                quality={90}
                sizes="100vw"
                className={cn("object-cover", objectPos[4])}
              />
            ) : null}
          </div>

          <div
            ref={dimRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-charcoal"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal/50 via-transparent to-charcoal/20"
          />

          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 z-[1] w-[min(100%,26rem)] inset-inline-start-0",
              dir === "rtl"
                ? "bg-gradient-to-l from-charcoal/50 via-charcoal/20 to-transparent"
                : "bg-gradient-to-r from-charcoal/50 via-charcoal/20 to-transparent"
            )}
          />

          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 z-[2] flex w-full max-w-xl flex-col justify-center",
              "gap-4 px-5 py-10 sm:gap-5 sm:px-8 md:px-10 lg:max-w-lg lg:px-12",
              "inset-inline-start-0 text-start"
            )}
          >
            <div ref={eyebrowWrapRef}>
              <p
                ref={eyebrowRef}
                className="text-[10px] font-medium uppercase text-ivory/90 md:text-[11px]"
              >
                {t.home.customEyebrow}
              </p>
              <span
                ref={eyebrowLineRef}
                aria-hidden
                className="mt-2 block h-px w-16 bg-gold sm:w-20"
              />
            </div>

            <div ref={titleWrapRef} className="overflow-hidden">
              <h2
                ref={titleRef}
                id="custom-design-heading"
                className={cn(
                  displayFont,
                  "text-4xl leading-[1.05] text-ivory md:text-5xl lg:text-6xl"
                )}
              >
                {t.nav.customDesign}
              </h2>
            </div>

            <div ref={leadWrapRef}>
              <p
                className={cn(
                  displayFont,
                  "max-w-[28ch] text-lg leading-snug text-ivory/90 md:text-xl lg:text-2xl"
                )}
              >
                <WordReveal text={t.home.customLead} wordsRef={leadWordsRef} />
              </p>
            </div>

            <div ref={bodyWrapRef}>
              <p className="max-w-[36ch] text-xs leading-relaxed text-ivory/65 md:text-sm">
                {bodyText}
              </p>
            </div>

            <div
              ref={ctasWrapRef}
              className="pointer-events-auto mt-1 flex flex-wrap gap-x-6 gap-y-3"
            >
              <Link
                ref={ctaARef}
                href="/custom-design"
                className="group relative text-sm tracking-[0.12em] text-ivory transition-colors hover:text-gold md:text-base"
              >
                {t.home.customStartCta}
                <span
                  aria-hidden
                  className="absolute inset-x-0 -bottom-1 h-[2px] origin-left scale-x-0 bg-gold transition-transform duration-500 group-hover:scale-x-100"
                />
              </Link>
              <Link
                ref={ctaBRef}
                href="/booking?service=custom_design"
                className="group relative text-sm tracking-[0.12em] text-ivory/65 transition-colors hover:text-ivory md:text-base"
              >
                {t.home.customBookCta}
                <span
                  aria-hidden
                  className="absolute inset-x-0 -bottom-1 h-px origin-left scale-x-0 bg-ivory/70 transition-transform duration-500 group-hover:scale-x-100"
                />
              </Link>
            </div>
          </div>

          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute z-[5] flex flex-col items-center gap-3",
              "top-1/2 -translate-y-1/2 inset-inline-end-3 sm:inset-inline-end-5"
            )}
          >
            <span
              ref={stageLabelRef}
              className={cn(displayFont, "text-sm tracking-[0.2em] text-gold/90")}
            >
              01
            </span>
            <div className="flex flex-col items-center gap-2">
              {STAGES.map((n, i) => (
                <span
                  key={n}
                  ref={(el) => {
                    stageNumRefs.current[i] = el;
                  }}
                  className="text-[9px] tracking-[0.18em] text-ivory opacity-30 transition-all duration-300"
                >
                  {n}
                </span>
              ))}
            </div>
            <div className="h-20 w-px overflow-hidden bg-ivory/20">
              <div
                ref={progressFillRef}
                className="h-full w-full origin-top bg-gradient-to-b from-gold to-ivory"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
