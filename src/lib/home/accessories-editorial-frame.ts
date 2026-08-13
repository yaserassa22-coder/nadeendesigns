import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type {
  AccessoriesEditorialFrameSettings,
  AccessoriesEditorialShape,
  AccessoriesEditorialSize,
} from "@/types/store";

export const ACCESSORIES_EDITORIAL_SIZES = [
  "intimate",
  "editorial",
  "grand",
] as const satisfies readonly AccessoriesEditorialSize[];

export const ACCESSORIES_EDITORIAL_SHAPES = [
  "canvas",
  "gallery",
  "atelier",
  "chapel",
  "cinema",
  "portrait",
  "oval",
] as const satisfies readonly AccessoriesEditorialShape[];

export const ACCESSORIES_EDITORIAL_SCALE_MIN = 40;
export const ACCESSORIES_EDITORIAL_SCALE_MAX = 160;
export const ACCESSORIES_EDITORIAL_SCALE_DEFAULT = 100;

export const ACCESSORIES_EDITORIAL_PRESET_SCALE: Record<
  AccessoriesEditorialSize,
  number
> = {
  intimate: 68,
  editorial: 100,
  grand: 138,
};

export const DEFAULT_ACCESSORIES_EDITORIAL_FRAME: AccessoriesEditorialFrameSettings =
  {
    size: "editorial",
    shape: "canvas",
    scale: ACCESSORIES_EDITORIAL_SCALE_DEFAULT,
  };

const SIZE_SET = new Set<string>(ACCESSORIES_EDITORIAL_SIZES);
const SHAPE_SET = new Set<string>(ACCESSORIES_EDITORIAL_SHAPES);

export function clampAccessoriesEditorialScale(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return ACCESSORIES_EDITORIAL_SCALE_DEFAULT;
  return Math.min(
    ACCESSORIES_EDITORIAL_SCALE_MAX,
    Math.max(ACCESSORIES_EDITORIAL_SCALE_MIN, Math.round(n))
  );
}

export function accessoriesEditorialSizeFromScale(
  scale: number
): AccessoriesEditorialSize {
  if (scale < 84) return "intimate";
  if (scale >= 120) return "grand";
  return "editorial";
}

export function normalizeAccessoriesEditorialFrame(
  raw: unknown
): AccessoriesEditorialFrameSettings {
  const s =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const size = SIZE_SET.has(String(s.size))
    ? (s.size as AccessoriesEditorialSize)
    : DEFAULT_ACCESSORIES_EDITORIAL_FRAME.size;
  const shape = SHAPE_SET.has(String(s.shape))
    ? (s.shape as AccessoriesEditorialShape)
    : DEFAULT_ACCESSORIES_EDITORIAL_FRAME.shape;
  const scale =
    s.scale === undefined || s.scale === null
      ? ACCESSORIES_EDITORIAL_PRESET_SCALE[size]
      : clampAccessoriesEditorialScale(s.scale);
  return { size, shape, scale };
}

const SHAPE_MAX: Record<
  AccessoriesEditorialShape,
  { storefront: string; preview: string }
> = {
  canvas: { storefront: "100%", preview: "100%" },
  gallery: { storefront: "96rem", preview: "34rem" },
  atelier: { storefront: "72rem", preview: "28rem" },
  chapel: { storefront: "64rem", preview: "26rem" },
  cinema: { storefront: "80rem", preview: "32rem" },
  portrait: { storefront: "36rem", preview: "14rem" },
  oval: { storefront: "72rem", preview: "30rem" },
};

export type AccessoriesEditorialFrameLayout = {
  sectionClassName: string;
  shellClassName: string;
  shellStyle?: CSSProperties;
  stageClassName: string;
  stageStyle?: CSSProperties;
  textClassName: string;
};

type FrameLayoutMode = "storefront" | "preview";

function scaleFactor(frame: AccessoriesEditorialFrameSettings): number {
  return clampAccessoriesEditorialScale(frame.scale) / 100;
}

function scaleVars(
  frame: AccessoriesEditorialFrameSettings,
  mode: FrameLayoutMode,
  extra?: CSSProperties
): CSSProperties {
  return {
    ["--ae-s" as string]: String(scaleFactor(frame)),
    ["--ae-max" as string]: SHAPE_MAX[frame.shape][mode],
    ...extra,
  };
}

/**
 * Single source of truth for Accessories editorial frame geometry.
 * Admin preview and storefront must use this helper — never duplicate classes.
 */
