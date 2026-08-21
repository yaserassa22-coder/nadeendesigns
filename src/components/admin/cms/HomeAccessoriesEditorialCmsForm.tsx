"use client";

import Image from "next/image";
import {
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/Button";
import {
  ACCESSORIES_EDITORIAL_PRESET_SCALE,
  ACCESSORIES_EDITORIAL_SCALE_MAX,
  ACCESSORIES_EDITORIAL_SCALE_MIN,
  ACCESSORIES_EDITORIAL_LENGTH_MAX,
  ACCESSORIES_EDITORIAL_LENGTH_MIN,
  ACCESSORIES_EDITORIAL_SHAPES,
  ACCESSORIES_EDITORIAL_SIZES,
  accessoriesEditorialFrameLayout,
  accessoriesEditorialSizeFromScale,
  clampAccessoriesEditorialScale,
  clampAccessoriesEditorialLength,
  DEFAULT_ACCESSORIES_EDITORIAL_FRAME,
  normalizeAccessoriesEditorialFrame,
} from "@/lib/home/accessories-editorial-frame";
import { cn } from "@/lib/utils";
import type {
  AccessoriesEditorialFrameSettings,
  AccessoriesEditorialGridColumns,
  AccessoriesEditorialGridStyle,
  AccessoriesEditorialShape,
  AccessoriesEditorialSize,
} from "@/types/store";

type HomeAccessoriesEditorialCmsFormProps = {
  initialFrame: AccessoriesEditorialFrameSettings;
  initialGridEnabled: boolean;
  initialGridColumns: AccessoriesEditorialGridColumns;
  initialGridScroll: boolean;
  initialGridStyle: AccessoriesEditorialGridStyle;
  previewImageUrl?: string | null;
};

const SHAPE_GLYPH: Record<AccessoriesEditorialShape, string> = {
  canvas: "rounded-sm",
  gallery: "rounded-xl",
  atelier: "rounded-[1.15rem] shadow-sm",
  chapel: "",
  cinema: "rounded-sm aspect-[2.35/1] !h-auto w-[78%]",
  portrait: "rounded-2xl w-[38%]",
  oval: "rounded-[50%] w-[78%]",
  arch: "rounded-t-[50%] rounded-b-sm w-[72%]",
  diamond: "w-10 rotate-45 rounded-sm",
  ticket: "rounded-xl w-[78%]",
};

function scrollPreviewWithWheel(event: ReactWheelEvent<HTMLDivElement>) {
  const element = event.currentTarget;
  if (element.scrollWidth <= element.clientWidth) return;
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
  event.preventDefault();
  element.scrollLeft += event.deltaY;
}

export function HomeAccessoriesEditorialCmsForm({
  initialFrame,
  initialGridEnabled,
  initialGridColumns,
  initialGridScroll,
  initialGridStyle,
  previewImageUrl,
}: HomeAccessoriesEditorialCmsFormProps) {
  const { t } = useLocale();
  const cu = t.admin.cmsUi;
  const copy = cu.accessoriesFrame;
  const [frame, setFrame] = useState<AccessoriesEditorialFrameSettings>(() =>
    normalizeAccessoriesEditorialFrame(initialFrame)
  );
  const [gridEnabled, setGridEnabled] = useState(initialGridEnabled);
  const [gridColumns, setGridColumns] =
    useState<AccessoriesEditorialGridColumns>(initialGridColumns);
  const [gridScroll, setGridScroll] = useState(initialGridScroll);
  const [gridStyle, setGridStyle] =
    useState<AccessoriesEditorialGridStyle>(initialGridStyle);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const previewDragRef = useRef<{ x: number; scrollLeft: number } | null>(null);

  const layout = useMemo(
    () => accessoriesEditorialFrameLayout(frame, "preview"),
    [frame]
  );

  const patch = (partial: Partial<AccessoriesEditorialFrameSettings>) => {
    setFrame((prev) => ({ ...prev, ...partial }));
    setMessage("");
    setError("");
  };

  const onPreviewPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!gridScroll || event.pointerType !== "mouse" || event.button !== 0) return;
    previewDragRef.current = {
      x: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPreviewPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!previewDragRef.current) return;
    const delta = event.clientX - previewDragRef.current.x;
    if (Math.abs(delta) <= 4) return;
    event.preventDefault();
    event.currentTarget.scrollLeft = previewDragRef.current.scrollLeft - delta;
  };
  const stopPreviewDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (previewDragRef.current && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    previewDragRef.current = null;
  };

  const save = async () => {
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
              accessories_editorial_frame: frame,
              accessories_editorial_grid_enabled: gridEnabled,
              accessories_editorial_grid_columns: gridColumns,
              accessories_editorial_grid_scroll: gridScroll,
              accessories_editorial_grid_style: gridStyle,
            },
          },
          sections: ["homepage"],
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || cu.saveFailed);
      }
      setMessage(cu.saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : cu.genericError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-beige-dark bg-white p-6 md:p-8">
      <div>
        <h2 className="text-lg font-semibold text-charcoal">{copy.title}</h2>
        <p className="mt-1 text-sm text-muted">{copy.desc}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-beige-dark/70 bg-[#fafafa] p-4 md:p-6">
        <p className="mb-3 text-[10px] font-medium tracking-[0.22em] text-muted uppercase">
          {copy.previewLabel}
        </p>
        {gridEnabled ? (
          <div
            className="mx-auto rounded-xl border border-beige-dark/70 bg-white p-3 transition-[width] duration-200 md:p-4"
            style={{
              width: `${Math.min(100, frame.horizontalLength)}%`,
            }}
          >
            <div
              className={cn(
                gridScroll
                  ? "nd-hide-scrollbar flex cursor-grab gap-2 overflow-x-auto pb-2 active:cursor-grabbing"
                  : "grid grid-cols-2 gap-2",
                !gridScroll && gridColumns === 2
                  ? "sm:grid-cols-2"
                  : !gridScroll && gridColumns === 3
                    ? "sm:grid-cols-3"
                    : !gridScroll && gridColumns === 4
                      ? "sm:grid-cols-4"
                      : !gridScroll
                        ? "sm:grid-cols-3 lg:grid-cols-6"
                        : undefined
              )}
              onWheel={gridScroll ? scrollPreviewWithWheel : undefined}
              onPointerDown={gridScroll ? onPreviewPointerDown : undefined}
              onPointerMove={gridScroll ? onPreviewPointerMove : undefined}
              onPointerUp={gridScroll ? stopPreviewDrag : undefined}
              onPointerCancel={gridScroll ? stopPreviewDrag : undefined}
            >
              {Array.from({ length: 6 }, (_, index) => (
                <div
                  key={index}
                  className={cn(
                    "min-w-0",
                    gridScroll && "w-28 shrink-0",
                    gridStyle === "cards" &&
                      "rounded-sm border border-beige-dark/70 bg-ivory/30 p-1.5",
                    gridStyle === "editorial" && "rounded-sm bg-ivory/35 p-1"
                  )}
                >
                  <div
                    className="relative overflow-hidden rounded-sm bg-beige"
                    style={{
                      aspectRatio: `${4}/${Math.max(3, 5 * (frame.scale / 100))}`,
                    }}
                  >
                    {previewImageUrl ? (
                      <Image
                        src={previewImageUrl}
                        alt=""
                        fill
                        sizes="160px"
                        className="object-cover object-center"
                      />
                    ) : (
                      <div
                        aria-hidden
                        className="absolute inset-0 bg-[linear-gradient(135deg,#e7dfd3_0%,#c9a96e_48%,#2c2419_100%)]"
                      />
                    )}
                    {gridStyle === "editorial" ? (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/70 to-transparent px-1 pb-1 pt-5">
                        <span className="block truncate text-[8px] text-ivory">
                          {copy.previewTitle}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  {gridStyle !== "editorial" ? (
                    <span className="mt-1 block truncate px-0.5 text-[8px] text-charcoal">
                      {copy.previewTitle}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={layout.shellClassName} style={layout.shellStyle}>
            <div className={layout.stageClassName} style={layout.stageStyle}>
              {previewImageUrl ? (
                <Image
                  src={previewImageUrl}
                  alt=""
                  fill
                  sizes="640px"
                  className="object-cover object-center"
                />
              ) : (
                <div
                  aria-hidden
                  className="absolute inset-0 bg-[linear-gradient(135deg,#e7dfd3_0%,#c9a96e_48%,#2c2419_100%)]"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/55 via-charcoal/10 to-transparent" />
              <div className={layout.textClassName}>
                <p className="text-[8px] font-medium tracking-[0.28em] text-ivory/80 uppercase">
                  {copy.previewEyebrow}
                </p>
                <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.08em] text-ivory uppercase md:text-base">
                  {copy.previewTitle}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4 md:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-charcoal">
              {copy.gridEnabledLabel}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {copy.gridEnabledHint}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={gridEnabled}
            onClick={() => {
              setGridEnabled((enabled) => !enabled);
              setMessage("");
              setError("");
            }}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
              gridEnabled ? "bg-gold" : "bg-charcoal/25"
            )}
          >
            <span
              className={cn(
                "absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform",
                gridEnabled ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>

        {gridEnabled ? (
          <div className="mt-5 grid gap-4 border-t border-gold/20 pt-4 md:grid-cols-[1fr_2fr]">
            <div>
              <p className="text-sm font-medium text-charcoal">
                {copy.gridColumnsLabel}
              </p>
              <div className="mt-2 flex gap-2">
                {([2, 3, 4, 6] as const).map((columns) => (
                  <button
                    key={columns}
                    type="button"
                    onClick={() => setGridColumns(columns)}
                    className={cn(
                      "flex h-10 flex-1 items-center justify-center rounded-lg border text-sm transition",
                      gridColumns === columns
                        ? "border-gold bg-white text-gold"
                        : "border-beige-dark bg-white/60 text-charcoal hover:border-gold/50"
                    )}
                  >
                    {columns}
                  </button>
                ))}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={gridScroll}
                onClick={() => setGridScroll((enabled) => !enabled)}
                className={cn(
                  "mt-4 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-start transition",
                  gridScroll
                    ? "border-gold bg-white"
                    : "border-beige-dark bg-white/60 hover:border-gold/50"
                )}
              >
                <span>
                  <span className="block text-sm font-medium text-charcoal">
                    {copy.gridScrollLabel}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted">
                    {copy.gridScrollHint}
                  </span>
                </span>
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    gridScroll ? "bg-gold" : "bg-charcoal/20"
                  )}
                />
              </button>
            </div>
            <div>
              <p className="text-sm font-medium text-charcoal">
                {copy.gridStyleLabel}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(["editorial", "cards", "minimal"] as const).map((style) => {
                  const meta = copy.gridStyles[style];
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setGridStyle(style)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-start transition",
                        gridStyle === style
                          ? "border-gold bg-white"
                          : "border-beige-dark bg-white/60 hover:border-gold/50"
                      )}
                    >
                      <span className="block text-sm font-medium text-charcoal">
                        {meta.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                        {meta.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <p className="text-sm font-medium text-charcoal">{copy.sizeLabel}</p>
        <p className="mt-0.5 text-xs text-muted">{copy.sizeHint}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {ACCESSORIES_EDITORIAL_SIZES.map((size) => {
            const selected = frame.size === size;
            const meta = copy.sizes[size];
            return (
              <button
                key={size}
                type="button"
                onClick={() =>
                  patch({
                    size,
                    scale: ACCESSORIES_EDITORIAL_PRESET_SCALE[size],
                  })
                }
                className={cn(
                  "rounded-2xl border px-4 py-3 text-start transition",
                  selected
                    ? "border-gold bg-gold/10"
                    : "border-beige-dark bg-white hover:bg-ivory"
                )}
              >
                <span className="flex h-10 items-end gap-1">
                  <SizeBars size={size} selected={selected} />
                </span>
                <span className="mt-2 block text-sm font-medium text-charcoal">
                  {meta.label}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {meta.hint}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl border border-beige-dark/70 bg-ivory/30 px-4 py-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-charcoal">
                {copy.scaleLabel}
              </p>
              <p className="mt-0.5 text-xs text-muted">{copy.scaleHint}</p>
            </div>
            <input
              type="number"
              min={ACCESSORIES_EDITORIAL_SCALE_MIN}
              max={ACCESSORIES_EDITORIAL_SCALE_MAX}
              step={1}
              value={frame.scale}
              onChange={(e) => {
                const scale = clampAccessoriesEditorialScale(e.target.value);
                patch({
                  scale,
                  size: accessoriesEditorialSizeFromScale(scale),
                });
              }}
              className="w-16 rounded-lg border border-beige-dark bg-white px-2 py-1.5 text-center font-mono text-sm text-charcoal focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
              aria-label={copy.scaleLabel}
            />
          </div>
          <input
            type="range"
            min={ACCESSORIES_EDITORIAL_SCALE_MIN}
            max={ACCESSORIES_EDITORIAL_SCALE_MAX}
            step={1}
            value={frame.scale}
            onChange={(e) => {
              const scale = clampAccessoriesEditorialScale(e.target.value);
              patch({
                scale,
                size: accessoriesEditorialSizeFromScale(scale),
              });
            }}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-beige-dark accent-[#c9a96e]"
            aria-valuemin={ACCESSORIES_EDITORIAL_SCALE_MIN}
            aria-valuemax={ACCESSORIES_EDITORIAL_SCALE_MAX}
            aria-valuenow={frame.scale}
            aria-label={copy.scaleLabel}
          />
          <div className="mt-1.5 flex justify-between font-mono text-[10px] tracking-wide text-muted">
            <span>{ACCESSORIES_EDITORIAL_SCALE_MIN}</span>
            <span>100</span>
            <span>{ACCESSORIES_EDITORIAL_SCALE_MAX}</span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-beige-dark/70 bg-ivory/30 px-4 py-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-charcoal">
                {copy.lengthLabel}
              </p>
              <p className="mt-0.5 text-xs text-muted">{copy.lengthHint}</p>
            </div>
            <input
              type="number"
              min={ACCESSORIES_EDITORIAL_LENGTH_MIN}
              max={ACCESSORIES_EDITORIAL_LENGTH_MAX}
              step={1}
              value={frame.horizontalLength}
              onChange={(e) =>
                patch({
                  horizontalLength: clampAccessoriesEditorialLength(e.target.value),
                })
              }
              className="w-16 rounded-lg border border-beige-dark bg-white px-2 py-1.5 text-center font-mono text-sm text-charcoal focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
              aria-label={copy.lengthLabel}
            />
          </div>
          <input
            type="range"
            min={ACCESSORIES_EDITORIAL_LENGTH_MIN}
            max={ACCESSORIES_EDITORIAL_LENGTH_MAX}
            step={1}
            value={frame.horizontalLength}
            onChange={(e) =>
              patch({
                horizontalLength: clampAccessoriesEditorialLength(e.target.value),
              })
            }
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-beige-dark accent-[#c9a96e]"
            aria-valuemin={ACCESSORIES_EDITORIAL_LENGTH_MIN}
            aria-valuemax={ACCESSORIES_EDITORIAL_LENGTH_MAX}
            aria-valuenow={frame.horizontalLength}
            aria-label={copy.lengthLabel}
          />
          <div className="mt-1.5 flex justify-between font-mono text-[10px] tracking-wide text-muted">
            <span>{ACCESSORIES_EDITORIAL_LENGTH_MIN}</span>
            <span>100</span>
            <span>{ACCESSORIES_EDITORIAL_LENGTH_MAX}</span>
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-charcoal">{copy.shapeLabel}</p>
        <p className="mt-0.5 text-xs text-muted">{copy.shapeHint}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {ACCESSORIES_EDITORIAL_SHAPES.map((shape) => {
            const selected = frame.shape === shape;
            const meta = copy.shapes[shape];
            return (
              <button
                key={shape}
                type="button"
                onClick={() => patch({ shape })}
                className={cn(
                  "flex flex-col items-center rounded-2xl border px-3 py-3 text-center transition",
                  selected
                    ? "border-gold bg-gold/10"
                    : "border-beige-dark bg-white hover:bg-ivory"
                )}
              >
                <span className="flex h-16 w-full items-center justify-center">
                  <span
                    className={cn(
                      "max-h-10 max-w-[80%] h-10 w-[72%] shrink-0 bg-charcoal/80",
                      SHAPE_GLYPH[shape]
                    )}
                    style={
                      shape === "chapel"
                        ? {
                            borderRadius:
                              "50% 50% 0.45rem 0.45rem / 28% 28% 0.45rem 0.45rem",
                          }
                        : shape === "arch"
                          ? {
                              borderRadius:
                                "50% 50% 0.45rem 0.45rem / 42% 42% 0.45rem 0.45rem",
                            }
                          : shape === "diamond"
                            ? { clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }
                            : undefined
                    }
                  />
                </span>
                <span className="text-sm font-medium text-charcoal">
                  {meta.label}
                </span>
                <span className="mt-0.5 text-[11px] leading-snug text-muted">
                  {meta.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => void save()} loading={saving}>
          {saving ? cu.saving : cu.saveContent}
        </Button>
        <button
          type="button"
          className="text-sm text-muted underline-offset-4 hover:text-charcoal hover:underline"
          onClick={() => {
            setFrame(DEFAULT_ACCESSORIES_EDITORIAL_FRAME);
            setGridEnabled(false);
            setGridColumns(3);
            setGridScroll(false);
            setGridStyle("editorial");
            setMessage("");
            setError("");
          }}
        >
          {copy.reset}
        </button>
        {message ? (
          <p className="text-sm text-gold">{message}</p>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}

function SizeBars({
  size,
  selected,
}: {
  size: AccessoriesEditorialSize;
  selected: boolean;
}) {
  const bars =
    size === "intimate" ? [40, 55, 40] : size === "grand" ? [70, 100, 70] : [52, 78, 52];
  return (
    <>
      {bars.map((h, i) => (
        <span
          key={i}
          className={cn(
            "w-2.5 rounded-sm",
            selected ? "bg-gold" : "bg-charcoal/35"
          )}
          style={{ height: `${h}%` }}
        />
      ))}
    </>
  );
}
