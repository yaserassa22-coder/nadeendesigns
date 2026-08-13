import type { CSSProperties } from "react";
import {
  cloudinaryOriginalImageUrl,
  isCloudinaryImageUrl,
  withCloudinaryProductIsolation,
} from "@/lib/media/cloudinary-image";
import type {
  VisualUnifiedBgPosition,
  VisualUnifiedBgSize,
  VisualUnifiedBackgroundSettings,
} from "@/types/store";

export const DEFAULT_UNIFIED_BG_COLOR = "#FFFFFF";

/** Previous shipped default — treat as unset so the storefront canvas is white. */
const LEGACY_UNIFIED_DEFAULTS = new Set(["#F5F2EA", "#f5f2ea"]);

/** Luxury editorial presets — white first, then warm neutrals. */
export const UNIFIED_BG_COLOR_PRESETS: { id: string; label: string; color: string }[] =
  [
    { id: "pure-white", label: "White", color: "#FFFFFF" },
    { id: "editorial-ivory", label: "Editorial ivory", color: "#F6F1E6" },
    { id: "warm-ivory", label: "Warm ivory", color: "#F4F1EB" },
    { id: "champagne", label: "Champagne", color: "#E8DFD0" },
    { id: "soft-linen", label: "Soft linen", color: "#EDE6DC" },
    { id: "pale-sand", label: "Pale sand", color: "#F0EBE3" },
    { id: "warm-taupe", label: "Warm taupe", color: "#D9D2C8" },
  ];

export function isNearWhiteHex(color: string): boolean {
  const hex = normalizeHexColor(color, "").replace("#", "");
  if (hex.length !== 6) return false;
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return r >= 245 && g >= 245 && b >= 245;
}

/** Normalize hex; white is allowed (product isolation uses transparent PNGs). */
export function resolveUnifiedCanvasColor(color: string): string {
  const hex = normalizeHexColor(color, DEFAULT_UNIFIED_BG_COLOR);
  if (LEGACY_UNIFIED_DEFAULTS.has(hex)) return DEFAULT_UNIFIED_BG_COLOR;
  return hex;
}

export const DEFAULT_UNIFIED_BACKGROUND: VisualUnifiedBackgroundSettings = {
  enabled: false,
  color: DEFAULT_UNIFIED_BG_COLOR,
  image_url: "",
  size: "cover",
  position: "center",
  product_scale: 1,
  product_offset_x: 0,
  product_offset_y: 0,
  product_shadow: true,
  product_shadow_intensity: 28,
  isolate_products: true,
  keep_product_grids: false,
};

