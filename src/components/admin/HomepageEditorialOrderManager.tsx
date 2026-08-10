"use client";

import Image from "next/image";
import { useMemo, useState, type DragEvent } from "react";
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type {
  HomepageEditorialColumns,
  HomepageEditorialGap,
  HomepageEditorialPattern,
  HomepageEditorialTileSize,
} from "@/types/store";

export type EditorialOrderTile = {
  id: string;
  title: string;
  imageUrl: string;
  kind: "category" | "product";
};

export type EditorialLayoutInitial = {
  columns: HomepageEditorialColumns;
  gap: HomepageEditorialGap;
  tileSize: HomepageEditorialTileSize;
  pattern: HomepageEditorialPattern;
};

type Props = {
  /** All addable candidates (categories + products with images). */
  availableTiles: EditorialOrderTile[];
  /** Saved membership/order. */
  initialOrder: string[];
  /** Whether Admin previously saved an explicit grid. */
  initialManual: boolean;
  /** Auto-discovered tiles used when not in manual mode. */
  autoTiles: EditorialOrderTile[];
  initialLayout: EditorialLayoutInitial;
};

function applyOrder(
  pool: EditorialOrderTile[],
  order: string[]
): EditorialOrderTile[] {
  if (!order.length) return pool;
  const map = new Map(pool.map((t) => [t.id, t]));
  const out: EditorialOrderTile[] = [];
  const used = new Set<string>();
  for (const id of order) {
    const tile = map.get(id);
    if (!tile || used.has(id)) continue;
    out.push(tile);
    used.add(id);
  }
  return out;
}

const DEFAULT_LAYOUT: EditorialLayoutInitial = {
  columns: 3,
  gap: "md",
  tileSize: "md",
  pattern: "uniform",
};

function ChoiceRow<T extends string>({
  label,
  hint,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T;
  options: { value: T; label: string }[];
  disabled?: boolean;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="min-w-[7.5rem] text-sm font-medium text-charcoal">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              value === opt.value
                ? "border-gold bg-gold/10 text-charcoal"
                : "border-beige-dark text-muted hover:bg-ivory"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  );
}

/**
 * Admin rearrange / add / delete / layout for the post-hero homepage grid.
 */
