"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/Button";
import {
  ACCESSORIES_EDITORIAL_PRESET_SCALE,
  ACCESSORIES_EDITORIAL_SCALE_MAX,
  ACCESSORIES_EDITORIAL_SCALE_MIN,
  ACCESSORIES_EDITORIAL_SHAPES,
  ACCESSORIES_EDITORIAL_SIZES,
  accessoriesEditorialFrameLayout,
  accessoriesEditorialSizeFromScale,
  clampAccessoriesEditorialScale,
  DEFAULT_ACCESSORIES_EDITORIAL_FRAME,
  normalizeAccessoriesEditorialFrame,
} from "@/lib/home/accessories-editorial-frame";
import { cn } from "@/lib/utils";
import type {
  AccessoriesEditorialFrameSettings,
  AccessoriesEditorialShape,
  AccessoriesEditorialSize,
} from "@/types/store";

type HomeAccessoriesEditorialCmsFormProps = {
  initialFrame: AccessoriesEditorialFrameSettings;
  previewImageUrl?: string | null;
};

const SHAPE_GLYPH: Record<AccessoriesEditorialShape, string> = {
  canvas: "rounded-sm",
  gallery: "rounded-xl",
  atelier: "rounded-[1.15rem] shadow-sm",
  chapel: "",
  cinema: "rounded-sm aspect-[2.35/1] !h-auto w-[78%]",
  portrait: "rounded-2xl aspect-[4/5] !h-auto w-[38%]",
  oval: "rounded-[50%] aspect-[16/10] !h-auto w-[78%]",
};

export function HomeAccessoriesEditorialCmsForm({
  initialFrame,
  previewImageUrl,
}: HomeAccessoriesEditorialCmsFormProps) {
  const { t } = useLocale();
  const cu = t.admin.cmsUi;
  const copy = cu.accessoriesFrame;
  const [frame, setFrame] = useState<AccessoriesEditorialFrameSettings>(() =>
    normalizeAccessoriesEditorialFrame(initialFrame)
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const layout = useMemo(
    () => accessoriesEditorialFrameLayout(frame, "preview"),
    [frame]
  );

  const patch = (partial: Partial<AccessoriesEditorialFrameSettings>) => {
    setFrame((prev) => ({ ...prev, ...partial }));
    setMessage("");
    setError("");
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
            homepage: { accessories_editorial_frame: frame },
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
                      "h-10 w-[72%] bg-charcoal/80",
                      SHAPE_GLYPH[shape]
                    )}
                    style={
                      shape === "chapel"
                        ? {
                            borderRadius:
                              "50% 50% 0.45rem 0.45rem / 28% 28% 0.45rem 0.45rem",
                          }
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
