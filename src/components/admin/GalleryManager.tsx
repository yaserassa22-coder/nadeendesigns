"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import type { GalleryItem } from "@/types";
import type { ListVisibility } from "@/lib/admin/lifecycle-types";
import { filterLifecycleRows } from "@/lib/admin/query-lifecycle";
import type { LifecycleCapabilities } from "@/lib/admin/permissions";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { RowLifecycleActions } from "@/components/admin/lifecycle/RowLifecycleActions";
import { VisibilityFilter } from "@/components/admin/lifecycle/VisibilityFilter";

type GalleryItemRow = GalleryItem & {
  is_deleted?: boolean | null;
  archived_at?: string | null;
};

interface GalleryManagerProps {
  initialItems: GalleryItem[];
}

export function GalleryManager({ initialItems }: GalleryManagerProps) {
  const { t, dir } = useLocale();
  const g = t.admin.galleryAdmin;
  const gu = t.galleryUi;
  const categoryOptions = useMemo(
    () => [
      { value: "wedding", label: gu.wedding },
      { value: "nouf_dresses", label: gu.nouf_dresses },
      { value: "details", label: gu.details },
      { value: "boutique", label: gu.boutique },
      { value: "events", label: gu.events },
    ],
    [gu]
  );
  const categoryLabel = (value: string) =>
    categoryOptions.find((c) => c.value === value)?.label ?? value;

  const [items, setItems] = useState<GalleryItemRow[]>(initialItems);
  const [visibility, setVisibility] = useState<ListVisibility>("active");
  const [caps, setCaps] = useState<LifecycleCapabilities | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("wedding");
  const [sortOrder, setSortOrder] = useState("0");
  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
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

  const visibleItems = useMemo(
    () => filterLifecycleRows(items, visibility),
    [items, visibility]
  );

  const reset = () => {
    setEditing(null);
    setTitle("");
    setCategory("wedding");
    setSortOrder("0");
    setImages([]);
    setImageUrl("");
    setError("");
  };

  const openCreate = () => {
    reset();
    setOpen(true);
  };

  const openEdit = (item: GalleryItem) => {
    setEditing(item);
    setTitle(item.title_ar);
    setCategory(item.category);
    setSortOrder(String(item.sort_order));
    setImages(item.image_url ? [item.image_url] : []);
    setImageUrl("");
    setError("");
    setOpen(true);
  };

  const save = async () => {
    const image_url = images[0] || imageUrl.trim();
    if (!title.trim() || !image_url) {
      setError(g.titleAndImageRequired);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const body = {
        title_ar: title.trim(),
        image_url,
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
        setItems((prev) => prev.concat(data).sort((a, b) => a.sort_order - b.sort_order));
      }
      setOpen(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : g.genericError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-sm text-muted">
            {t.admin.productsUi.visibility}
          </p>
          <VisibilityFilter value={visibility} onChange={setVisibility} />
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {g.addImage}
        </Button>
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
              <div className="relative aspect-square">
                <Image
                  src={item.image_url}
                  alt={item.title_ar}
                  fill
                  className="object-cover"
                  sizes="(max-width:768px) 50vw, 25vw"
                />
              </div>
              <div className="flex items-start justify-between gap-2 p-4">
                <div>
                  <p className="font-medium text-charcoal">{item.title_ar}</p>
                  <p className="text-xs text-muted">{categoryLabel(item.category)}</p>
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

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" dir={dir}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editing ? g.editImage : g.addImageTitle}
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
                options={categoryOptions}
              />
              <Input
                label={g.sortOrder}
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
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
    </div>
  );
}
