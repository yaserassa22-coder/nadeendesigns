"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AlignCenter,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignLeft,
  AlignRight,
  AlignStartVertical,
  Grip,
  LayoutGrid,
  Magnet,
  Maximize2,
  Move,
  Plus,
  RotateCcw,
  Save,
  Square,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { HomeEditorialTile } from "@/components/home/HomeEditorialTile";
import { HomeVisualGridPages } from "@/components/home/HomeVisualGridPages";
import { HomeVisualProductRunway } from "@/components/home/HomeVisualProductRunway";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { HomepageEditorialTile } from "@/lib/home/homepage-editorial-gallery";
import {
  alignVisualItems,
  applyVisualGridLayout,
  applyVisualShape,
  clampRowScale,
  DEFAULT_ROW_SCALE,
  DEFAULT_VISUAL_SPACING,
  distributeVisualItems,
  layoutRowCount,
  listLayoutBands,
  masterFromSpacing,
  normalizeRowScales,
  normalizeVisualGridLayoutId,
  normalizeVisualItems,
  recommendedCanvasHeightForRows,
  ROW_SCALE_MAX,
  ROW_SCALE_MIN,
  shapePresetSize,
  snapVisual,
  snapVisualItem,
  spacingFromMaster,
  VISUAL_COL_UNIT,
  VISUAL_GRID_LAYOUT_OPTIONS,
  VISUAL_ROW_UNIT,
  VISUAL_SHAPE_PRESETS,
  isGridScrollLayout,
  isHorizontalScrollLayout,
  isScrollVisualLayout,
  type VisualAlignMode,
  type VisualGridLayoutId,
  type VisualLayoutSpacing,
} from "@/lib/home/visual-layout-grid";
import {
  DEFAULT_UNIFIED_BACKGROUND,
  DEFAULT_UNIFIED_BG_COLOR,
  UNIFIED_BG_COLOR_PRESETS,
  normalizeHexColor,
  resolveUnifiedCanvasColor,
  unifiedBackgroundStyle,
  unifiedCanvasClassName,
  unifiedColorPickerValue,
  unifiedTileImageUrl,
  unifiedTilePresentation,
} from "@/lib/home/visual-unified-background";
import { cn } from "@/lib/utils";
import type {
  HomepageVisualBlockShape,
  HomepageVisualLayoutItem,
  VisualUnifiedBackgroundSettings,
  VisualUnifiedBgPosition,
  VisualUnifiedBgSize,
} from "@/types/store";

export type VisualLayoutTile = {
  id: string;
  title: string;
  imageUrl: string;
  href: string;
  eyebrow?: string;
  primaryCtaLabel?: string;
  secondaryHref?: string;
  secondaryCtaLabel?: string;
  kind: "category" | "product" | "custom";
};

type Props = {
  availableTiles: VisualLayoutTile[];
  initialOrder: string[];
  initialManual: boolean;
  autoTiles: VisualLayoutTile[];
  initialVisualEnabled: boolean;
  initialVisualItems: HomepageVisualLayoutItem[];
  initialVisualHeight: number;
  initialVisualPadTop?: number;
  initialVisualBlockGap?: number;
  initialVisualEdgeGap?: number;
  initialVisualRowScales?: number[];
  initialVisualUnified?: VisualUnifiedBackgroundSettings;
  initialVisualGrid?: VisualGridLayoutId;
  customDesignImageUrl?: string | null;
};

const SHAPE_PRESETS = Object.fromEntries(
  (
    Object.entries(VISUAL_SHAPE_PRESETS) as [
      HomepageVisualBlockShape,
      { cols: number; rows: number; label: string },
    ][]
  ).map(([shape, preset]) => {
    const size = shapePresetSize(shape);
    return [shape, { ...size, label: preset.label }];
  })
) as Record<
  HomepageVisualBlockShape,
  { w: number; h: number; label: string }
>;

type LayoutApplyScope = "all" | "selected";

const EDITORIAL_MIX: HomepageVisualBlockShape[] = [
  "hero",
  "portrait",
  "landscape",
  "portrait",
  "square",
  "landscape",
];

const MAGAZINE_MIX: HomepageVisualBlockShape[] = ["wide", "portrait", "landscape", "square"];

const UNIFIED_BG_SIZES: { id: VisualUnifiedBgSize; label: string }[] = [
  { id: "cover", label: "Cover" },
  { id: "contain", label: "Contain" },
  { id: "natural", label: "Natural" },
];

const UNIFIED_BG_POSITIONS: { id: VisualUnifiedBgPosition; label: string }[] = [
  { id: "center", label: "Center" },
  { id: "top", label: "Top" },
  { id: "bottom", label: "Bottom" },
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
];

type AutoShapePresetId =
  | "editorial_mix"
  | "magazine_mix"
  | "spotlight"
  | "uniform_portrait"
  | "uniform_square"
  | "uniform_landscape"
  | "uniform_wide";

type ShapeApplyScope = "all" | "selected" | "categories" | "products" | "custom";

const AUTO_SHAPE_PRESETS: {
  id: AutoShapePresetId;
  label: string;
  hint: string;
}[] = [
  {
    id: "editorial_mix",
    label: "Editorial mix",
    hint: "Hero + portrait + landscape rhythm",
  },
  {
    id: "magazine_mix",
    label: "Magazine mix",
    hint: "Wide tiles with portrait accents",
  },
  {
    id: "spotlight",
    label: "Spotlight",
    hint: "First block hero, rest portrait",
  },
  {
    id: "uniform_portrait",
    label: "All portrait",
    hint: "Same tall shape everywhere",
  },
  {
    id: "uniform_square",
    label: "All square",
    hint: "Equal square tiles",
  },
  {
    id: "uniform_landscape",
    label: "All landscape",
    hint: "Wide horizontal tiles",
  },
  {
    id: "uniform_wide",
    label: "All wide",
    hint: "Extra-wide banner tiles",
  },
];

function shapeForAutoPreset(
  presetId: AutoShapePresetId,
  index: number,
  tile: VisualLayoutTile | undefined
): HomepageVisualBlockShape {
  if (tile?.kind === "custom") return "hero";
  switch (presetId) {
    case "editorial_mix":
      return EDITORIAL_MIX[index % EDITORIAL_MIX.length] ?? "portrait";
    case "magazine_mix":
      return MAGAZINE_MIX[index % MAGAZINE_MIX.length] ?? "portrait";
    case "spotlight":
      return index === 0 ? "hero" : "portrait";
    case "uniform_portrait":
      return "portrait";
    case "uniform_square":
      return "square";
    case "uniform_landscape":
      return "landscape";
    case "uniform_wide":
      return "wide";
    default:
      return "portrait";
  }
}

