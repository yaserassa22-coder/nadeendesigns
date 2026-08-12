"use client";

import Image from "next/image";
import { useState } from "react";
import type { SiteSettings } from "@/types";
import { SITE_NAME } from "@/lib/constants";
import {
  HERO_SLIDE_MAX,
  type HeroSlide,
  normalizeHeroSlides,
  normalizeHeroSlidesForCms,
  resolveHeroSlides,
  syncLegacyHeroImageFields,
} from "@/lib/cms/hero-slides";
import {
  HERO_SLIDE_DURATION_MAX_MS,
  HERO_SLIDE_DURATION_MIN_MS,
  HERO_SLIDE_TRANSITION_MAX_MS,
  HERO_SLIDE_TRANSITION_MIN_MS,
  resolveSlideDurationMs,
  resolveSlideTransitionMs,
} from "@/lib/cms/hero-slide-timing";
import { splitTitleEmphasis } from "@/lib/cms/locale-text";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { VideoUpload } from "@/components/admin/VideoUpload";
import { VideoDisplayControls } from "@/components/admin/cms/VideoDisplayControls";
import { CmsLivePreview } from "@/components/admin/cms/CmsLivePreview";
import { AutoLoopVideo } from "@/components/media/AutoLoopVideo";
import { cn } from "@/lib/utils";

type HeroCmsFields = Pick<
  SiteSettings,
  | "hero_title_ar"
  | "hero_title_he"
  | "hero_title_en"
  | "hero_title_emphasis_ar"
  | "hero_title_emphasis_he"
  | "hero_title_emphasis_en"
  | "hero_subtitle_ar"
  | "hero_subtitle_he"
  | "hero_subtitle_en"
  | "hero_image_url"
  | "hero_image_urls"
  | "hero_slides"
  | "hero_image_alt_ar"
  | "hero_image_alt_he"
  | "hero_image_alt_en"
  | "hero_cta_primary_label_ar"
  | "hero_cta_primary_label_he"
  | "hero_cta_primary_label_en"
  | "hero_cta_primary_href"
  | "hero_cta_secondary_label_ar"
  | "hero_cta_secondary_label_he"
  | "hero_cta_secondary_label_en"
  | "hero_cta_secondary_href"
>;

interface HomeHeroCmsFormProps {
  initialSettings: SiteSettings;
}

function fromSettings(s: SiteSettings): HeroCmsFields {
  const slides = normalizeHeroSlidesForCms(resolveHeroSlides(s));
  const legacy = syncLegacyHeroImageFields(
    slides.filter((slide) => slide.url.trim().length > 0)
  );
  return {
    hero_title_ar: s.hero_title_ar ?? "",
    hero_title_he: s.hero_title_he ?? "",
    hero_title_en: s.hero_title_en ?? "",
    hero_title_emphasis_ar: s.hero_title_emphasis_ar ?? "",
    hero_title_emphasis_he: s.hero_title_emphasis_he ?? "",
    hero_title_emphasis_en: s.hero_title_emphasis_en ?? "",
    hero_subtitle_ar: s.hero_subtitle_ar ?? "",
    hero_subtitle_he: s.hero_subtitle_he ?? "",
    hero_subtitle_en: s.hero_subtitle_en ?? "",
    hero_image_url: legacy.hero_image_url,
    hero_image_urls: legacy.hero_image_urls,
    hero_slides: slides,
    hero_image_alt_ar: s.hero_image_alt_ar ?? "",
    hero_image_alt_he: s.hero_image_alt_he ?? "",
    hero_image_alt_en: s.hero_image_alt_en ?? "",
    hero_cta_primary_label_ar: s.hero_cta_primary_label_ar ?? "",
    hero_cta_primary_label_he: s.hero_cta_primary_label_he ?? "",
    hero_cta_primary_label_en: s.hero_cta_primary_label_en ?? "",
    hero_cta_primary_href: s.hero_cta_primary_href ?? "",
    hero_cta_secondary_label_ar: s.hero_cta_secondary_label_ar ?? "",
    hero_cta_secondary_label_he: s.hero_cta_secondary_label_he ?? "",
    hero_cta_secondary_label_en: s.hero_cta_secondary_label_en ?? "",
    hero_cta_secondary_href: s.hero_cta_secondary_href ?? "",
  };
}