export function accessoriesEditorialFrameLayout(
  frame: AccessoriesEditorialFrameSettings,
  mode: FrameLayoutMode = "storefront"
): AccessoriesEditorialFrameLayout {
  const { shape } = frame;
  const preview = mode === "preview";
  const heightClass = preview ? "nd-ae-stage-preview" : "nd-ae-stage";
  const vars = scaleVars(frame, mode);

  if (shape === "canvas") {
    return {
      sectionClassName: preview ? "" : "bg-white pt-8 sm:pt-10 md:pt-12",
      shellClassName: preview ? "w-full" : "w-full px-1 sm:px-1.5",
      stageClassName: cn(
        "relative overflow-hidden bg-beige",
        heightClass
      ),
      stageStyle: vars,
      textClassName: preview
        ? "absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-0.5 p-3"
        : "absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-2 p-5 md:gap-2.5 md:p-8 lg:max-w-lg lg:p-10",
    };
  }

  if (shape === "gallery") {
    return {
      sectionClassName: preview ? "" : "bg-white pt-8 sm:pt-10 md:pt-12",
      shellClassName: cn(
        "nd-ae-shell-scale",
        preview ? "px-0" : "px-4 sm:px-6 md:px-10"
      ),
      shellStyle: vars,
      stageClassName: cn(
        "relative overflow-hidden bg-beige rounded-[1.75rem] md:rounded-[2rem]",
        heightClass
      ),
      stageStyle: vars,
      textClassName: preview
        ? "absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-0.5 p-3"
        : "absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-2 p-5 md:gap-2.5 md:p-8 lg:max-w-lg lg:p-10",
    };
  }

  if (shape === "atelier") {
    return {
      sectionClassName: preview ? "" : "bg-white pt-8 sm:pt-10 md:pt-12",
      shellClassName: cn(
        "nd-ae-shell-scale",
        preview ? "px-0" : "px-5 sm:px-8 md:px-12"
      ),
      shellStyle: vars,
      stageClassName: cn(
        "relative overflow-hidden bg-beige rounded-[2.5rem] md:rounded-[3rem] shadow-[0_28px_80px_-36px_rgba(44,36,25,0.35)]",
        heightClass
      ),
      stageStyle: vars,
      textClassName: preview
        ? "absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-0.5 p-4"
        : "absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-2 p-6 md:gap-2.5 md:p-10 lg:max-w-lg lg:p-12",
    };
  }

  if (shape === "chapel") {
    return {
      sectionClassName: preview ? "" : "bg-white pt-10 sm:pt-12 md:pt-16",
      shellClassName: cn(
        "nd-ae-shell-scale",
        preview ? "px-0" : "px-6 sm:px-10 md:px-16"
      ),
      shellStyle: vars,
      stageClassName: cn("relative overflow-hidden bg-beige", heightClass),
      stageStyle: scaleVars(frame, mode, {
        borderRadius: "50% 50% 1.5rem 1.5rem / 22% 22% 1.5rem 1.5rem",
      }),
      textClassName: preview
        ? "absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-0.5 p-4 pb-5"
        : "absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-2 p-8 pb-10 md:gap-2.5 md:p-12 md:pb-14 lg:max-w-lg",
    };
  }

  if (shape === "cinema") {
    return {
      sectionClassName: preview ? "" : "bg-white pt-8 sm:pt-10 md:pt-12",
      shellClassName: cn(
        "nd-ae-shell-scale",
        preview ? "px-0" : "px-4 sm:px-8 md:px-10"
      ),
      shellStyle: vars,
      stageClassName:
        "relative aspect-[2.35/1] overflow-hidden bg-beige rounded-md md:rounded-lg",
      textClassName: preview
        ? "absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-0.5 p-2.5"
        : "absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-1.5 p-4 md:gap-2 md:p-7 lg:max-w-lg lg:p-8",
    };
  }

  if (shape === "portrait") {
    return {
      sectionClassName: preview ? "" : "bg-white pt-8 sm:pt-10 md:pt-12",
      shellClassName: cn(
        "nd-ae-shell-scale",
        preview ? "px-0" : "px-6 sm:px-8"
      ),
      shellStyle: vars,
      stageClassName:
        "relative aspect-[4/5] overflow-hidden bg-beige rounded-[2rem] md:rounded-[2.5rem] shadow-[0_24px_64px_-32px_rgba(44,36,25,0.28)]",
      textClassName: preview
        ? "absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-0.5 p-3"
        : "absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-2 p-6 md:gap-2.5 md:p-9",
    };
  }

  return {
    sectionClassName: preview ? "" : "bg-white py-10 sm:py-12 md:py-16",
    shellClassName: cn(
      "nd-ae-shell-scale",
      preview ? "px-0" : "px-6 sm:px-10 md:px-16"
    ),
    shellStyle: vars,
    stageClassName:
      "relative aspect-[16/10] overflow-hidden bg-beige rounded-[50%]",
    textClassName: preview
      ? "absolute inset-x-0 bottom-[14%] z-10 flex flex-col items-center text-center gap-0.5 px-6"
      : "absolute inset-x-0 bottom-[12%] z-10 flex flex-col items-center text-center gap-2 px-10 md:gap-2.5 md:px-16",
  };
}
