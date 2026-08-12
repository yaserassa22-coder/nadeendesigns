import type {
  HomepageEditorialGap,
  HomepageVisualBlockShape,
  HomepageVisualLayoutItem,
} from "@/types/store";

/** 12-column proportional grid for desktop visual layout. */
export const VISUAL_GRID_COLS = 12;
export const VISUAL_GRID_ROWS = 10;
export const VISUAL_COL_UNIT = 100 / VISUAL_GRID_COLS;
export const VISUAL_ROW_UNIT = 100 / VISUAL_GRID_ROWS;
export const VISUAL_CANVAS_PAD = {
  top: 14,
  right: 2,
  bottom: 2,
  left: 2,
} as const;

export type VisualLayoutSpacing = {
  /** Top inset below preview chrome (%). */
  padTop: number;
  /** Gap between adjacent blocks (%). */
  blockGap: number;
  /** Left/right/bottom canvas inset (%). */
  edgeGap: number;
};

export const DEFAULT_VISUAL_SPACING: VisualLayoutSpacing = {
  padTop: 12,
  blockGap: 0.6,
  edgeGap: 2,
};

/** Map legacy preset gap → numeric spacing. */
export function spacingFromLegacyGap(gap: HomepageEditorialGap): VisualLayoutSpacing {
  switch (gap) {
    case "none":
      return { padTop: 8, blockGap: 0, edgeGap: 1 };
    case "sm":
      return { padTop: 10, blockGap: 0.3, edgeGap: 1.5 };
    case "lg":
      return { padTop: 14, blockGap: 1, edgeGap: 2.5 };
    case "xl":
      return { padTop: 16, blockGap: 1.65, edgeGap: 3 };
    case "md":
    default:
      return { ...DEFAULT_VISUAL_SPACING };
  }
}

/** One master control (0–100) sets top, block, and edge gaps proportionally. */
export function spacingFromMaster(value: number): VisualLayoutSpacing {
  const t = clampVisual(value, 0, 100) / 100;
  return {
    padTop: Math.round((6 + t * 16) * 10) / 10,
    blockGap: Math.round(t * 2.2 * 100) / 100,
    edgeGap: Math.round((0.4 + t * 2.8) * 10) / 10,
  };
}

export function masterFromSpacing(spacing: VisualLayoutSpacing): number {
  return clampVisual(Math.round((spacing.blockGap / 2.2) * 100), 0, 100);
}

export function normalizeVisualSpacing(raw: unknown): VisualLayoutSpacing {
  const d = DEFAULT_VISUAL_SPACING;
  if (!raw || typeof raw !== "object") return d;
  const s = raw as Record<string, unknown>;
  return {
    padTop: clampVisual(
      typeof s.padTop === "number" ? s.padTop : Number(s.padTop) || d.padTop,
      4,
      24
    ),
    blockGap: clampVisual(
      typeof s.blockGap === "number" ? s.blockGap : Number(s.blockGap) || d.blockGap,
      0,
      5
    ),
    edgeGap: clampVisual(
      typeof s.edgeGap === "number" ? s.edgeGap : Number(s.edgeGap) || d.edgeGap,
      0,
      4
    ),
  };
}

export const VISUAL_SHAPE_PRESETS: Record<
  HomepageVisualBlockShape,
  { cols: number; rows: number; label: string }
> = {
  square: { cols: 3, rows: 3, label: "Square" },
  portrait: { cols: 3, rows: 4, label: "Portrait" },
  landscape: { cols: 4, rows: 2.5, label: "Landscape" },
  wide: { cols: 6, rows: 2, label: "Wide" },
  hero: { cols: 8, rows: 4, label: "Hero" },
};

export type VisualGridLayoutId =
  | "uniform_3col"
  | "uniform_4col"
  | "two_column"
  | "spotlight_top"
  | "custom_design_top"
  | "editorial_split"
  | "magazine_rows"
  | "mosaic_balanced";

export type VisualGridLayoutOption = {
  id: VisualGridLayoutId;
  label: string;
  hint: string;
};