function applyShapePreset(
  item: HomepageVisualLayoutItem,
  shape: HomepageVisualBlockShape
): HomepageVisualLayoutItem {
  return applyVisualShape(item, shape);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function applyOrder(pool: VisualLayoutTile[], order: string[]): VisualLayoutTile[] {
  if (!order.length) return pool;
  const map = new Map(pool.map((tile) => [tile.id, tile]));
  const out: VisualLayoutTile[] = [];
  const used = new Set<string>();
  for (const id of order) {
    const tile = map.get(id);
    if (!tile || used.has(id)) continue;
    out.push(tile);
    used.add(id);
  }
  for (const tile of pool) {
    if (!used.has(tile.id)) out.push(tile);
  }
  return out;
}

function normalizeItems(items: HomepageVisualLayoutItem[]): HomepageVisualLayoutItem[] {
  return normalizeVisualItems(items);
}

function createDefaultLayout(tiles: VisualLayoutTile[]): HomepageVisualLayoutItem[] {
  const seed = tiles.slice(0, 12).map((tile, index) => ({
    id: tile.id,
    x: 0,
    y: 0,
    w: shapePresetSize(tile.kind === "custom" ? "hero" : "portrait").w,
    h: shapePresetSize(tile.kind === "custom" ? "hero" : "portrait").h,
    shape: (tile.kind === "custom" ? "hero" : "portrait") as HomepageVisualBlockShape,
    z: index,
  }));
  return applyVisualGridLayout(seed, "editorial_split");
}

type InteractionState =
  | {
      id: string;
      mode: "drag" | "resize";
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
      startW: number;
      startH: number;
    }
  | null;

function itemStyle(item: HomepageVisualLayoutItem) {
  return {
    left: `${item.x}%`,
    top: `${item.y}%`,
    width: `${item.w}%`,
    height: `${item.h}%`,
    zIndex: item.z + 1,
  };
}

function kindLabel(kind: VisualLayoutTile["kind"]) {
  if (kind === "custom") return "Custom";
  if (kind === "product") return "Product";
  return "Category";
}

export function HomepageVisualLayoutManager({
  availableTiles,
  initialOrder,
  initialManual,
  autoTiles,
  initialVisualEnabled,
  initialVisualItems,
  initialVisualHeight,
  initialVisualPadTop = DEFAULT_VISUAL_SPACING.padTop,
  initialVisualBlockGap = DEFAULT_VISUAL_SPACING.blockGap,
  initialVisualEdgeGap = DEFAULT_VISUAL_SPACING.edgeGap,
  initialVisualRowScales = [],
  initialVisualUnified = DEFAULT_UNIFIED_BACKGROUND,
  initialVisualGrid = "editorial_split",
  customDesignImageUrl,
}: Props) {
  const initialSpacing = useMemo<VisualLayoutSpacing>(
    () => ({
      padTop: initialVisualPadTop,
      blockGap: initialVisualBlockGap,
      edgeGap: initialVisualEdgeGap,
    }),
    [initialVisualBlockGap, initialVisualEdgeGap, initialVisualPadTop]
  );
  const { t } = useLocale();
  const s = t.admin.settingsFields;
  const customTile = useMemo<VisualLayoutTile>(
    () => ({
      id: "custom-design",
      title: t.nav.customDesign,
      imageUrl: customDesignImageUrl?.trim() || "",
      href: "/custom-design",
      eyebrow: t.home.customEyebrow,
      primaryCtaLabel: t.home.customStartCta,
      secondaryHref: "/booking?service=custom_design",
      secondaryCtaLabel: t.home.customBookCta,
      kind: "custom",
    }),
    [customDesignImageUrl, t]
  );

  const pool = useMemo(() => {
    const map = new Map<string, VisualLayoutTile>();
    for (const tile of [...autoTiles, ...availableTiles, customTile]) {
      map.set(tile.id, tile);
    }
    return [...map.values()];
  }, [availableTiles, autoTiles, customTile]);

  const orderedSeed = useMemo(
    () => (initialManual ? applyOrder(pool, initialOrder) : applyOrder(pool, autoTiles.map((tile) => tile.id))),
    [autoTiles, initialManual, initialOrder, pool]
  );

  const [items, setItems] = useState<HomepageVisualLayoutItem[]>(() => {
    if (initialVisualItems.length > 0) return normalizeItems(initialVisualItems);
    return normalizeItems(createDefaultLayout(orderedSeed));
  });
  const [height, setHeight] = useState(initialVisualHeight);
  const [spacing, setSpacing] = useState<VisualLayoutSpacing>(initialSpacing);
  const [spacingLinked, setSpacingLinked] = useState(true);
  const [spacingMaster, setSpacingMaster] = useState(() =>
    masterFromSpacing(initialSpacing)
  );
  const [rowScales, setRowScales] = useState<number[]>(() =>
    normalizeRowScales(initialVisualRowScales, initialVisualRowScales.length)
  );
  const [unified, setUnified] = useState<VisualUnifiedBackgroundSettings>(() => {
    const base = {
      ...DEFAULT_UNIFIED_BACKGROUND,
      ...initialVisualUnified,
    };
    if (base.enabled) {
      base.color = resolveUnifiedCanvasColor(base.color);
    }
    return base;
  });
  const [enabled, setEnabled] = useState(initialVisualEnabled || initialVisualItems.length > 0);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialVisualItems[0]?.id ?? orderedSeed[0]?.id ?? null
  );
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(() => new Set());
  const [shapeScope, setShapeScope] = useState<ShapeApplyScope>("all");
  const [layoutScope, setLayoutScope] = useState<LayoutApplyScope>("selected");
  const [activeGridLayout, setActiveGridLayout] =
    useState<VisualGridLayoutId>(() =>
      normalizeVisualGridLayoutId(initialVisualGrid)
    );
  const [canvasLayout, setCanvasLayout] = useState<VisualGridLayoutId>(() =>
    normalizeVisualGridLayoutId(initialVisualGrid)
  );
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [interaction, setInteraction] = useState<InteractionState>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const tileMap = useMemo(() => new Map(pool.map((tile) => [tile.id, tile])), [pool]);
  const activeItems = useMemo(
    () =>
      items
        .filter((item) => tileMap.has(item.id))
        .slice()
        .sort((a, b) => a.z - b.z),
    [items, tileMap]
  );
  const layoutBands = useMemo(
    () => listLayoutBands(activeItems, activeGridLayout),
    [activeItems, activeGridLayout]
  );
  const selected = activeItems.find((item) => item.id === selectedId) ?? null;
  const selectedTile = selected ? tileMap.get(selected.id) ?? null : null;
  const selectedIds = useMemo(() => new Set(activeItems.map((item) => item.id)), [activeItems]);
  const runwayTiles = useMemo<HomepageEditorialTile[]>(
    () =>
      activeItems.flatMap((item) => {
        const tile = tileMap.get(item.id);
        if (!tile) return [];
        return [
          {
            id: tile.id,
            href: tile.href,
            title: tile.title,
            imageUrl: tile.imageUrl,
            eyebrow: tile.eyebrow,
            mobileSpan: 1 as const,
            desktopSpan: 1 as const,
            emphasize: tile.kind === "custom",
            variant: tile.kind === "custom" ? ("custom" as const) : ("default" as const),
            primaryCtaLabel: tile.primaryCtaLabel,
            secondaryHref: tile.secondaryHref,
            secondaryCtaLabel: tile.secondaryCtaLabel,
          },
        ];
      }),
    [activeItems, tileMap]
  );
  const scrollCanvas = isScrollVisualLayout(canvasLayout);
  const addCandidates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return pool.filter((tile) => {
      if (selectedIds.has(tile.id)) return false;
      if (!normalizedQuery) return true;
      return (
        tile.title.toLowerCase().includes(normalizedQuery) ||
        tile.id.toLowerCase().includes(normalizedQuery) ||
        tile.kind.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [pool, query, selectedIds]);

  useEffect(() => {
    if (!interaction) return;
    const onMove = (event: PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const deltaX = ((event.clientX - interaction.startClientX) / rect.width) * 100;
      const deltaY = ((event.clientY - interaction.startClientY) / rect.height) * 100;
      setItems((prev) =>
        normalizeItems(
          prev.map((item) => {
            if (item.id !== interaction.id) return item;
            if (interaction.mode === "drag") {
              const nextW = item.w;
              const nextH = item.h;
              let x = clamp(interaction.startX + deltaX, 0, 100 - nextW);
              let y = clamp(interaction.startY + deltaY, 0, 100 - nextH);
              if (snapEnabled) {
                x = snapVisual(x, VISUAL_COL_UNIT);
                y = snapVisual(y, VISUAL_ROW_UNIT);
              }
              return { ...item, x, y };
            }
            let nextW = clamp(interaction.startW + deltaX, VISUAL_COL_UNIT * 2, 100 - interaction.startX);
            let nextH = clamp(interaction.startH + deltaY, VISUAL_ROW_UNIT * 1.5, 100 - interaction.startY);
            if (snapEnabled) {
              nextW = snapVisual(nextW, VISUAL_COL_UNIT);
              nextH = snapVisual(nextH, VISUAL_ROW_UNIT);
            }
            return { ...item, w: nextW, h: nextH };
          })
        )
      );
      setMessage("");
      setError("");
    };
    const onUp = () => {
      if (snapEnabled) {
        setItems((prev) => {
          const active = interaction;
          if (!active?.id) return prev;
          return normalizeItems(
            prev.map((item) =>
              item.id === active.id ? snapVisualItem(item) : item
            )
          );
        });
      }
      setInteraction(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [interaction, snapEnabled]);

  const touch = () => {
    setMessage("");
    setError("");
  };

  const patchUnified = (partial: Partial<VisualUnifiedBackgroundSettings>) => {
    setUnified((prev) => ({ ...prev, ...partial }));
    touch();
  };

  const setUnifiedBackgroundColor = (raw: string, enable = true) => {
    const color = resolveUnifiedCanvasColor(
      normalizeHexColor(raw, DEFAULT_UNIFIED_BG_COLOR)
    );
    patchUnified({
      color,
      // Color canvas must win over an optional bg image for soft-isolate.
      ...(enable
        ? { enabled: true, isolate_products: true, image_url: "" }
        : {}),
    });
  };

  const bringToFront = (id: string) => {
    setItems((prev) => {
      const maxZ = prev.reduce((max, item) => Math.max(max, item.z), -1);
      return normalizeItems(
        prev.map((item) => (item.id === id ? { ...item, z: maxZ + 1 } : item))
      );
    });
  };

  const startInteraction = (
    event: ReactPointerEvent,
    item: HomepageVisualLayoutItem,
    mode: "drag" | "resize"
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(item.id);
    bringToFront(item.id);
    setEnabled(true);
    setInteraction({
      id: item.id,
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: item.x,
      startY: item.y,
      startW: item.w,
      startH: item.h,
    });
    touch();
  };

  const resolveShapeTargets = (scope: ShapeApplyScope): Set<string> => {
    const ids = new Set<string>();
    for (const item of activeItems) {
      const tile = tileMap.get(item.id);
      if (!tile) continue;
      if (scope === "all") {
        ids.add(item.id);
        continue;
      }
      if (scope === "selected") {
        if (bulkSelectedIds.has(item.id)) {
          ids.add(item.id);
        } else if (bulkSelectedIds.size === 0 && selectedId === item.id) {
          ids.add(item.id);
        }
        continue;
      }
      if (scope === "categories" && tile.kind === "category") ids.add(item.id);
      if (scope === "products" && tile.kind === "product") ids.add(item.id);
      if (scope === "custom" && tile.kind === "custom") ids.add(item.id);
    }
    return ids;
  };

  const applyShapeToScope = (shape: HomepageVisualBlockShape, scope: ShapeApplyScope) => {
    const targets = resolveShapeTargets(scope);
    if (targets.size === 0) return;
    setItems((prev) =>
      normalizeItems(
        prev.map((item) =>
          targets.has(item.id) ? applyShapePreset(item, shape) : item
        )
      )
    );
    touch();
  };

  const applyAutoShapePreset = (presetId: AutoShapePresetId, scope: ShapeApplyScope) => {
    const targets = resolveShapeTargets(scope);
    if (targets.size === 0) return;
    const ordered = activeItems.filter((item) => targets.has(item.id));
    setItems((prev) =>
      normalizeItems(
        prev.map((item) => {
          if (!targets.has(item.id)) return item;
          const index = ordered.findIndex((entry) => entry.id === item.id);
          const tile = tileMap.get(item.id);
          const shape = shapeForAutoPreset(presetId, Math.max(index, 0), tile);
          return applyShapePreset(item, shape);
        })
      )
    );
    touch();
  };

  const updateSelectedShape = (shape: HomepageVisualBlockShape) => {
    if (!selected) return;
    setItems((prev) =>
      normalizeItems(
        prev.map((item) =>
          item.id === selected.id ? applyShapePreset(item, shape) : item
        )
      )
    );
    touch();
  };

  const toggleBulkSelect = (id: string) => {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    touch();
  };

  const selectAllBulk = () => {
    setBulkSelectedIds(new Set(activeItems.map((item) => item.id)));
    touch();
  };

  const clearBulkSelect = () => {
    setBulkSelectedIds(new Set());
    touch();
  };

  const resolveLayoutTargets = (scope: LayoutApplyScope): Set<string> => {
    if (scope === "all") return new Set(activeItems.map((item) => item.id));
    const ids = new Set<string>();
    for (const item of activeItems) {
      if (bulkSelectedIds.has(item.id)) ids.add(item.id);
      else if (bulkSelectedIds.size === 0 && selectedId === item.id) ids.add(item.id);
    }
    return ids;
  };

  const layoutTargetCount = resolveLayoutTargets(layoutScope).size;
  const layoutDisabled = layoutTargetCount === 0;

  const alignSelection = (mode: VisualAlignMode) => {
    const targets = resolveLayoutTargets(layoutScope);
    if (targets.size === 0) return;
    setItems((prev) => alignVisualItems(prev, targets, mode));
    touch();
  };

  const distributeSelection = (axis: "horizontal" | "vertical") => {
    const targets = resolveLayoutTargets(layoutScope);
    if (targets.size < 3) return;
    setItems((prev) => distributeVisualItems(prev, targets, axis));
    touch();
  };

  const snapAllToGrid = () => {
    setItems((prev) => normalizeItems(prev));
    touch();
  };

  const applyGridLayout = (
    layoutId: VisualGridLayoutId,
    spacingValue: VisualLayoutSpacing = spacing,
    scalesValue: number[] = rowScales
  ) => {
    if (activeItems.length === 0) return;
    const bands = listLayoutBands(activeItems, layoutId);
    const nextScales = normalizeRowScales(scalesValue, bands.length);
    const organized = applyVisualGridLayout(
      activeItems,
      layoutId,
      "custom-design",
      spacingValue,
      nextScales
    );
    const rows = layoutRowCount(activeItems, layoutId);
    setItems(organized);
    setActiveGridLayout(layoutId);
    setCanvasLayout(layoutId);
    setRowScales(nextScales);
    setHeight(
      isHorizontalScrollLayout(layoutId)
        ? 720
        : isGridScrollLayout(layoutId)
          ? 760
          : recommendedCanvasHeightForRows(rows, nextScales)
    );
    setEnabled(true);
    setError("");
    const layoutLabel =
      VISUAL_GRID_LAYOUT_OPTIONS.find((l) => l.id === layoutId)?.label ??
      layoutId;
    setMessage(
      isHorizontalScrollLayout(layoutId)
        ? `Applied “${layoutLabel}” — swipe left and right to discover products.`
        : isGridScrollLayout(layoutId)
          ? `Applied “${layoutLabel}” — swipe left and right to see more grids.`
          : `Applied “${layoutLabel}” — ${bands.length} rows with independent height.`
    );
  };

  const refreshLayoutWithSpacing = (next: VisualLayoutSpacing) => {
    setSpacing(next);
    if (activeItems.length > 0) {
      applyGridLayout(activeGridLayout, next, rowScales);
    } else {
      touch();
    }
  };

  const updateRowScale = (index: number, raw: number) => {
    const bands = listLayoutBands(activeItems, activeGridLayout);
    const next = normalizeRowScales(rowScales, bands.length);
    next[index] = clampRowScale(raw);
    applyGridLayout(activeGridLayout, spacing, next);
  };

  const resetRowScales = () => {
    const bands = listLayoutBands(activeItems, activeGridLayout);
    applyGridLayout(
      activeGridLayout,
      spacing,
      Array.from({ length: bands.length }, () => DEFAULT_ROW_SCALE)
    );
  };

  const updateSpacingMaster = (value: number) => {
    const master = Math.min(100, Math.max(0, value));
    setSpacingMaster(master);
    if (spacingLinked) {
      refreshLayoutWithSpacing(spacingFromMaster(master));
    }
  };

  const updateSpacingField = (
    key: keyof VisualLayoutSpacing,
    raw: number
  ) => {
    setSpacingLinked(false);
    const limits: Record<keyof VisualLayoutSpacing, [number, number]> = {
      padTop: [4, 24],
      blockGap: [0, 5],
      edgeGap: [0, 4],
    };
    const [min, max] = limits[key];
    const next = {
      ...spacing,
      [key]: Math.min(max, Math.max(min, Math.round(raw * 100) / 100)),
    };
    setSpacingMaster(masterFromSpacing(next));
    refreshLayoutWithSpacing(next);
  };

  const updateTileGap = (raw: number) => {
    setSpacingLinked(false);
    const next = {
      ...spacing,
      blockGap: Math.min(5, Math.max(0, Math.round(raw * 100) / 100)),
    };
    setSpacingMaster(masterFromSpacing(next));
    refreshLayoutWithSpacing(next);
  };

  const linkSpacingProportions = () => {
    setSpacingLinked(true);
    refreshLayoutWithSpacing(spacingFromMaster(spacingMaster));
  };

  const updateSelectedMetric = (
    key: "x" | "y" | "w" | "h",
    raw: number
  ) => {
    if (!selected) return;
    setItems((prev) =>
      normalizeItems(
        prev.map((item) => {
          if (item.id !== selected.id) return item;
          const next = { ...item, [key]: raw };
          return snapVisualItem(next);
        })
      )
    );
    touch();
  };

  const bulkTargetCount = resolveShapeTargets(shapeScope).size;
  const scopeDisabled = bulkTargetCount === 0;

  const removeItem = (id: string) => {
    setItems((prev) => normalizeItems(prev.filter((item) => item.id !== id)));
    setSelectedId((prev) => (prev === id ? null : prev));
    touch();
  };

  const addTile = (tile: VisualLayoutTile) => {
    setEnabled(true);
    setItems((prev) => {
      const shape = tile.kind === "custom" ? "hero" : "portrait";
      const { w, h } = shapePresetSize(shape);
      return normalizeItems([
        ...prev,
        snapVisualItem({
          id: tile.id,
          x: 2 + (prev.length % 3) * (VISUAL_COL_UNIT * 3),
          y: 14 + Math.floor(prev.length / 3) * (VISUAL_ROW_UNIT * 2),
          w,
          h,
          shape,
          z: prev.length,
        }),
      ]);
    });
    setSelectedId(tile.id);
    touch();
  };

  const buildPayload = (visualEnabled: boolean) => ({
    homepage: {
      editorial_order: activeItems
        .filter((item) => item.id !== "custom-design")
        .map((item) => item.id),
      editorial_manual: true,
      visual_layout_enabled: visualEnabled,
      visual_layout_grid: canvasLayout,
      visual_layout_height: height,
      visual_layout_pad_top: spacing.padTop,
      visual_layout_block_gap: spacing.blockGap,
      visual_layout_edge_gap: spacing.edgeGap,
      visual_layout_row_scales: rowScales,
      visual_layout_items: activeItems,
      visual_layout_unified: unified,
    },
  });

  const save = async (visualEnabled = true) => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/store-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: buildPayload(visualEnabled),
          sections: ["homepage"],
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || s.editorialOrderSaveError);
      }
      setEnabled(visualEnabled);
      setMessage(
        visualEnabled
          ? "Saved visual storefront layout."
          : "Visual layout disabled. Legacy grid stays active."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : s.editorialOrderSaveError);
    } finally {
      setSaving(false);
    }
  };

  const resetDefault = () => {
    setItems(normalizeItems(createDefaultLayout(orderedSeed)));
    setRowScales([]);
    setEnabled(true);
    setActiveGridLayout("editorial_split");
    setCanvasLayout("editorial_split");
    setSelectedId(orderedSeed[0]?.id ?? null);
    touch();
  };

  const resetToAutoGrid = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/store-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            homepage: {
              editorial_order: [],
              editorial_manual: false,
              visual_layout_enabled: false,
              visual_layout_items: [],
            },
          },
          sections: ["homepage"],
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || s.editorialOrderSaveError);
      }
      setEnabled(false);
      setItems(normalizeItems(createDefaultLayout(autoTiles)));
      setActiveGridLayout("editorial_split");
      setCanvasLayout("editorial_split");
      setSelectedId(autoTiles[0]?.id ?? null);
      setMessage("Reset to the default storefront flow.");
    } catch (err) {
      setError(err instanceof Error ? err.message : s.editorialOrderSaveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-beige-dark bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">Visual Storefront Layout</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Drag blocks, resize them with the mouse, and control the desktop layout for
            Custom Design plus the post-hero storefront tiles. Mobile stays automatic.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={saving} onClick={resetDefault}>
            <RotateCcw className="me-1 h-3.5 w-3.5" />
            Reset canvas
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => void save(false)}
          >
            Disable visual mode
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => void resetToAutoGrid()}
          >
            Legacy auto layout
          </Button>
          <Button type="button" size="sm" disabled={saving} onClick={() => void save(true)}>
            <Save className="me-1 h-3.5 w-3.5" />
            {saving ? s.editorialOrderSaving : "Save visual layout"}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-beige-dark/70 bg-ivory/35 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-charcoal">Desktop showcase preview</p>
                <p className="text-xs text-muted">
                  {isHorizontalScrollLayout(canvasLayout)
                    ? "Side-scroll runway. Swipe or use arrows to browse products, then save."
                    : isGridScrollLayout(canvasLayout)
                      ? "Sliding grids. One product fills the grid — swipe to the next, then save."
                      : "White storefront canvas with proportional 12-column grid. Drag, resize, align, then save."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={snapEnabled}
                    onChange={(event) => setSnapEnabled(event.target.checked)}
                    className="accent-gold"
                  />
                  <Magnet className="h-3.5 w-3.5" />
                  Snap
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(event) => setShowGrid(event.target.checked)}
                    className="accent-gold"
                  />
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Grid
                </label>
                <label className="flex items-center gap-1.5 text-xs text-charcoal">
                  <input
                    type="checkbox"
                    checked={unified.enabled}
                    onChange={(event) =>
                      patchUnified({
                        enabled: event.target.checked,
                        ...(event.target.checked
                          ? {
                              isolate_products: true,
                              color: resolveUnifiedCanvasColor(unified.color),
                              image_url: "",
                            }
                          : {}),
                      })
                    }
                    className="accent-gold"
                  />
                  Unified background
                </label>
                {unified.enabled ? (
                  <label className="flex items-center gap-1.5 text-xs text-charcoal">
                    <input
                      type="color"
                      aria-label="Unified background color"
                      className="h-8 w-10 cursor-pointer rounded-lg border border-beige-dark bg-white p-0.5"
                      value={unifiedColorPickerValue(
                        resolveUnifiedCanvasColor(unified.color)
                      )}
                      onChange={(event) =>
                        setUnifiedBackgroundColor(event.target.value, false)
                      }
                    />
                    Canvas color
                  </label>
                ) : null}
                <label className="flex items-center gap-2 text-xs text-muted">
                  Height
                  <input
                    type="range"
                    min={620}
                    max={1600}
                    step={20}
                    value={height}
                    onChange={(event) => {
                      setHeight(Number(event.target.value));
                      touch();
                    }}
                  />
                  <span className="w-12 text-right font-mono text-charcoal">{height}px</span>
                </label>
              </div>
            </div>

            <div className="mt-3 space-y-2 rounded-xl border border-gold/35 bg-white px-3 py-3">
              <div>
                <p className="text-xs font-medium text-charcoal">Space between tiles</p>
                <p className="text-[10px] text-muted">
                  One control for every gap — left, right, above, and below all blocks together.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={Math.round(spacing.blockGap * 10)}
                  onChange={(event) => updateTileGap(Number(event.target.value) / 10)}
                  className="min-w-[12rem] flex-1"
                />
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={1}
                  value={Math.round(spacing.blockGap * 10)}
                  onChange={(event) => updateTileGap(Number(event.target.value) / 10)}
                  className="w-16 rounded-lg border border-beige-dark px-2 py-1 text-center font-mono text-sm text-charcoal"
                />
              </div>
            </div>

            <div className="mt-3 space-y-3 rounded-xl border border-beige-dark/60 bg-white px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-charcoal">Layout spacing</p>
                  <p className="text-[10px] text-muted">
                    One control for top, between blocks, and edges — keeps proportions balanced.
                  </p>
                </div>
                <label className="flex items-center gap-1.5 text-[10px] text-muted">
                  <input
                    type="checkbox"
                    checked={spacingLinked}
                    onChange={(event) => {
                      if (event.target.checked) linkSpacingProportions();
                      else setSpacingLinked(false);
                    }}
                    className="accent-gold"
                  />
                  Link all gaps
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={spacingMaster}
                  onChange={(event) => updateSpacingMaster(Number(event.target.value))}
                  className="min-w-[10rem] flex-1"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={spacingMaster}
                  onChange={(event) => updateSpacingMaster(Number(event.target.value))}
                  className="w-14 rounded-lg border border-beige-dark px-2 py-1 text-center font-mono text-xs text-charcoal"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <label className="rounded-lg border border-beige-dark/70 bg-ivory/30 px-2.5 py-2 text-xs">
                  <span className="block text-[10px] uppercase tracking-[0.16em] text-muted">
                    Top (%)
                  </span>
                  <input
                    type="number"
                    min={4}
                    max={24}
                    step={0.1}
                    value={spacing.padTop}
                    onChange={(event) =>
                      updateSpacingField("padTop", Number(event.target.value))
                    }
                    className="mt-1 w-full border-0 bg-transparent p-0 font-mono text-sm text-charcoal outline-none"
                  />
                </label>
                <label className="rounded-lg border border-beige-dark/70 bg-ivory/30 px-2.5 py-2 text-xs">
                  <span className="block text-[10px] uppercase tracking-[0.16em] text-muted">
                    Between blocks (%)
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={spacing.blockGap}
                    onChange={(event) =>
                      updateSpacingField("blockGap", Number(event.target.value))
                    }
                    className="mt-1 w-full border-0 bg-transparent p-0 font-mono text-sm text-charcoal outline-none"
                  />
                </label>
                <label className="rounded-lg border border-beige-dark/70 bg-ivory/30 px-2.5 py-2 text-xs">
                  <span className="block text-[10px] uppercase tracking-[0.16em] text-muted">
                    Edge inset (%)
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={4}
                    step={0.1}
                    value={spacing.edgeGap}
                    onChange={(event) =>
                      updateSpacingField("edgeGap", Number(event.target.value))
                    }
                    className="mt-1 w-full border-0 bg-transparent p-0 font-mono text-sm text-charcoal outline-none"
                  />
                </label>
              </div>
            </div>

            <div className="mt-3 space-y-3 rounded-xl border border-beige-dark/60 bg-white px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-charcoal">Row heights</p>
                  <p className="text-[10px] text-muted">
                    Each row has its own scale. Apply a grid layout first, then stretch or compress rows independently.
                  </p>
                </div>
                <button
                  type="button"
                  className="text-[10px] uppercase tracking-[0.14em] text-gold hover:underline"
                  onClick={resetRowScales}
                  disabled={activeItems.length === 0}
                >
                  Equal rows
                </button>
              </div>
              {layoutBands.length === 0 ? (
                <p className="text-xs text-muted">Add blocks and apply a grid layout to scale rows.</p>
              ) : (
                <div className="space-y-2">
                  {layoutBands.map((band, index) => {
                    const scale = rowScales[index] ?? DEFAULT_ROW_SCALE;
                    return (
                      <div
                        key={`row-${band.start}-${index}`}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-beige-dark/60 bg-ivory/30 px-2.5 py-2"
                      >
                        <span className="w-14 shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                          Row {index + 1}
                        </span>
                        <input
                          type="range"
                          min={ROW_SCALE_MIN}
                          max={ROW_SCALE_MAX}
                          step={0.05}
                          value={scale}
                          onChange={(event) =>
                            updateRowScale(index, Number(event.target.value))
                          }
                          className="min-w-[8rem] flex-1"
                        />
                        <input
                          type="number"
                          min={Math.round(ROW_SCALE_MIN * 100)}
                          max={Math.round(ROW_SCALE_MAX * 100)}
                          step={5}
                          value={Math.round(scale * 100)}
                          onChange={(event) =>
                            updateRowScale(index, Number(event.target.value) / 100)
                          }
                          className="w-16 rounded-lg border border-beige-dark bg-white px-2 py-1 text-center font-mono text-xs text-charcoal"
                        />
                        <span className="w-6 text-[10px] text-muted">%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-beige-dark/60 bg-white px-3 py-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
                Align
              </span>
              {(
                [
                  ["left", AlignLeft, "Align left"],
                  ["center-h", AlignCenter, "Align center"],
                  ["right", AlignRight, "Align right"],
                  ["top", AlignStartVertical, "Align top"],
                  ["center-v", AlignCenterVertical, "Align middle"],
                  ["bottom", AlignEndVertical, "Align bottom"],
                ] as const
              ).map(([mode, Icon, label]) => (
                <button
                  key={mode}
                  type="button"
                  disabled={layoutDisabled}
                  title={label}
                  className="rounded-lg border border-beige-dark bg-white p-1.5 text-charcoal transition hover:border-gold hover:bg-gold/5 disabled:opacity-40"
                  onClick={() => alignSelection(mode)}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
              <span className="mx-1 h-5 w-px bg-beige-dark/70" aria-hidden />
              <button
                type="button"
                disabled={layoutTargetCount < 3}
                title="Distribute horizontally"
                className="rounded-lg border border-beige-dark bg-white p-1.5 text-charcoal transition hover:border-gold hover:bg-gold/5 disabled:opacity-40"
                onClick={() => distributeSelection("horizontal")}
              >
                <AlignHorizontalDistributeCenter className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={layoutDisabled}
                title="Snap all blocks to grid"
                className="rounded-lg border border-beige-dark bg-white px-2 py-1.5 text-xs text-charcoal transition hover:border-gold hover:bg-gold/5 disabled:opacity-40"
                onClick={snapAllToGrid}
              >
                Snap all
              </button>
              <button
                type="button"
                disabled={activeItems.length === 0}
                title="Apply selected grid layout to all canvas blocks"
                className="rounded-lg border border-gold/40 bg-gold/10 px-2 py-1.5 text-xs font-medium text-charcoal transition hover:bg-gold/15 disabled:opacity-40"
                onClick={() => applyGridLayout(activeGridLayout)}
              >
                Apply layout
              </button>
              <div className="ms-auto flex gap-1">
                {(["selected", "all"] as const).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    className={`rounded-lg border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${
                      layoutScope === scope
                        ? "border-gold bg-gold/10 text-charcoal"
                        : "border-beige-dark text-muted"
                    }`}
                    onClick={() => setLayoutScope(scope)}
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>

            {scrollCanvas ? (
              <div
                className={cn(
                  "relative mt-4 overflow-hidden border",
                  unified.enabled
                    ? cn("border-beige-dark/30", unifiedCanvasClassName(true))
                    : "rounded-[28px] border-beige-dark/50 bg-white shadow-inner"
                )}
              >
                <div className="border-b border-beige-dark/30 px-5 py-3">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-muted">
                    Storefront
                  </p>
                  <p className="text-sm font-medium text-charcoal">
                    {isGridScrollLayout(canvasLayout)
                      ? "Sliding grids preview"
                      : "Side-scroll preview"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {isGridScrollLayout(canvasLayout)
                      ? "Shoppers see one product at a time. Swipe left or right to transition to the next grid. Reorder in Canvas order below."
                      : "Shoppers swipe left and right to discover products. Reorder in Canvas order below."}
                  </p>
                </div>
                {isGridScrollLayout(canvasLayout) ? (
                  <HomeVisualGridPages
                    tiles={runwayTiles}
                    unified={unified.enabled ? unified : undefined}
                    preview
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                ) : (
                  <HomeVisualProductRunway
                    tiles={runwayTiles}
                    unified={unified.enabled ? unified : undefined}
                    preview
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                )}
              </div>
            ) : (
            <div
              ref={canvasRef}
              className={cn(
                "relative mt-4 overflow-hidden border",
                unified.enabled
                  ? cn("border-beige-dark/30", unifiedCanvasClassName(true))
                  : "rounded-[28px] border-beige-dark/50 bg-white shadow-inner"
              )}
              style={{
                height,
                ...(unified.enabled ? unifiedBackgroundStyle(unified) : {}),
              }}
            >
              {showGrid ? (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, rgba(15,15,15,0.05) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(15,15,15,0.05) 1px, transparent 1px)
                    `,
                    backgroundSize: `${100 / 12}% ${100 / 10}%`,
                  }}
                />
              ) : null}
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-0 z-10 border-b px-5",
                  unified.enabled
                    ? "h-12 border-beige-dark/25 bg-[color-mix(in_srgb,var(--unified-canvas)_88%,transparent)] backdrop-blur-[2px]"
                    : "h-16 border-beige-dark/50 bg-white/75 backdrop-blur"
                )}
                style={
                  unified.enabled
                    ? ({
                        ["--unified-canvas" as string]: unifiedColorPickerValue(
                          unified.color
                        ),
                      } as CSSProperties)
                    : undefined
                }
              >
                <div className="flex h-full items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-muted">
                      Storefront
                    </p>
                    <p className="text-sm font-medium text-charcoal">Desktop preview</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${
                      enabled
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-white text-muted"
                    }`}
                  >
                    {enabled ? "visual mode on" : "legacy mode"}
                  </span>
                </div>
              </div>

              {activeItems.map((item) => {
                const tile = tileMap.get(item.id);
                if (!tile) return null;
                const active = selectedId === item.id;
                const floatMode = unified.enabled && !unified.keep_product_grids;
                const presentation = unifiedTilePresentation(unified);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "absolute bg-transparent transition",
                      floatMode
                        ? active
                          ? "z-10 outline outline-2 outline-offset-2 outline-gold/50"
                          : ""
                        : cn(
                            "rounded-[20px] border",
                            active
                              ? "border-gold bg-white shadow-[0_8px_28px_rgba(20,20,20,0.08)] ring-2 ring-gold/25"
                              : "border-beige-dark/40 bg-white shadow-[0_8px_28px_rgba(20,20,20,0.08)]"
                          )
                    )}
                    style={itemStyle(item)}
                    onPointerDown={(event) => startInteraction(event, item, "drag")}
                  >
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-0",
                        floatMode ? "overflow-visible" : "overflow-hidden rounded-[24px]"
                      )}
                    >
                      <HomeEditorialTile
                        href={tile.href}
                        imageUrl={unifiedTileImageUrl(tile.imageUrl, unified)}
                        originalImageUrl={tile.imageUrl}
                        title={tile.title}
                        eyebrow={tile.eyebrow}
                        ctaLabel={tile.primaryCtaLabel}
                        secondaryHref={tile.secondaryHref}
                        secondaryCtaLabel={tile.secondaryCtaLabel}
                        emphasize={tile.kind === "custom"}
                        titleSize={tile.kind === "custom" ? "md" : "sm"}
                        className="h-full bg-transparent"
                        aspectClassName="h-full"
                        sizes="100vw"
                        presentation={presentation.presentation}
                        productIsolation={Boolean(presentation.productIsolation)}
                        canvasColor={presentation.canvasColor}
                        imageScale={presentation.imageScale}
                        imageOffsetX={presentation.imageOffsetX}
                        imageOffsetY={presentation.imageOffsetY}
                        dropShadow={presentation.dropShadow}
                        shadowIntensity={presentation.shadowIntensity}
                      />
                    </div>

                    {floatMode ? (
                      <div className="pointer-events-none absolute top-1.5 right-1.5 z-20 flex items-center gap-1">
                        <span className="rounded-full bg-charcoal/55 px-2 py-0.5 text-[8px] uppercase tracking-[0.16em] text-white/90">
                          {kindLabel(tile.kind)}
                        </span>
                        <Move className="h-3 w-3 text-charcoal/45" />
                      </div>
                    ) : (
                      <div className="absolute inset-x-0 top-0 flex items-center justify-between rounded-t-[24px] bg-gradient-to-b from-charcoal/55 via-charcoal/15 to-transparent px-3 py-2 text-white">
                        <div className="min-w-0">
                          <p className="truncate text-[10px] uppercase tracking-[0.2em] text-white/75">
                            {kindLabel(tile.kind)}
                          </p>
                          <p className="truncate text-xs font-medium">{tile.title}</p>
                        </div>
                        <Move className="h-3.5 w-3.5 shrink-0" />
                      </div>
                    )}

                    <button
                      type="button"
                      className={cn(
                        "absolute z-30 rounded-full bg-charcoal/78 p-2 text-white shadow",
                        floatMode ? "top-2 left-2" : "bottom-2 right-2"
                      )}
                      onPointerDown={(event) => startInteraction(event, item, "resize")}
                      aria-label={`Resize ${tile.title}`}
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
            )}
          </div>

          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-beige-dark/70 bg-ivory/35 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-charcoal">
                  Unified Post Grid Background
                </p>
                <p className="mt-1 text-xs text-muted">
                  One continuous editorial canvas. Product titles sit under each photo.
                  Enable product isolation to remove original photo backgrounds via Cloudinary AI.
                </p>
              </div>
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-charcoal">
                <input
                  type="checkbox"
                  checked={unified.enabled}
                  onChange={(event) =>
                    patchUnified({
                      enabled: event.target.checked,
                      ...(event.target.checked
                        ? {
                            isolate_products: true,
                            color: resolveUnifiedCanvasColor(unified.color),
                            image_url: "",
                          }
                        : {}),
                    })
                  }
                  className="accent-gold"
                />
                Enable
              </label>
            </div>

            <div className={cn("mt-3 space-y-3", !unified.enabled && "opacity-55")}>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                  Unified background color
                </p>
                <p className="mt-1 text-[10px] text-muted">
                  White by default. Pick a cream swatch if you want a warmer canvas.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {UNIFIED_BG_COLOR_PRESETS.map((preset) => {
                    const active =
                      unifiedColorPickerValue(unified.color).toLowerCase() ===
                      preset.color.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        title={preset.label}
                        aria-label={`${preset.label} (${preset.color})`}
                        onClick={() => setUnifiedBackgroundColor(preset.color)}
                        className={cn(
                          "h-9 w-9 rounded-full border-2 transition hover:scale-105",
                          active
                            ? "border-gold ring-2 ring-gold/30"
                            : "border-beige-dark/70"
                        )}
                        style={{ backgroundColor: preset.color }}
                      />
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Post grid background color"
                    className="h-10 w-12 cursor-pointer rounded-xl border border-beige-dark bg-white p-1"
                    value={unifiedColorPickerValue(
                      resolveUnifiedCanvasColor(unified.color)
                    )}
                    onChange={(event) =>
                      setUnifiedBackgroundColor(event.target.value)
                    }
                  />
                  <input
                    dir="ltr"
                    value={resolveUnifiedCanvasColor(unified.color)}
                    onChange={(event) =>
                      setUnifiedBackgroundColor(event.target.value, false)
                    }
                    onBlur={(event) =>
                      setUnifiedBackgroundColor(event.target.value)
                    }
                    placeholder={DEFAULT_UNIFIED_BG_COLOR}
                    className="min-w-0 flex-1 rounded-lg border border-beige-dark bg-white px-2.5 py-2 font-mono text-xs text-charcoal outline-none focus:border-gold"
                  />
                  <button
                    type="button"
                    title="Reset to white"
                    onClick={() =>
                      setUnifiedBackgroundColor(DEFAULT_UNIFIED_BG_COLOR)
                    }
                    className="rounded-lg border border-beige-dark bg-white px-2 py-2 text-[10px] uppercase tracking-[0.12em] text-muted transition hover:border-gold hover:text-charcoal"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-beige-dark/60 bg-white px-2.5 py-2.5 text-xs text-charcoal">
                <input
                  type="checkbox"
                  checked={unified.keep_product_grids}
                  disabled={!unified.enabled}
                  onChange={(event) =>
                    patchUnified({
                      keep_product_grids: event.target.checked,
                      ...(event.target.checked
                        ? { isolate_products: false }
                        : {}),
                    })
                  }
                  className="mt-0.5 accent-gold"
                />
                <span>
                  Keep product grids
                  {unified.enabled && unified.keep_product_grids ? (
                    <span className="ml-1.5 inline-flex rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-emerald-700">
                      Active
                    </span>
                  ) : null}
                  <span className="mt-1 block text-[10px] leading-relaxed text-muted">
                    Each product stays in its own card frame. The post grid still uses the
                    unified background color behind all cards.
                  </span>
                </span>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-beige-dark/60 bg-white px-2.5 py-2.5 text-xs text-charcoal">
                <input
                  type="checkbox"
                  checked={unified.isolate_products && !unified.keep_product_grids}
                  disabled={!unified.enabled || unified.keep_product_grids}
                  onChange={(event) =>
                    patchUnified({
                      isolate_products: event.target.checked,
                      ...(event.target.checked
                        ? { keep_product_grids: false }
                        : {}),
                    })
                  }
                  className="mt-0.5 accent-gold"
                />
                <span>
                  Product isolation
                  {unified.enabled &&
                  unified.isolate_products &&
                  !unified.keep_product_grids ? (
                    <span className="ml-1.5 inline-flex rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-emerald-700">
                      Active
                    </span>
                  ) : null}
                  <span className="mt-1 block text-[10px] leading-relaxed text-muted">
                    Removes the original photo background via Cloudinary AI and places a
                    transparent PNG of the product on the unified canvas. Original product
                    files are unchanged — only the post-grid uses the isolated URL
                    (CDN-cached after first generation). Unavailable while Keep product grids
                    is on.
                  </span>
                </span>
              </div>

              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                  Optional background image
                </p>
                <p className="mt-1 text-[10px] text-muted">
                  Product isolation uses a solid canvas color. A background image is ignored
                  while isolation is on so transparent products sit on one continuous editorial
                  background.
                </p>
                <div className="mt-2">
                  <ImageUpload
                    value={unified.image_url ? [unified.image_url] : []}
                    onChange={(urls) =>
                      patchUnified({
                        image_url: urls[0]?.trim() || "",
                        // Uploading a canvas image turns product isolation off for that look.
                        ...(urls[0]?.trim()
                          ? { isolate_products: false }
                          : { isolate_products: true }),
                      })
                    }
                    multiple={false}
                    maxImages={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] uppercase tracking-[0.14em] text-muted">
                  Image size
                  <select
                    value={unified.size}
                    disabled={!unified.enabled || !unified.image_url}
                    onChange={(event) =>
                      patchUnified({
                        size: event.target.value as VisualUnifiedBgSize,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-beige-dark bg-white px-2 py-2 text-xs normal-case tracking-normal text-charcoal"
                  >
                    {UNIFIED_BG_SIZES.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[10px] uppercase tracking-[0.14em] text-muted">
                  Image position
                  <select
                    value={unified.position}
                    disabled={!unified.enabled || !unified.image_url}
                    onChange={(event) =>
                      patchUnified({
                        position: event.target.value as VisualUnifiedBgPosition,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-beige-dark bg-white px-2 py-2 text-xs normal-case tracking-normal text-charcoal"
                  >
                    {UNIFIED_BG_POSITIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div
                className={cn(
                  "space-y-2 rounded-xl border border-beige-dark/60 bg-white px-2.5 py-2.5",
                  unified.keep_product_grids && "opacity-55"
                )}
              >
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                  Product presentation
                </p>
                <p className="text-[10px] text-muted">
                  Scale, position, and shadow apply to floating products only (when Keep
                  product grids is off).
                </p>
                <label className="block text-[10px] text-muted">
                  Scale
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="range"
                      min={70}
                      max={120}
                      step={1}
                      disabled={!unified.enabled || unified.keep_product_grids}
                      value={Math.round(unified.product_scale * 100)}
                      onChange={(event) =>
                        patchUnified({
                          product_scale: Number(event.target.value) / 100,
                        })
                      }
                      className="min-w-0 flex-1"
                    />
                    <span className="w-10 text-right font-mono text-xs text-charcoal">
                      {Math.round(unified.product_scale * 100)}%
                    </span>
                  </div>
                </label>
                <label className="block text-[10px] text-muted">
                  Vertical position
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="range"
                      min={-20}
                      max={20}
                      step={1}
                      disabled={!unified.enabled || unified.keep_product_grids}
                      value={unified.product_offset_y}
                      onChange={(event) =>
                        patchUnified({
                          product_offset_y: Number(event.target.value),
                        })
                      }
                      className="min-w-0 flex-1"
                    />
                    <span className="w-10 text-right font-mono text-xs text-charcoal">
                      {unified.product_offset_y}
                    </span>
                  </div>
                </label>
                <label className="block text-[10px] text-muted">
                  Horizontal position
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="range"
                      min={-20}
                      max={20}
                      step={1}
                      disabled={!unified.enabled || unified.keep_product_grids}
                      value={unified.product_offset_x}
                      onChange={(event) =>
                        patchUnified({
                          product_offset_x: Number(event.target.value),
                        })
                      }
                      className="min-w-0 flex-1"
                    />
                    <span className="w-10 text-right font-mono text-xs text-charcoal">
                      {unified.product_offset_x}
                    </span>
                  </div>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-charcoal">
                  <input
                    type="checkbox"
                    checked={unified.product_shadow}
                    disabled={!unified.enabled || unified.keep_product_grids}
                    onChange={(event) =>
                      patchUnified({ product_shadow: event.target.checked })
                    }
                    className="accent-gold"
                  />
                  Subtle shadow
                </label>
                {unified.product_shadow ? (
                  <label className="block text-[10px] text-muted">
                    Shadow intensity
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        disabled={!unified.enabled || unified.keep_product_grids}
                        value={unified.product_shadow_intensity}
                        onChange={(event) =>
                          patchUnified({
                            product_shadow_intensity: Number(event.target.value),
                          })
                        }
                        className="min-w-0 flex-1"
                      />
                      <span className="w-10 text-right font-mono text-xs text-charcoal">
                        {unified.product_shadow_intensity}
                      </span>
                    </div>
                  </label>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-beige-dark/70 bg-ivory/35 p-4">
            <div>
              <p className="text-sm font-medium text-charcoal">Grid layout templates</p>
              <p className="mt-1 text-xs text-muted">
                Choose a proportional grid, then apply it to all canvas blocks. Side scroll is one product row. Sliding grids shows one product at a time — swipe to the next grid.
              </p>
            </div>
            <div className="mt-3 grid gap-2">
              {VISUAL_GRID_LAYOUT_OPTIONS.map((layout) => (
                <button
                  key={layout.id}
                  type="button"
                  disabled={activeItems.length === 0}
                  className={`rounded-xl border px-3 py-2.5 text-left transition disabled:opacity-40 ${
                    activeGridLayout === layout.id
                      ? "border-gold bg-gold/10"
                      : "border-beige-dark bg-white hover:bg-ivory"
                  }`}
                  onClick={() => setActiveGridLayout(layout.id)}
                  onDoubleClick={() => applyGridLayout(layout.id)}
                >
                  <span className="block text-sm font-medium text-charcoal">
                    {layout.label}
                  </span>
                  <span className="text-xs text-muted">{layout.hint}</span>
                </button>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              className="mt-3 w-full"
              disabled={activeItems.length === 0}
              onClick={() => applyGridLayout(activeGridLayout)}
            >
              Apply “
              {VISUAL_GRID_LAYOUT_OPTIONS.find((l) => l.id === activeGridLayout)
                ?.label ?? "layout"}
              ” to canvas
            </Button>
          </div>

          <div className="rounded-2xl border border-beige-dark/70 bg-ivory/35 p-4">
            <div>
              <p className="text-sm font-medium text-charcoal">Automatic shape presets</p>
              <p className="mt-1 text-xs text-muted">
                Apply a rhythm or one shape to all blocks, selected blocks, or by block type.
              </p>
            </div>

            <div className="mt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted">
                Apply to
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["all", "All blocks"],
                    ["selected", "Selected"],
                    ["categories", "Categories"],
                    ["products", "Products"],
                    ["custom", "Custom design"],
                  ] as const
                ).map(([scope, label]) => (
                  <button
                    key={scope}
                    type="button"
                    className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                      shapeScope === scope
                        ? "border-gold bg-gold/10 text-charcoal"
                        : "border-beige-dark bg-white text-muted hover:bg-ivory"
                    }`}
                    onClick={() => setShapeScope(scope)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {shapeScope === "selected" ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>
                    {bulkSelectedIds.size > 0
                      ? `${bulkSelectedIds.size} selected`
                      : selected
                        ? "Using current block (or check items below)"
                        : "Select blocks from canvas order"}
                  </span>
                  <button
                    type="button"
                    className="text-gold hover:underline"
                    onClick={selectAllBulk}
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={clearBulkSelect}
                  >
                    Clear
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted">
                Auto rhythms
              </p>
              <div className="grid gap-2">
                {AUTO_SHAPE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={scopeDisabled}
                    className="rounded-xl border border-beige-dark bg-white px-3 py-2 text-left transition hover:bg-ivory disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => applyAutoShapePreset(preset.id, shapeScope)}
                  >
                    <span className="block text-sm font-medium text-charcoal">
                      {preset.label}
                    </span>
                    <span className="text-xs text-muted">{preset.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted">
                One shape for scope
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  Object.entries(SHAPE_PRESETS) as [
                    HomepageVisualBlockShape,
                    { w: number; h: number; label: string },
                  ][]
                ).map(([shape, preset]) => (
                  <button
                    key={shape}
                    type="button"
                    disabled={scopeDisabled}
                    className="rounded-xl border border-beige-dark bg-white px-3 py-2 text-left text-sm transition hover:border-gold hover:bg-gold/5 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => applyShapeToScope(shape, shapeScope)}
                  >
                    <span className="block font-medium text-charcoal">{preset.label}</span>
                    <span className="text-xs text-muted">
                      Apply to {bulkTargetCount} block{bulkTargetCount === 1 ? "" : "s"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-beige-dark/70 bg-ivory/35 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-charcoal">Selected block</p>
                <p className="text-xs text-muted">
                  Choose a block to tune its shape or remove it from the canvas.
                </p>
              </div>
              {selected ? (
                <button
                  type="button"
                  className="rounded-lg border border-beige-dark bg-white px-2.5 py-1.5 text-xs text-charcoal hover:bg-ivory"
                  onClick={() => removeItem(selected.id)}
                >
                  <Trash2 className="me-1 inline h-3.5 w-3.5" />
                  Remove
                </button>
              ) : null}
            </div>

            {selected && selectedTile ? (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-beige-dark/70 bg-white p-3">
                  <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-charcoal/10">
                    {selectedTile.imageUrl ? (
                      <Image src={selectedTile.imageUrl} alt="" fill className="object-cover" sizes="48px" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-charcoal">{selectedTile.title}</p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                      {kindLabel(selectedTile.kind)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted">
                    Shape presets
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      Object.entries(SHAPE_PRESETS) as [
                        HomepageVisualBlockShape,
                        { w: number; h: number; label: string },
                      ][]
                    ).map(([shape, preset]) => (
                      <button
                        key={shape}
                        type="button"
                        className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                          selected.shape === shape
                            ? "border-gold bg-gold/10 text-charcoal"
                            : "border-beige-dark bg-white text-muted hover:bg-ivory"
                        }`}
                        onClick={() => updateSelectedShape(shape)}
                      >
                        <span className="block font-medium text-charcoal">{preset.label}</span>
                        <span className="text-xs text-muted">
                          {Math.round(preset.w)} x {Math.round(preset.h)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted">
                  {(
                    [
                      ["x", "X", VISUAL_COL_UNIT],
                      ["y", "Y", VISUAL_ROW_UNIT],
                      ["w", "W", VISUAL_COL_UNIT],
                      ["h", "H", VISUAL_ROW_UNIT],
                    ] as const
                  ).map(([key, label, step]) => (
                    <label
                      key={key}
                      className="rounded-xl border border-beige-dark/70 bg-white px-3 py-2"
                    >
                      <span className="block uppercase tracking-[0.18em]">{label}</span>
                      <input
                        type="number"
                        step={step}
                        min={0}
                        max={100}
                        value={Number(selected[key].toFixed(1))}
                        onChange={(event) =>
                          updateSelectedMetric(key, Number(event.target.value))
                        }
                        className="mt-1 w-full border-0 bg-transparent p-0 font-mono text-sm text-charcoal outline-none"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">Select a block on the preview canvas.</p>
            )}
          </div>

          <div className="rounded-2xl border border-beige-dark/70 bg-ivory/35 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-charcoal">Add blocks</p>
                <p className="text-xs text-muted">
                  Add categories, products, or the custom design block to the canvas.
                </p>
              </div>
              <Plus className="h-4 w-4 text-gold" />
            </div>

            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={s.editorialOrderAddSearch}
              className="mt-3 w-full rounded-lg border border-beige-dark bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-gold"
            />

            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
              {addCandidates.map((tile) => (
                <button
                  key={tile.id}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl border border-beige-dark/70 bg-white px-3 py-2 text-left hover:bg-ivory"
                  onClick={() => addTile(tile)}
                >
                  <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-md bg-charcoal/10">
                    {tile.imageUrl ? (
                      <Image src={tile.imageUrl} alt="" fill className="object-cover" sizes="44px" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-charcoal">{tile.title}</p>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
                      {kindLabel(tile.kind)}
                    </p>
                  </div>
                  <Grip className="h-3.5 w-3.5 shrink-0 text-muted" />
                </button>
              ))}
              {addCandidates.length === 0 ? (
                <p className="rounded-xl border border-dashed border-beige-dark bg-white px-3 py-4 text-sm text-muted">
                  {s.editorialOrderAddEmpty}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-beige-dark/70 bg-ivory/35 p-4">
            <p className="text-sm font-medium text-charcoal">Canvas order</p>
            <p className="mt-1 text-xs text-muted">
              Check blocks for bulk shape apply. Click a row to focus it on the canvas.
            </p>
            <div className="mt-3 space-y-2">
              {activeItems.map((item) => {
                const tile = tileMap.get(item.id);
                if (!tile) return null;
                const isActive = item.id === selectedId;
                const isChecked = bulkSelectedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 rounded-xl border px-2 py-2 ${
                      isActive
                        ? "border-gold bg-gold/10"
                        : "border-beige-dark/70 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleBulkSelect(item.id)}
                      className="h-3.5 w-3.5 shrink-0 accent-gold"
                      aria-label={`Include ${tile.title} in bulk shape apply`}
                    />
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 text-left hover:opacity-80"
                      onClick={() => {
                        setSelectedId(item.id);
                        bringToFront(item.id);
                      }}
                    >
                      <Square className="h-3.5 w-3.5 shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 truncate text-sm text-charcoal">
                        {tile.title}
                      </span>
                      <span className="font-mono text-[11px] text-muted">
                        {item.shape} · z:{item.z}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