function withSyncedSlides(
  form: HeroCmsFields,
  slides: HeroSlide[]
): HeroCmsFields {
  const normalized = normalizeHeroSlidesForCms(slides);
  const ready = normalized.filter((slide) => slide.url.trim().length > 0);
  const legacy = syncLegacyHeroImageFields(
    ready.length > 0 ? ready : [{ type: "image", url: "/hero.webp" }]
  );
  return {
    ...form,
    hero_slides: normalized,
    hero_image_url: legacy.hero_image_url,
    hero_image_urls: legacy.hero_image_urls,
  };
}

export function HomeHeroCmsForm({ initialSettings }: HomeHeroCmsFormProps) {
  const { t } = useLocale();
  const cu = t.admin.cmsUi;
  const [form, setForm] = useState<HeroCmsFields>(fromSettings(initialSettings));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const slides = form.hero_slides ?? [];

  const update = <K extends keyof HeroCmsFields>(
    key: K,
    value: HeroCmsFields[K]
  ) => {
    setForm((s) => ({ ...s, [key]: value }));
    setMessage("");
  };

  const setSlides = (next: HeroSlide[] | ((current: HeroSlide[]) => HeroSlide[])) => {
    setForm((s) => {
      const current = s.hero_slides ?? [];
      const resolved = typeof next === "function" ? next(current) : next;
      return withSyncedSlides(s, resolved);
    });
    setMessage("");
  };

  const updateSlide = (index: number, patch: Partial<HeroSlide>) => {
    setSlides((current) =>
      current.map((slide, i) => (i === index ? { ...slide, ...patch } : slide))
    );
  };

  const addSlide = (type: HeroSlide["type"]) => {
    setSlides((current) => {
      if (current.length >= HERO_SLIDE_MAX) return current;
      return [...current, { type, url: "" }];
    });
  };

  const duplicateSlide = (index: number) => {
    setSlides((current) => {
      if (current.length >= HERO_SLIDE_MAX) return current;
      const source = current[index];
      if (!source) return current;
      const clone: HeroSlide = {
        type: source.type,
        url: source.url,
        ...(source.poster_url?.trim()
          ? { poster_url: source.poster_url.trim() }
          : {}),
        ...(source.video_display ? { video_display: { ...source.video_display } } : {}),
        ...(source.duration_ms !== undefined
          ? { duration_ms: source.duration_ms }
          : {}),
        ...(source.transition_ms !== undefined
          ? { transition_ms: source.transition_ms }
          : {}),
      };
      const next = [...current];
      next.splice(index + 1, 0, clone);
      return next.slice(0, HERO_SLIDE_MAX);
    });
  };

  const removeSlide = (index: number) => {
    if (index === 0) return;
    setSlides((current) => current.filter((_, i) => i !== index));
  };

  const save = async () => {
    if (!form.hero_title_ar.trim()) {
      setError(cu.heroTitleRequired);
      return;
    }
    const ready = normalizeHeroSlides(
      slides.filter((s) => s.url.trim().length > 0)
    );
    if (ready.length === 0) {
      setError(cu.heroMediaRequired);
      return;
    }
    const payload = withSyncedSlides(form, ready);
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? cu.saveFailed);
      if (data.settings) {
        setForm(fromSettings(data.settings as SiteSettings));
      }
      setMessage(cu.saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : cu.genericError);
    } finally {
      setSaving(false);
    }
  };

  const split = splitTitleEmphasis(
    form.hero_title_ar,
    form.hero_title_emphasis_ar
  );
  const previewSlide = resolveHeroSlides(form)[0];
  const previewImage =
    previewSlide?.type === "image"
      ? previewSlide.url
      : previewSlide?.poster_url?.trim() || "/hero.webp";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
      <div className="space-y-6 rounded-2xl border border-beige-dark bg-white p-6 md:p-8">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">
            {cu.heroSectionTitle}
          </h2>
          <p className="mt-1 text-sm text-muted">{cu.heroSectionDesc}</p>
        </div>

        <div className="space-y-4 rounded-xl border border-beige-dark/70 bg-beige/20 p-4">
          <p className="text-sm font-semibold text-charcoal">عربي</p>
        <Input
          label="العنوان *"
          value={form.hero_title_ar}
          onChange={(e) => update("hero_title_ar", e.target.value)}
          error={!form.hero_title_ar.trim() && error ? error : undefined}
        />
        <Input
            label="الكلمة المميزة"
          value={form.hero_title_emphasis_ar}
          onChange={(e) => update("hero_title_emphasis_ar", e.target.value)}
        />
        <Textarea
          label="الوصف"
            rows={3}
          value={form.hero_subtitle_ar}
          onChange={(e) => update("hero_subtitle_ar", e.target.value)}
        />
          <Input
            label="النص البديل للوسائط"
            value={form.hero_image_alt_ar}
            onChange={(e) => update("hero_image_alt_ar", e.target.value)}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="زر أساسي"
              value={form.hero_cta_primary_label_ar}
              onChange={(e) =>
                update("hero_cta_primary_label_ar", e.target.value)
              }
            />
            <Input
              label="زر ثانوي"
              value={form.hero_cta_secondary_label_ar}
              onChange={(e) =>
                update("hero_cta_secondary_label_ar", e.target.value)
              }
            />
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-beige-dark/70 bg-beige/20 p-4" dir="rtl">
          <p className="text-sm font-semibold text-charcoal">עברית</p>
          <Input
            label="כותרת"
            value={form.hero_title_he ?? ""}
            onChange={(e) => update("hero_title_he", e.target.value)}
          />
          <Input
            label="מילת הדגשה"
            value={form.hero_title_emphasis_he ?? ""}
            onChange={(e) => update("hero_title_emphasis_he", e.target.value)}
          />
          <Textarea
            label="תיאור"
            rows={3}
            value={form.hero_subtitle_he ?? ""}
            onChange={(e) => update("hero_subtitle_he", e.target.value)}
          />
        <Input
            label="טקסט חלופי למדיה"
            value={form.hero_image_alt_he ?? ""}
            onChange={(e) => update("hero_image_alt_he", e.target.value)}
          />
        <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="כפתור ראשי"
              value={form.hero_cta_primary_label_he ?? ""}
              onChange={(e) =>
                update("hero_cta_primary_label_he", e.target.value)
              }
            />
            <Input
              label="כפתור משני"
              value={form.hero_cta_secondary_label_he ?? ""}
              onChange={(e) =>
                update("hero_cta_secondary_label_he", e.target.value)
              }
            />
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-beige-dark/70 bg-beige/20 p-4" dir="ltr">
          <p className="text-sm font-semibold text-charcoal">English</p>
          <Input
            label="Title"
            value={form.hero_title_en ?? ""}
            onChange={(e) => update("hero_title_en", e.target.value)}
          />
          <Input
            label="Emphasis word"
            value={form.hero_title_emphasis_en ?? ""}
            onChange={(e) => update("hero_title_emphasis_en", e.target.value)}
          />
          <Textarea
            label="Subtitle"
            rows={3}
            value={form.hero_subtitle_en ?? ""}
            onChange={(e) => update("hero_subtitle_en", e.target.value)}
          />
          <Input
            label="Media alt"
            value={form.hero_image_alt_en ?? ""}
            onChange={(e) => update("hero_image_alt_en", e.target.value)}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Primary CTA"
              value={form.hero_cta_primary_label_en ?? ""}
              onChange={(e) =>
                update("hero_cta_primary_label_en", e.target.value)
              }
            />
            <Input
              label="Secondary CTA"
              value={form.hero_cta_secondary_label_en ?? ""}
              onChange={(e) =>
                update("hero_cta_secondary_label_en", e.target.value)
              }
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-charcoal">{cu.heroMedia}</p>
            <p className="mt-1 text-xs text-muted">{cu.heroMediaHint}</p>
          </div>

          <div className="space-y-4">
            {slides.map((slide, index) => (
              <div
                key={`hero-slide-${index}-${slide.type}`}
                className="space-y-3 rounded-xl border border-beige-dark/70 bg-beige/10 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-charcoal">
                    {cu.heroSlideLabel.replace("{n}", String(index + 1))}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => duplicateSlide(index)}
                      disabled={slides.length >= HERO_SLIDE_MAX}
                      className="text-xs text-gold hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
                    >
                      {cu.heroSlideDuplicate}
                    </button>
                    {index > 0 ? (
                      <button
                        type="button"
                        onClick={() => removeSlide(index)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        {cu.heroSlideRemove}
                      </button>
                    ) : (
                      <span className="text-xs text-muted">
                        {cu.heroSlidePrimaryLocked}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateSlide(index, {
                        type: "image",
                        url: slide.type === "image" ? slide.url : "",
                        poster_url: undefined,
                        video_display: undefined,
                      })
                    }
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      slide.type === "image"
                        ? "bg-gold text-white"
                        : "bg-white text-charcoal ring-1 ring-beige-dark"
                    )}
                  >
                    {cu.heroMediaImage}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateSlide(index, {
                        type: "video",
                        url: slide.type === "video" ? slide.url : "",
                      })
                    }
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      slide.type === "video"
                        ? "bg-gold text-white"
                        : "bg-white text-charcoal ring-1 ring-beige-dark"
                    )}
                  >
                    {cu.heroMediaVideo}
                  </button>
                </div>

                {slide.type === "video" ? (
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-sm font-medium text-charcoal">
                        {cu.heroVideoUrl}
                      </p>
                      <VideoUpload
                        value={slide.url}
                        onChange={(url) => updateSlide(index, { url })}
                        uploadLabel={cu.heroUploadVideo}
                        uploadingLabel={cu.heroUploadingVideo}
                        pastePlaceholder={cu.heroVideoUrlPlaceholder}
                        pasteAddLabel={cu.heroAddVideoUrl}
                        removeLabel={cu.heroRemoveVideo}
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-charcoal">
                        {cu.heroVideoPoster}
                      </p>
                      <p className="mb-2 text-xs text-muted">
                        {cu.heroVideoPosterHint}
                      </p>
                      <ImageUpload
                        value={slide.poster_url ? [slide.poster_url] : []}
                        onChange={(urls) =>
                          updateSlide(index, {
                            poster_url: urls[0]?.trim() || undefined,
                          })
                        }
                      />
                    </div>
                    {slide.url.trim() ? (
                      <VideoDisplayControls
                        src={slide.url}
                        poster={slide.poster_url}
                        value={slide.video_display}
                        onChange={(video_display) =>
                          updateSlide(index, { video_display })
                        }
                        labels={{
                          sectionTitle: cu.heroVideoDisplayTitle,
                          sectionHint: cu.heroVideoDisplayHint,
                          focalTitle: cu.heroVideoFocalTitle,
                          focalHint: cu.heroVideoFocalHint,
                          focalX: cu.heroVideoFocalX,
                          focalY: cu.heroVideoFocalY,
                          rotationTitle: cu.heroVideoRotationTitle,
                          speedTitle: cu.heroVideoSpeedTitle,
                          speedHint: cu.heroVideoSpeedHint,
                          trimTitle: cu.heroVideoTrimTitle,
                          trimHint: cu.heroVideoTrimHint,
                          trimStart: cu.heroVideoTrimStart,
                          trimEnd: cu.heroVideoTrimEnd,
                          trimFull: cu.heroVideoTrimFull,
                          reset: cu.heroVideoDisplayReset,
                        }}
                      />
                    ) : null}
                  </div>
                ) : (
                  <ImageUpload
                    value={slide.url ? [slide.url] : []}
                    onChange={(urls) =>
                      updateSlide(index, { url: urls[0]?.trim() || "" })
                    }
                  />
                )}

                {slides.length > 1 ? (
                  <div className="space-y-3 rounded-lg border border-beige-dark/50 bg-white/60 p-3">
                    <div>
                      <p className="text-xs font-semibold text-charcoal">
                        {cu.heroSlideTimingTitle}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {cu.heroSlideTimingHint}
                      </p>
                    </div>
                    <label className="block text-xs text-charcoal">
                      <span className="mb-1 flex justify-between text-muted">
                        <span>{cu.heroSlideDurationLabel}</span>
                        <span>
                          {(resolveSlideDurationMs(slide) / 1000).toFixed(1)}s
                        </span>
                      </span>
                      <input
                        type="range"
                        min={HERO_SLIDE_DURATION_MIN_MS}
                        max={HERO_SLIDE_DURATION_MAX_MS}
                        step={500}
                        value={resolveSlideDurationMs(slide)}
                        onChange={(e) =>
                          updateSlide(index, {
                            duration_ms: Number(e.target.value),
                          })
                        }
                        className="w-full accent-gold"
                      />
                    </label>
                    <label className="block text-xs text-charcoal">
                      <span className="mb-1 flex justify-between text-muted">
                        <span>{cu.heroSlideTransitionLabel}</span>
                        <span>
                          {(resolveSlideTransitionMs(slide) / 1000).toFixed(1)}s
                        </span>
                      </span>
                      <input
                        type="range"
                        min={HERO_SLIDE_TRANSITION_MIN_MS}
                        max={HERO_SLIDE_TRANSITION_MAX_MS}
                        step={100}
                        value={resolveSlideTransitionMs(slide)}
                        onChange={(e) =>
                          updateSlide(index, {
                            transition_ms: Number(e.target.value),
                          })
                        }
                        className="w-full accent-gold"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateSlide(index, {
                          duration_ms: undefined,
                          transition_ms: undefined,
                        })
                      }
                      className="text-xs text-gold hover:underline"
                    >
                      {cu.heroSlideTimingReset}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {slides.length < HERO_SLIDE_MAX ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => addSlide("image")}>
                {cu.heroAddImageSlide}
              </Button>
              <Button type="button" variant="outline" onClick={() => addSlide("video")}>
                {cu.heroAddVideoSlide}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label={cu.primaryCtaHref}
            value={form.hero_cta_primary_href}
            onChange={(e) => update("hero_cta_primary_href", e.target.value)}
            dir="ltr"
          />
          <Input
            label={cu.secondaryCtaHref}
            value={form.hero_cta_secondary_href}
            onChange={(e) => update("hero_cta_secondary_href", e.target.value)}
            dir="ltr"
          />
        </div>

        {message && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        )}
        {error && form.hero_title_ar.trim() && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <Button loading={saving} onClick={save}>
          {saving ? cu.saving : cu.saveContent}
        </Button>
      </div>

      <CmsLivePreview title={cu.heroPreviewTitle}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-beige">
          {previewSlide?.type === "video" && previewSlide.url ? (
            <AutoLoopVideo
              src={previewSlide.url}
              poster={previewSlide.poster_url}
              alt=""
              active
              display={previewSlide.video_display}
            />
          ) : (
          <Image
            src={previewImage}
            alt=""
            fill
            className="object-cover object-[center_25%]"
            sizes="380px"
          />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#2c2419]/50 via-[#f0ebe3]/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 space-y-2 p-4 text-charcoal">
            <p className="font-[family-name:var(--font-cormorant)] text-lg tracking-[0.18em] text-gold">
              {SITE_NAME}
            </p>
            <p className="text-base font-medium leading-snug">
              {split ? (
                <>
                  {split.before}
                  <span className="relative inline-block font-bold">
                    {split.emphasis}
                    <span
                      aria-hidden
                      className="absolute -bottom-0.5 start-0 h-px w-full bg-gold/70"
                    />
                  </span>
                  {split.after}
                </>
              ) : (
                form.hero_title_ar || "—"
              )}
            </p>
            <p className="whitespace-pre-line text-xs leading-relaxed text-charcoal/75">
              {form.hero_subtitle_ar}
            </p>
            <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
              <span className="rounded-full bg-gold px-2.5 py-1 text-white">
                {form.hero_cta_primary_label_ar || "—"}
              </span>
              <span className="rounded-full border border-gold px-2.5 py-1 text-gold">
                {form.hero_cta_secondary_label_ar || "—"}
              </span>
            </div>
          </div>
        </div>
      </CmsLivePreview>
    </div>
  );
}
