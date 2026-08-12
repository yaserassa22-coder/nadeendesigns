"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Film, Pencil, Plus, X } from "lucide-react";
import type { GalleryItem, GalleryMediaType } from "@/types";
import type { ListVisibility } from "@/lib/admin/lifecycle-types";
import { filterLifecycleRows } from "@/lib/admin/query-lifecycle";
import type { LifecycleCapabilities } from "@/lib/admin/permissions";
import {
  orderGalleryCategories,
  resolveGalleryCategoryLabel,
  slugifyGalleryCategory,
  type GalleryCategory,
} from "@/lib/gallery/categories";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { VideoUpload } from "@/components/admin/VideoUpload";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { RowLifecycleActions } from "@/components/admin/lifecycle/RowLifecycleActions";
import { VisibilityFilter } from "@/components/admin/lifecycle/VisibilityFilter";
import { isGalleryVideo } from "@/lib/gallery/media";
import { cn } from "@/lib/utils";

type GalleryItemRow = GalleryItem & {
  is_deleted?: boolean | null;
  archived_at?: string | null;
};

interface GalleryManagerProps {
  initialItems: GalleryItem[];
  initialCategories: GalleryCategory[];
}

type CategoryDraft = {
  id?: string;
  slug: string;
  label_ar: string;
  label_he: string;
  label_en: string;
  sort_order: string;
  is_active: boolean;
};

const emptyCategoryDraft = (): CategoryDraft => ({
  slug: "",
  label_ar: "",
  label_he: "",
  label_en: "",
  sort_order: "0",
  is_active: true,
});