export function HomepageEditorialOrderManager({
  availableTiles,
  initialOrder,
  initialManual,
  autoTiles,
  initialLayout,
}: Props) {
  const { t } = useLocale();
  const s = t.admin.settingsFields;

  const pool = useMemo(() => {
    const map = new Map<string, EditorialOrderTile>();
    for (const tile of [...autoTiles, ...availableTiles]) {
      map.set(tile.id, tile);
    }
    return [...map.values()];
  }, [availableTiles, autoTiles]);

  const [tiles, setTiles] = useState(() =>
    initialManual ? applyOrder(pool, initialOrder) : autoTiles
  );
  const [columns, setColumns] = useState<HomepageEditorialColumns>(
    initialLayout.columns === 2 || initialLayout.columns === 4
      ? initialLayout.columns
      : 3
  );
  const [gap, setGap] = useState<HomepageEditorialGap>(initialLayout.gap);
  const [tileSize, setTileSize] = useState<HomepageEditorialTileSize>(
    initialLayout.tileSize
  );
  const [pattern, setPattern] = useState<HomepageEditorialPattern>(
    initialLayout.pattern
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addQuery, setAddQuery] = useState("");

  const selectedIds = useMemo(() => new Set(tiles.map((t) => t.id)), [tiles]);
  const addCandidates = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    return pool.filter((tile) => {
      if (selectedIds.has(tile.id)) return false;
      if (!q) return true;
      return (
        tile.title.toLowerCase().includes(q) ||
        tile.id.toLowerCase().includes(q) ||
        tile.kind.includes(q)
      );
    });
  }, [pool, selectedIds, addQuery]);

  const touchLayout = () => {
    setMessage("");
    setError("");
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= tiles.length) return;
    setTiles((prev) => {
      const copy = [...prev];
      const tmp = copy[index]!;
      copy[index] = copy[next]!;
      copy[next] = tmp;
      return copy;
    });
    touchLayout();
  };

  const removeTile = (id: string) => {
    setTiles((prev) => prev.filter((t) => t.id !== id));
    touchLayout();
  };

  const addTile = (tile: EditorialOrderTile) => {
    setTiles((prev) => {
      if (prev.some((t) => t.id === tile.id)) return prev;
      return [...prev, tile];
    });
    touchLayout();
  };

  const onDragStart = (index: number) => setDragIndex(index);
  const onDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setTiles((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(dragIndex, 1);
      if (!item) return prev;
      copy.splice(index, 0, item);
      return copy;
    });
    setDragIndex(index);
  };
  const onDragEnd = () => setDragIndex(null);

  const persist = async (
    nextOrder: string[],
    layout: EditorialLayoutInitial,
    manual: boolean
  ) => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/store-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            homepage: {
              editorial_order: nextOrder,
              editorial_columns: layout.columns,
              editorial_gap: layout.gap,
              editorial_tile_size: layout.tileSize,
              editorial_pattern: layout.pattern,
              editorial_manual: manual,
            },
          },
          sections: ["homepage"],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || s.editorialOrderSaveError);
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : s.editorialOrderSaveError);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const currentLayout = (): EditorialLayoutInitial => ({
    columns,
    gap,
    tileSize,
    pattern,
  });

  const save = async () => {
    const ok = await persist(
      tiles.map((tile) => tile.id),
      currentLayout(),
      true
    );
    if (ok) setMessage(s.editorialOrderSaved);
  };

  const resetNatural = async () => {
    setTiles(autoTiles);
    setColumns(DEFAULT_LAYOUT.columns);
    setGap(DEFAULT_LAYOUT.gap);
    setTileSize(DEFAULT_LAYOUT.tileSize);
    setPattern(DEFAULT_LAYOUT.pattern);
    const ok = await persist([], DEFAULT_LAYOUT, false);
    if (ok) setMessage(s.editorialOrderReset);
  };

  return (
    <div className="rounded-2xl border border-beige-dark bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">
            {s.editorialOrderTitle}
          </h2>
          <p className="mt-1 text-sm text-muted">{s.editorialOrderDesc}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => setAddOpen((v) => !v)}
          >
            <Plus className="me-1 h-3.5 w-3.5" />
            {s.editorialOrderAdd}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => void resetNatural()}
          >
            {s.editorialOrderResetBtn}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? s.editorialOrderSaving : s.editorialOrderSave}
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-3 rounded-xl border border-beige-dark/70 bg-ivory/40 p-4">
        <ChoiceRow
          label={s.editorialGridColumns}
          hint={s.editorialGridColumnsHint}
          value={String(columns)}
          disabled={saving}
          options={[
            { value: "2", label: "2" },
            { value: "3", label: "3" },
            { value: "4", label: "4" },
          ]}
          onChange={(v) => {
            setColumns(Number(v) as HomepageEditorialColumns);
            touchLayout();
          }}
        />
        <ChoiceRow
          label={s.editorialGridGap}
          hint={s.editorialGridGapHint}
          value={gap}
          disabled={saving}
          options={[
            { value: "none", label: s.editorialGapNone },
            { value: "sm", label: s.editorialGapSm },
            { value: "md", label: s.editorialGapMd },
            { value: "lg", label: s.editorialGapLg },
            { value: "xl", label: s.editorialGapXl },
          ]}
          onChange={(v) => {
            setGap(v as HomepageEditorialGap);
            touchLayout();
          }}
        />
        <ChoiceRow
          label={s.editorialTileSize}
          hint={s.editorialTileSizeHint}
          value={tileSize}
          disabled={saving}
          options={[
            { value: "sm", label: s.editorialSizeSm },
            { value: "md", label: s.editorialSizeMd },
            { value: "lg", label: s.editorialSizeLg },
          ]}
          onChange={(v) => {
            setTileSize(v as HomepageEditorialTileSize);
            touchLayout();
          }}
        />
        <ChoiceRow
          label={s.editorialPattern}
          hint={s.editorialPatternHint}
          value={pattern}
          disabled={saving}
          options={[
            { value: "uniform", label: s.editorialPatternUniform },
            { value: "editorial", label: s.editorialPatternEditorial },
            { value: "spotlight", label: s.editorialPatternSpotlight },
          ]}
          onChange={(v) => {
            setPattern(v as HomepageEditorialPattern);
            touchLayout();
          }}
        />
      </div>

      {message ? (
        <p className="mt-3 text-sm text-emerald-700">{message}</p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {addOpen ? (
        <div className="mt-4 rounded-xl border border-beige-dark/80 bg-ivory/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-charcoal">
              {s.editorialOrderAddTitle}
            </p>
            <button
              type="button"
              className="text-xs text-muted hover:text-charcoal"
              onClick={() => setAddOpen(false)}
            >
              {s.editorialOrderAddClose}
            </button>
          </div>
          <input
            type="search"
            value={addQuery}
            onChange={(e) => setAddQuery(e.target.value)}
            placeholder={s.editorialOrderAddSearch}
            className="mt-3 w-full rounded-lg border border-beige-dark bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-gold"
          />
          <ul className="mt-3 max-h-56 space-y-1.5 overflow-y-auto">
            {addCandidates.length === 0 ? (
              <li className="px-1 py-2 text-sm text-muted">
                {s.editorialOrderAddEmpty}
              </li>
            ) : (
              addCandidates.map((tile) => (
                <li key={tile.id}>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => addTile(tile)}
                    className="flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-1.5 text-start hover:border-beige-dark hover:bg-white"
                  >
                    <div className="relative h-10 w-8 shrink-0 overflow-hidden rounded bg-charcoal/10">
                      {tile.imageUrl ? (
                        <Image
                          src={tile.imageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                      ) : null}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm text-charcoal">
                      {tile.title}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted">
                      {tile.kind === "category"
                        ? s.editorialOrderKindCategory
                        : s.editorialOrderKindProduct}
                    </span>
                    <Plus className="h-3.5 w-3.5 shrink-0 text-gold" />
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      {tiles.length === 0 ? (
        <p className="mt-5 text-sm text-muted">{s.editorialOrderEmpty}</p>
      ) : (
        <ul className="mt-5 space-y-2">
          {tiles.map((tile, index) => (
            <li
              key={tile.id}
              draggable
              onDragStart={() => onDragStart(index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDragEnd={onDragEnd}
              className={`flex items-center gap-3 rounded-xl border border-beige-dark/80 bg-ivory/40 px-3 py-2 ${
                dragIndex === index ? "opacity-70 ring-1 ring-gold/40" : ""
              }`}
            >
              <span
                className="cursor-grab text-muted active:cursor-grabbing"
                aria-hidden
              >
                <GripVertical className="h-4 w-4" />
              </span>
              <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-md bg-charcoal/10">
                {tile.imageUrl ? (
                  <Image
                    src={tile.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="44px"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-charcoal">
                  {tile.title}
                </p>
                <p className="text-[11px] text-muted">
                  {tile.kind === "category"
                    ? s.editorialOrderKindCategory
                    : s.editorialOrderKindProduct}
                  <span className="mx-1.5 text-beige-dark">·</span>
                  <span className="font-mono text-[10px]">{tile.id}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    className="rounded border border-beige-dark p-1 text-charcoal hover:bg-white disabled:opacity-30"
                    disabled={index === 0 || saving}
                    onClick={() => move(index, -1)}
                    aria-label={s.editorialOrderMoveUp}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded border border-beige-dark p-1 text-charcoal hover:bg-white disabled:opacity-30"
                    disabled={index === tiles.length - 1 || saving}
                    onClick={() => move(index, 1)}
                    aria-label={s.editorialOrderMoveDown}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  className="ms-1 rounded border border-beige-dark p-2 text-red-600 hover:bg-white disabled:opacity-30"
                  disabled={saving}
                  onClick={() => removeTile(tile.id)}
                  aria-label={s.editorialOrderDelete}
                  title={s.editorialOrderDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