export function normalizeHexColor(value: unknown, fallback: string): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const r = raw[1];
    const g = raw[2];
    const b = raw[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

export function unifiedBgSizeCss(size: VisualUnifiedBgSize): string {
  if (size === "contain") return "contain";
  if (size === "natural") return "auto";
  return "cover";
}

export function unifiedBgPositionCss(position: VisualUnifiedBgPosition): string {
  switch (position) {
    case "top":
      return "center top";
    case "bottom":
      return "center bottom";
    case "left":
      return "left center";
    case "right":
      return "right center";
    case "center":
    default:
      return "center center";
  }
}

export function unifiedBackgroundStyle(
  settings: VisualUnifiedBackgroundSettings
): CSSProperties {
  const image = settings.image_url.trim();
  const color = resolveUnifiedCanvasColor(settings.color);
  return {
    backgroundColor: color,
    ["--unified-canvas" as string]: color,
    backgroundImage:
      !image || settings.isolate_products
        ? undefined
        : `url("${image.replace(/"/g, "%22")}")`,
    backgroundSize:
      image && !settings.isolate_products
        ? unifiedBgSizeCss(settings.size)
        : undefined,
    backgroundPosition:
      image && !settings.isolate_products
        ? unifiedBgPositionCss(settings.position)
        : undefined,
    backgroundRepeat: "no-repeat",
  };
}

export function unifiedCanvasClassName(enabled: boolean): string {
  if (!enabled) return "";
  return [
    "isolation-isolate",
    "rounded-[40px]",
    "shadow-[0_12px_56px_rgba(44,36,25,0.06)]",
  ].join(" ");
}

export function unifiedCanvasInsetClassName(enabled: boolean): string {
  if (!enabled) return "";
  return "px-5 py-7 sm:px-8 sm:py-9 md:px-10 md:py-11 lg:px-12 lg:py-12";
}

export function unifiedGalleryGapClass(enabled: boolean): string {
  if (!enabled) return "";
  return "gap-3 sm:gap-4 md:gap-5";
}

export function unifiedColorPickerValue(color: string): string {
  return normalizeHexColor(color, DEFAULT_UNIFIED_BG_COLOR);
}

export function productDropShadow(intensity: number): string {
  const t = Math.min(100, Math.max(0, intensity)) / 100;
  const blur = 8 + t * 28;
  const y = 4 + t * 10;
  const alpha = 0.08 + t * 0.22;
  return `drop-shadow(0 ${y}px ${blur}px rgba(44, 36, 25, ${alpha}))`;
}

export function isUnifiedBackgroundEnabled(
  settings: VisualUnifiedBackgroundSettings | undefined | null
): boolean {
  return Boolean(settings?.enabled);
}

export function isProductIsolationEnabled(
  settings: VisualUnifiedBackgroundSettings | undefined | null
): boolean {
  return Boolean(
    settings?.enabled &&
      settings.isolate_products &&
      !settings.keep_product_grids
  );
}

export function isKeepProductGridsEnabled(
  settings: VisualUnifiedBackgroundSettings | undefined | null
): boolean {
  return Boolean(settings?.enabled && settings.keep_product_grids);
}

/** @deprecated Use isProductIsolationEnabled */
export function isSoftIsolateEnabled(
  settings: VisualUnifiedBackgroundSettings | undefined | null
): boolean {
  return isProductIsolationEnabled(settings);
}

export function unifiedTilePresentation(
  settings: VisualUnifiedBackgroundSettings | undefined | null
): {
  presentation: "card" | "float";
  productIsolation?: boolean;
  canvasColor?: string;
  imageScale?: number;
  imageOffsetX?: number;
  imageOffsetY?: number;
  dropShadow?: boolean;
  shadowIntensity?: number;
} {
  if (!settings?.enabled) return { presentation: "card" };
  const canvasColor = resolveUnifiedCanvasColor(settings.color);

  // Keep each product in its own card frame on the unified canvas color.
  if (settings.keep_product_grids) {
    return {
      presentation: "card",
      productIsolation: false,
      canvasColor,
    };
  }

  return {
    presentation: "float",
    productIsolation: settings.isolate_products,
    canvasColor,
    imageScale: settings.product_scale,
    imageOffsetX: settings.product_offset_x,
    imageOffsetY: settings.product_offset_y,
    dropShadow: settings.product_shadow,
    shadowIntensity: settings.product_shadow_intensity,
  };
}

/**
 * Post-grid image URL — isolated transparent PNG when product isolation is on.
 * Original product URLs in the database are never modified.
 */
export function unifiedTileImageUrl(
  src: string | null | undefined,
  settings?: VisualUnifiedBackgroundSettings | null
): string | null | undefined {
  const url = src?.trim() || "";
  if (
    !url ||
    !settings?.enabled ||
    !settings.isolate_products ||
    settings.keep_product_grids
  ) {
    return src;
  }

  if (!isCloudinaryImageUrl(url)) {
    return cloudinaryOriginalImageUrl(url);
  }

  return withCloudinaryProductIsolation(url);
}

/** Original asset URL for fallback when isolation transform fails. */
export function unifiedTileImageFallbackUrl(
  src: string | null | undefined
): string {
  const url = src?.trim() || "";
  if (!url) return "";
  return cloudinaryOriginalImageUrl(url);
}