export const VISUAL_GRID_LAYOUT_OPTIONS: VisualGridLayoutOption[] = [
  {
    id: "uniform_3col",
    label: "3-column grid",
    hint: "Equal portrait tiles — 3 per row",
  },
  {
    id: "uniform_4col",
    label: "4-column grid",
    hint: "Compact square tiles — 4 per row",
  },
  {
    id: "two_column",
    label: "2-column grid",
    hint: "Large balanced pairs — 2 per row",
  },
  {
    id: "spotlight_top",
    label: "Spotlight top",
    hint: "One hero banner, grid below",
  },
  {
    id: "custom_design_top",
    label: "Custom design top",
    hint: "Custom design hero, collections below",
  },
  {
    id: "editorial_split",
    label: "Editorial split",
    hint: "Hero left + side tile, then 3-column rows",
  },
  {
    id: "magazine_rows",
    label: "Magazine rows",
    hint: "Wide lead tile + portrait accents per row",
  },
  {
    id: "mosaic_balanced",
    label: "Mosaic balanced",
    hint: "Alternating square / portrait mosaic",
  },
];

type GridSlot = {
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
  shape: HomepageVisualBlockShape;
};

export function clampVisual(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function snapVisual(value: number, unit: number) {
  return Math.round(value / unit) * unit;
}

export function shapePresetSize(shape: HomepageVisualBlockShape) {
  const preset = VISUAL_SHAPE_PRESETS[shape];
  return {
    w: preset.cols * VISUAL_COL_UNIT,
    h: preset.rows * VISUAL_ROW_UNIT,
  };
}

export type VisualLayoutBand = {
  index: number;
  start: number;
  span: number;
};

export const ROW_SCALE_MIN = 0.4;
export const ROW_SCALE_MAX = 2.5;
export const DEFAULT_ROW_SCALE = 1;

export function clampRowScale(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_ROW_SCALE;
  return clampVisual(Math.round(value * 100) / 100, ROW_SCALE_MIN, ROW_SCALE_MAX);
}

export function normalizeRowScales(raw: unknown, count: number): number[] {
  const list = Array.isArray(raw) ? raw : [];
  return Array.from({ length: Math.max(0, count) }, (_, i) => {
    const n = Number(list[i]);
    return clampRowScale(Number.isFinite(n) ? n : DEFAULT_ROW_SCALE);
  });
}

type BandMetric = {
  start: number;
  y: number;
  height: number;
};

export function slotToRect(
  slot: GridSlot,
  colUnit: number,
  rowUnit: number,
  spacing: VisualLayoutSpacing = DEFAULT_VISUAL_SPACING
) {
  const inset = spacing.blockGap;
  const x = spacing.edgeGap + slot.col * colUnit + inset;
  const y = spacing.padTop + slot.row * rowUnit + inset;
  const w = Math.max(colUnit * 1.1, slot.colSpan * colUnit - inset * 2);
  const h = Math.max(rowUnit * 0.9, slot.rowSpan * rowUnit - inset * 2);
  return { x, y, w, h };
}

function slotToRectOnBand(
  slot: GridSlot,
  colUnit: number,
  band: BandMetric,
  spacing: VisualLayoutSpacing
) {
  const inset = spacing.blockGap;
  const x = spacing.edgeGap + slot.col * colUnit + inset;
  const y = band.y + inset;
  const w = Math.max(colUnit * 1.1, slot.colSpan * colUnit - inset * 2);
  const h = Math.max(band.height * 0.55, band.height - inset * 2);
  return { x, y, w, h };
}

function finalizeLayoutZ(items: HomepageVisualLayoutItem[]): HomepageVisualLayoutItem[] {
  return items
    .slice()
    .sort((a, b) => a.z - b.z)
    .map((item, index) => ({ ...item, z: index }));
}

export function snapVisualItem(
  item: HomepageVisualLayoutItem
): HomepageVisualLayoutItem {
  const minW = VISUAL_COL_UNIT * 2;
  const minH = VISUAL_ROW_UNIT * 1.5;
  const maxW = 100 - VISUAL_CANVAS_PAD.left - VISUAL_CANVAS_PAD.right;
  const maxH = 100 - VISUAL_CANVAS_PAD.top - VISUAL_CANVAS_PAD.bottom;

  const w = clampVisual(snapVisual(item.w, VISUAL_COL_UNIT), minW, maxW);
  const h = clampVisual(snapVisual(item.h, VISUAL_ROW_UNIT), minH, maxH);
  const x = clampVisual(
    snapVisual(item.x, VISUAL_COL_UNIT),
    VISUAL_CANVAS_PAD.left,
    100 - VISUAL_CANVAS_PAD.right - w
  );
  const y = clampVisual(
    snapVisual(item.y, VISUAL_ROW_UNIT),
    VISUAL_CANVAS_PAD.top,
    100 - VISUAL_CANVAS_PAD.bottom - h
  );

  return { ...item, x, y, w, h };
}

export function applyVisualShape(
  item: HomepageVisualLayoutItem,
  shape: HomepageVisualBlockShape
): HomepageVisualLayoutItem {
  const { w, h } = shapePresetSize(shape);
  return snapVisualItem({
    ...item,
    shape,
    w: clampVisual(w, VISUAL_COL_UNIT * 2, 100 - item.x - VISUAL_CANVAS_PAD.right),
    h: clampVisual(h, VISUAL_ROW_UNIT * 1.5, 100 - item.y - VISUAL_CANVAS_PAD.bottom),
  });
}

export function normalizeVisualItems(
  items: HomepageVisualLayoutItem[]
): HomepageVisualLayoutItem[] {
  return items
    .map((item, index) =>
      snapVisualItem({
        ...item,
        z: Number.isFinite(item.z) ? item.z : index,
      })
    )
    .sort((a, b) => a.z - b.z)
    .map((item, index) => ({ ...item, z: index }));
}

export type VisualAlignMode =
  | "left"
  | "center-h"
  | "right"
  | "top"
  | "center-v"
  | "bottom";

export function alignVisualItems(
  items: HomepageVisualLayoutItem[],
  targetIds: Set<string>,
  mode: VisualAlignMode
): HomepageVisualLayoutItem[] {
  const targets = items.filter((item) => targetIds.has(item.id));
  if (targets.length === 0) return items;

  const minX = Math.min(...targets.map((item) => item.x));
  const maxX = Math.max(...targets.map((item) => item.x + item.w));
  const minY = Math.min(...targets.map((item) => item.y));
  const maxY = Math.max(...targets.map((item) => item.y + item.h));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return normalizeVisualItems(
    items.map((item) => {
      if (!targetIds.has(item.id)) return item;
      let x = item.x;
      let y = item.y;
      switch (mode) {
        case "left":
          x = minX;
          break;
        case "right":
          x = maxX - item.w;
          break;
        case "center-h":
          x = centerX - item.w / 2;
          break;
        case "top":
          y = minY;
          break;
        case "bottom":
          y = maxY - item.h;
          break;
        case "center-v":
          y = centerY - item.h / 2;
          break;
      }
      return snapVisualItem({ ...item, x, y });
    })
  );
}

export function distributeVisualItems(
  items: HomepageVisualLayoutItem[],
  targetIds: Set<string>,
  axis: "horizontal" | "vertical"
): HomepageVisualLayoutItem[] {
  const targets = items
    .filter((item) => targetIds.has(item.id))
    .sort((a, b) => (axis === "horizontal" ? a.x - b.x : a.y - b.y));
  if (targets.length < 3) return items;

  const first = targets[0]!;
  const last = targets[targets.length - 1]!;
  const span =
    axis === "horizontal"
      ? last.x + last.w - first.x
      : last.y + last.h - first.y;
  const totalSize = targets.reduce(
    (sum, item) => sum + (axis === "horizontal" ? item.w : item.h),
    0
  );
  const gap = (span - totalSize) / (targets.length - 1);
  let cursor = axis === "horizontal" ? first.x : first.y;

  const positions = new Map<string, { x: number; y: number }>();
  for (const item of targets) {
    positions.set(item.id, {
      x: axis === "horizontal" ? cursor : item.x,
      y: axis === "horizontal" ? item.y : cursor,
    });
    cursor += (axis === "horizontal" ? item.w : item.h) + gap;
  }

  return normalizeVisualItems(
    items.map((item) => {
      const pos = positions.get(item.id);
      if (!pos) return item;
      return snapVisualItem({ ...item, x: pos.x, y: pos.y });
    })
  );
}

function slotUniform3Col(index: number, rowOffset = 0): GridSlot {
  const col = (index % 3) * 4;
  const row = rowOffset + Math.floor(index / 3) * 3;
  return { col, row, colSpan: 4, rowSpan: 3, shape: "portrait" };
}

function slotUniform4Col(index: number): GridSlot {
  const col = (index % 4) * 3;
  const row = Math.floor(index / 4) * 2.5;
  return { col, row, colSpan: 3, rowSpan: 2.5, shape: "square" };
}

function slotTwoColumn(index: number): GridSlot {
  const col = (index % 2) * 6;
  const row = Math.floor(index / 2) * 3;
  return { col, row, colSpan: 6, rowSpan: 3, shape: "landscape" };
}

function slotSpotlightTop(index: number, rowOffset = 0): GridSlot {
  if (index === 0) {
    return { col: 0, row: rowOffset, colSpan: 12, rowSpan: 4, shape: "hero" };
  }
  const sub = index - 1;
  const col = (sub % 3) * 4;
  const row = rowOffset + 4 + Math.floor(sub / 3) * 3;
  return { col, row, colSpan: 4, rowSpan: 3, shape: "portrait" };
}

function slotCustomDesignTop(
  index: number,
  isCustom: boolean,
  hasCustomInSet: boolean
): GridSlot {
  if (hasCustomInSet) {
    if (isCustom) {
      return { col: 0, row: 0, colSpan: 12, rowSpan: 4, shape: "hero" };
    }
    const sub = index - 1;
    const col = (sub % 3) * 4;
    const row = 4 + Math.floor(sub / 3) * 3;
    return { col, row, colSpan: 4, rowSpan: 3, shape: "portrait" };
  }
  return slotSpotlightTop(index);
}

function slotEditorialSplit(index: number): GridSlot {
  if (index === 0) {
    return { col: 0, row: 0, colSpan: 8, rowSpan: 4, shape: "hero" };
  }
  if (index === 1) {
    return { col: 8, row: 0, colSpan: 4, rowSpan: 4, shape: "portrait" };
  }
  const sub = index - 2;
  const col = (sub % 3) * 4;
  const row = 4 + Math.floor(sub / 3) * 3;
  return { col, row, colSpan: 4, rowSpan: 3, shape: "portrait" };
}

const MAGAZINE_ROW_PATTERN: GridSlot[] = [
  { col: 0, row: 0, colSpan: 6, rowSpan: 3, shape: "wide" },
  { col: 6, row: 0, colSpan: 3, rowSpan: 3, shape: "portrait" },
  { col: 9, row: 0, colSpan: 3, rowSpan: 3, shape: "portrait" },
];

function slotMagazineRows(index: number): GridSlot {
  const rowIndex = Math.floor(index / 3);
  const slot = MAGAZINE_ROW_PATTERN[index % 3]!;
  return {
    ...slot,
    row: rowIndex * 3,
  };
}

function slotMosaicBalanced(index: number): GridSlot {
  const rowPair = Math.floor(index / 4);
  const pos = index % 4;
  const baseRow = rowPair * 3;
  if (pos === 0) {
    return { col: 0, row: baseRow, colSpan: 3, rowSpan: 3, shape: "square" };
  }
  if (pos === 1) {
    return { col: 3, row: baseRow, colSpan: 3, rowSpan: 3, shape: "portrait" };
  }
  if (pos === 2) {
    return { col: 6, row: baseRow, colSpan: 3, rowSpan: 3, shape: "portrait" };
  }
  return { col: 9, row: baseRow, colSpan: 3, rowSpan: 3, shape: "square" };
}

function resolveSlot(
  layoutId: VisualGridLayoutId,
  index: number,
  isCustom: boolean,
  hasCustomInSet: boolean
): GridSlot {
  switch (layoutId) {
    case "uniform_3col":
      if (isCustom && index === 0) {
        return { col: 0, row: 0, colSpan: 12, rowSpan: 4, shape: "hero" };
      }
      return slotUniform3Col(
        hasCustomInSet ? index - 1 : index,
        hasCustomInSet ? 4 : 0
      );
    case "uniform_4col":
      return slotUniform4Col(index);
    case "two_column":
      return slotTwoColumn(index);
    case "spotlight_top":
      if (isCustom && index === 0) {
        return { col: 0, row: 0, colSpan: 12, rowSpan: 4, shape: "hero" };
      }
      return slotSpotlightTop(index);
    case "custom_design_top":
      return slotCustomDesignTop(index, isCustom, hasCustomInSet);
    case "editorial_split":
      if (isCustom && index === 0) {
        return { col: 0, row: 0, colSpan: 8, rowSpan: 4, shape: "hero" };
      }
      if (hasCustomInSet && index === 1) {
        return { col: 8, row: 0, colSpan: 4, rowSpan: 4, shape: "portrait" };
      }
      if (hasCustomInSet) {
        return slotUniform3Col(index - 2, 4);
      }
      return slotEditorialSplit(index);
    case "magazine_rows":
      return slotMagazineRows(index);
    case "mosaic_balanced":
      return slotMosaicBalanced(index);
    default:
      return slotUniform3Col(index);
  }
}

function orderItemsForLayout(
  items: HomepageVisualLayoutItem[],
  layoutId: VisualGridLayoutId,
  customDesignId = "custom-design"
): HomepageVisualLayoutItem[] {
  const sorted = [...items].sort((a, b) => a.z - b.z);
  const custom = sorted.find((item) => item.id === customDesignId);
  if (!custom) return sorted;

  const pinCustomFirst =
    layoutId === "custom_design_top" ||
    layoutId === "spotlight_top" ||
    layoutId === "uniform_3col" ||
    layoutId === "editorial_split";

  if (!pinCustomFirst) return sorted;
  return [custom, ...sorted.filter((item) => item.id !== customDesignId)];
}

function resolveLayoutSlots(
  items: HomepageVisualLayoutItem[],
  layoutId: VisualGridLayoutId,
  customDesignId = "custom-design"
) {
  const ordered = orderItemsForLayout(items, layoutId, customDesignId);
  const hasCustomInSet = ordered.some((item) => item.id === customDesignId);
  const resolved = ordered.map((item, index) => {
    const isCustom = item.id === customDesignId;
    const slot = resolveSlot(layoutId, index, isCustom, hasCustomInSet);
    return { item, slot, isCustom };
  });
  return { ordered, resolved };
}

export function listLayoutBands(
  items: HomepageVisualLayoutItem[],
  layoutId: VisualGridLayoutId,
  customDesignId = "custom-design"
): VisualLayoutBand[] {
  const { resolved } = resolveLayoutSlots(items, layoutId, customDesignId);
  const byStart = new Map<number, number>();
  for (const { slot } of resolved) {
    const prev = byStart.get(slot.row) ?? 0;
    byStart.set(slot.row, Math.max(prev, slot.rowSpan));
  }
  return [...byStart.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([start, span], index) => ({ index, start, span }));
}

export function recommendedCanvasHeight(items: HomepageVisualLayoutItem[]): number {
  if (items.length === 0) return 880;
  const maxBottom = Math.max(...items.map((item) => item.y + item.h));
  const pxEstimate = 520 + (maxBottom / 100) * 680;
  return clampVisual(Math.round(pxEstimate / 20) * 20, 640, 1600);
}

export function recommendedCanvasHeightForRows(
  maxRowEnd: number,
  scales: number[] = []
): number {
  const avg =
    scales.length > 0
      ? scales.reduce((sum, n) => sum + n, 0) / scales.length
      : 1;
  const rows = Math.max(maxRowEnd, 5);
  const pxEstimate = 520 + rows * 62 * avg;
  return clampVisual(Math.round(pxEstimate / 20) * 20, 640, 1600);
}

/** Apply a named grid template — deterministic slots, no overlap. */
export function applyVisualGridLayout(
  items: HomepageVisualLayoutItem[],
  layoutId: VisualGridLayoutId,
  customDesignId = "custom-design",
  spacing: VisualLayoutSpacing = DEFAULT_VISUAL_SPACING,
  rowScales: number[] = []
): HomepageVisualLayoutItem[] {
  if (items.length === 0) return [];

  const { resolved } = resolveLayoutSlots(items, layoutId, customDesignId);
  const bands = listLayoutBands(items, layoutId, customDesignId);
  const scales = normalizeRowScales(rowScales, bands.length);
  const weightedSpan =
    bands.reduce((sum, band, i) => sum + band.span * (scales[i] ?? 1), 0) || 1;

  const contentW = 100 - spacing.edgeGap * 2;
  const contentH = 100 - spacing.padTop - spacing.edgeGap;
  const colUnit = contentW / VISUAL_GRID_COLS;
  const unit = contentH / weightedSpan;

  let cursorY = spacing.padTop;
  const metrics: BandMetric[] = bands.map((band, i) => {
    const height = band.span * unit * (scales[i] ?? 1);
    const metric = { start: band.start, y: cursorY, height };
    cursorY += height;
    return metric;
  });
  const metricByStart = new Map(metrics.map((m) => [m.start, m]));

  const placed = resolved.map(({ item, slot, isCustom }, index) => {
    const band = metricByStart.get(slot.row) ?? metrics[0]!;
    const rect = slotToRectOnBand(slot, colUnit, band, spacing);
    return {
      ...item,
      shape: (isCustom ? "hero" : slot.shape) as HomepageVisualBlockShape,
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h,
      z: index,
    };
  });

  return finalizeLayoutZ(placed);
}

export function layoutRowCount(
  items: HomepageVisualLayoutItem[],
  layoutId: VisualGridLayoutId,
  customDesignId = "custom-design"
): number {
  const bands = listLayoutBands(items, layoutId, customDesignId);
  if (bands.length === 0) return 1;
  const last = bands[bands.length - 1]!;
  return last.start + last.span;
}