export function GalleryManager({
  initialItems,
  initialCategories,
}: GalleryManagerProps) {
  const { t, dir, locale } = useLocale();
  const g = t.admin.galleryAdmin;

  const [categories, setCategories] =
    useState<GalleryCategory[]>(initialCategories);
  const [catOpen, setCatOpen] = useState(false);
  const [catDraft, setCatDraft] = useState<CategoryDraft>(emptyCategoryDraft());
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState("");

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((c) => c.is_active)
        .map((c) => ({
          value: c.slug,
          label: resolveGalleryCategoryLabel(c, locale),
        })),
    [categories, locale]
  );

  const categoryLabel = (value: string) =>
    categoryOptions.find((c) => c.value === value)?.label ??
    categories.find((c) => c.slug === value)?.label_ar ??
    value;

  const [items, setItems] = useState<GalleryItemRow[]>(initialItems);
  const [visibility, setVisibility] = useState<ListVisibility>("active");
  const [imageFilter, setImageFilter] = useState<string>("all");
  const [caps, setCaps] = useState<LifecycleCapabilities | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(
    categoryOptions[0]?.value ?? "wedding"
  );
  const [sortOrder, setSortOrder] = useState("0");
  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [mediaType, setMediaType] = useState<GalleryMediaType>("image");
  const [videoUrl, setVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch("/api/admin/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (d?.capabilities) setCaps(d.capabilities);
        })
        .catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleItems = useMemo(() => {
    const lifecycle = filterLifecycleRows(items, visibility);
    if (imageFilter === "all") return lifecycle;
    return lifecycle.filter((i) => i.category === imageFilter);
  }, [items, visibility, imageFilter]);

  const imageFilterTabs = useMemo(
    () => [
      { value: "all", label: t.galleryUi.all },
      ...orderGalleryCategories(categories).map((c) => ({
        value: c.slug,
        label: resolveGalleryCategoryLabel(c, locale),
      })),
    ],
    [categories, locale, t.galleryUi.all]
  );

  const reset = () => {
    setEditing(null);
    setTitle("");
    setCategory(categoryOptions[0]?.value ?? "wedding");
    setSortOrder("0");
    setImages([]);
    setImageUrl("");
    setMediaType("image");
    setVideoUrl("");
    setError("");
  };

  const openCreate = (kind: GalleryMediaType = "image") => {
    reset();
    setMediaType(kind);
    if (imageFilter !== "all") setCategory(imageFilter);
    setOpen(true);
  };

  const openEdit = (item: GalleryItem) => {
    setEditing(item);
    setTitle(item.title_ar);
    setCategory(item.category);
    setSortOrder(String(item.sort_order));
    setMediaType(isGalleryVideo(item) ? "video" : "image");
    setVideoUrl(item.video_url?.trim() || "");
    setImages(item.image_url ? [item.image_url] : []);
    setImageUrl("");
    setError("");
    setOpen(true);
  };

  const save = async () => {
    const image_url = images[0] || imageUrl.trim();
    if (!title.trim()) {
      setError(g.titleRequired);
      return;
    }
    if (mediaType === "image" && !image_url) {
      setError(g.titleAndImageRequired);
      return;
    }
    if (mediaType === "video" && !videoUrl.trim()) {
      setError(g.titleAndVideoRequired);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const body = {
        title_ar: title.trim(),
        image_url: image_url || "",
        video_url: mediaType === "video" ? videoUrl.trim() : "",
        media_type: mediaType,
        category,
        sort_order: Number(sortOrder) || 0,
      };
      const res = await fetch("/api/gallery", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...body } : body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? g.saveFailed);

      if (editing) {
        setItems((prev) => prev.map((i) => (i.id === editing.id ? data : i)));
      } else {
        setItems((prev) =>
          prev.concat(data).sort((a, b) => a.sort_order - b.sort_order)
        );
      }
      setOpen(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : g.genericError);
    } finally {
      setSaving(false);
    }
  };

  const openCreateCategory = () => {
    setCatDraft(emptyCategoryDraft());
    setCatError("");
    setCatOpen(true);
  };

  const openEditCategory = (cat: GalleryCategory) => {
    setCatDraft({
      id: cat.id,
      slug: cat.slug,
      label_ar: cat.label_ar,
      label_he: cat.label_he,
      label_en: cat.label_en,
      sort_order: String(cat.sort_order),
      is_active: cat.is_active,
    });
    setCatError("");
    setCatOpen(true);
  };

  const saveCategory = async () => {
    if (!catDraft.label_ar.trim()) {
      setCatError(g.categoryLabelAr);
      return;
    }
    const slug =
      slugifyGalleryCategory(catDraft.slug) ||
      slugifyGalleryCategory(catDraft.label_en) ||
      slugifyGalleryCategory(catDraft.label_ar);
    if (!slug) {
      setCatError(g.categorySlug);
      return;
    }

    setCatSaving(true);
    setCatError("");
    try {
      const body = {
        id: catDraft.id,
        slug,
        label_ar: catDraft.label_ar.trim(),
        label_he: catDraft.label_he.trim(),
        label_en: catDraft.label_en.trim(),
        sort_order: Number(catDraft.sort_order) || 0,
        is_active: catDraft.is_active,
      };
      const res = await fetch("/api/gallery/categories", {
        method: catDraft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? g.categorySaveFailed);

      setCategories((prev) => {
        const next = catDraft.id
          ? prev.map((c) => (c.id === catDraft.id ? data : c))
          : prev.concat(data);
        return next.sort((a, b) => a.sort_order - b.sort_order);
      });
      setCatOpen(false);
      setCatDraft(emptyCategoryDraft());
    } catch (e) {
      setCatError(e instanceof Error ? e.message : g.genericError);
    } finally {
      setCatSaving(false);
    }
  };

  const deleteCategory = async (cat: GalleryCategory) => {
    if (cat.id.startsWith("fallback-")) {
      setCatError("Run the gallery_categories migration first.");
      return;
    }
    if (!window.confirm(g.categoryDeleteConfirm)) return;
    try {
      const res = await fetch(
        `/api/gallery/categories?id=${encodeURIComponent(cat.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? g.genericError);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : g.genericError);
    }
  };

  return (
    <div className="space-y-8" dir={dir}>
      <section className="rounded-2xl border border-beige-dark/70 bg-ivory/35 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-charcoal">
              {g.categoriesTitle}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">{g.categoriesHint}</p>
          </div>
          <Button type="button" onClick={openCreateCategory}>
            <Plus className="h-4 w-4" />
            {g.addCategory}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.length === 0 ? (
            <p className="text-sm text-muted">{g.categoryEmpty}</p>
          ) : (
            categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => openEditCategory(cat)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  cat.is_active
                    ? "bg-beige text-charcoal hover:bg-gold/15"
                    : "bg-white text-muted line-through opacity-60"
                )}
                title={g.editCategory}
              >
                {resolveGalleryCategoryLabel(cat, locale)}
              </button>
            ))
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="mb-1.5 text-lg font-semibold text-charcoal">
              {g.imagesTitle}
            </h2>
            <p className="mb-2 text-sm text-muted">{g.imagesHint}</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {imageFilterTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setImageFilter(tab.value)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition",
                    imageFilter === tab.value
                      ? "bg-gold text-white"
                      : "bg-beige text-charcoal hover:bg-gold/20"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <p className="mb-1.5 text-sm text-muted">
              {t.admin.productsUi.visibility}
            </p>
            <VisibilityFilter value={visibility} onChange={setVisibility} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => openCreate("image")}>
              <Plus className="h-4 w-4" />
              {g.addImage}
            </Button>
            <Button onClick={() => openCreate("video")}>
              <Film className="h-4 w-4" />
              {g.addVideo}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleItems.length === 0 ? (
            <p className="col-span-full rounded-2xl border border-beige-dark bg-white py-12 text-center text-muted">
              {g.empty}
            </p>
          ) : (
            visibleItems.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-beige-dark bg-white shadow-sm"
              >
                <div className="relative aspect-square bg-beige/40">
                  {isGalleryVideo(item) && item.video_url ? (
                    <video
                      src={item.video_url}
                      poster={item.image_url || undefined}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.title_ar}
                      fill
                      className="object-cover"
                      sizes="(max-width:768px) 50vw, 25vw"
                    />
                  ) : null}
                  {isGalleryVideo(item) ? (
                    <span className="absolute start-2 top-2 inline-flex items-center gap-1 rounded-full bg-charcoal/70 px-2 py-1 text-[10px] tracking-wide text-ivory">
                      <Film className="h-3 w-3" />
                      {g.video}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-start justify-between gap-2 p-4">
                  <div>
                    <p className="font-medium text-charcoal">{item.title_ar}</p>
                    <p className="text-xs text-muted">
                      {categoryLabel(item.category)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="rounded-lg p-2 text-gold hover:bg-gold/10"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <RowLifecycleActions
                      module="gallery"
                      id={item.id}
                      archived={Boolean(item.archived_at)}
                      allowArchive={caps?.canArchive ?? false}
                      allowRestore={caps?.canRestore ?? false}
                      allowSoftDelete={caps?.canSoftDelete ?? false}
                      onChanged={(kind) => {
                        if (kind === "soft_delete") {
                          setItems((prev) =>
                            prev.filter((i) => i.id !== item.id)
                          );
                          return;
                        }
                        setItems((prev) =>
                          prev.map((i) =>
                            i.id === item.id
                              ? {
                                  ...i,
                                  archived_at:
                                    kind === "archive"
                                      ? new Date().toISOString()
                                      : null,
                                }
                              : i
                          )
                        );
                      }}
                      onError={(msg) => alert(msg)}
                    />
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 p-4 sm:items-center">
          <div
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            dir={dir}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editing
                  ? mediaType === "video"
                    ? g.editVideo
                    : g.editImage
                  : mediaType === "video"
                    ? g.addVideoTitle
                    : g.addImageTitle}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <Input
                label={g.titleRequired}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Select
                label={g.category}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={
                  categoryOptions.length
                    ? categoryOptions
                    : [{ value: category, label: categoryLabel(category) }]
                }
              />
              <Input
                label={g.sortOrder}
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
              {mediaType === "video" ? (
                <div>
                  <p className="mb-2 text-sm font-medium">{g.videoRequired}</p>
                  <VideoUpload
                    value={videoUrl}
                    onChange={setVideoUrl}
                    uploadLabel={t.admin.wornByYouAdmin.uploadVideo}
                    uploadingLabel={t.admin.wornByYouAdmin.uploadingVideo}
                    pastePlaceholder={t.admin.wornByYouAdmin.videoUrlPlaceholder}
                    pasteAddLabel={t.admin.wornByYouAdmin.addVideoUrl}
                    removeLabel={t.admin.wornByYouAdmin.removeVideo}
                  />
                  <p className="mb-2 mt-4 text-sm font-medium">{g.posterOptional}</p>
                  <ImageUpload
                    value={images}
                    onChange={setImages}
                    multiple={false}
                  />
                  <Input
                    className="mt-3"
                    placeholder={g.imageUrlPlaceholder}
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    dir="ltr"
                  />
                </div>
              ) : (
                <div>
                  <p className="mb-2 text-sm font-medium">{g.imageRequired}</p>
                  <ImageUpload
                    value={images}
                    onChange={setImages}
                    multiple={false}
                  />
                  <Input
                    className="mt-3"
                    placeholder={g.imageUrlPlaceholder}
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    dir="ltr"
                  />
                </div>
              )}
            </div>

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                {t.common.cancel}
              </Button>
              <Button loading={saving} onClick={() => void save()}>
                {t.common.save}
              </Button>
            </div>
          </div>
        </div>
      )}

      {catOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 p-4 sm:items-center">
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            dir={dir}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {catDraft.id ? g.editCategory : g.addCategory}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setCatOpen(false);
                  setCatDraft(emptyCategoryDraft());
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <Input
                label={g.categoryLabelAr}
                value={catDraft.label_ar}
                onChange={(e) =>
                  setCatDraft((d) => ({ ...d, label_ar: e.target.value }))
                }
              />
              <Input
                label={g.categoryLabelHe}
                value={catDraft.label_he}
                onChange={(e) =>
                  setCatDraft((d) => ({ ...d, label_he: e.target.value }))
                }
              />
              <Input
                label={g.categoryLabelEn}
                value={catDraft.label_en}
                onChange={(e) =>
                  setCatDraft((d) => ({
                    ...d,
                    label_en: e.target.value,
                    slug: d.id
                      ? d.slug
                      : slugifyGalleryCategory(e.target.value) || d.slug,
                  }))
                }
              />
              <Input
                label={g.categorySlug}
                value={catDraft.slug}
                onChange={(e) =>
                  setCatDraft((d) => ({
                    ...d,
                    slug: slugifyGalleryCategory(e.target.value),
                  }))
                }
                dir="ltr"
              />
              <Input
                label={g.sortOrder}
                type="number"
                value={catDraft.sort_order}
                onChange={(e) =>
                  setCatDraft((d) => ({ ...d, sort_order: e.target.value }))
                }
              />
              <label className="flex items-center gap-2 text-sm text-charcoal">
                <input
                  type="checkbox"
                  checked={catDraft.is_active}
                  onChange={(e) =>
                    setCatDraft((d) => ({
                      ...d,
                      is_active: e.target.checked,
                    }))
                  }
                  className="accent-gold"
                />
                {g.categoryActive}
              </label>
            </div>

            {catError ? (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {catError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              {catDraft.id ? (
                <Button
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => {
                    const cat = categories.find((c) => c.id === catDraft.id);
                    if (!cat) return;
                    void deleteCategory(cat).then(() => {
                      setCatOpen(false);
                      setCatDraft(emptyCategoryDraft());
                    });
                  }}
                >
                  {t.common.delete}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCatOpen(false);
                    setCatDraft(emptyCategoryDraft());
                  }}
                >
                  {t.common.cancel}
                </Button>
                <Button loading={catSaving} onClick={() => void saveCategory()}>
                  {t.common.save}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
