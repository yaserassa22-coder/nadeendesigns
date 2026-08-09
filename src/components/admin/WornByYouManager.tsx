"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import type {
  WornByYouItem,
  WornByYouMediaType,
  WornByYouProductKind,
} from "@/types";
import type { ListVisibility } from "@/lib/admin/lifecycle-types";
import { filterLifecycleRows } from "@/lib/admin/query-lifecycle";
import type { LifecycleCapabilities } from "@/lib/admin/permissions";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { VideoUpload } from "@/components/admin/VideoUpload";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { RowLifecycleActions } from "@/components/admin/lifecycle/RowLifecycleActions";
import { VisibilityFilter } from "@/components/admin/lifecycle/VisibilityFilter";

type ProductOption = { id: string; label: string };

interface WornByYouManagerProps {
  initialItems: WornByYouItem[];
}

export function WornByYouManager({ initialItems }: WornByYouManagerProps) {
  const { t, dir } = useLocale();
  const w = t.admin.wornByYouAdmin;

  const [items, setItems] = useState<WornByYouItem[]>(initialItems);
  const [visibility, setVisibility] = useState<ListVisibility>("active");
  const [caps, setCaps] = useState<LifecycleCapabilities | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WornByYouItem | null>(null);
  const [mediaType, setMediaType] = useState<WornByYouMediaType>("image");
  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [caption, setCaption] = useState("");
  const [altText, setAltText] = useState("");
  const [productKind, setProductKind] = useState<"" | WornByYouProductKind>("");
  const [productId, setProductId] = useState("");
  const [productLabel, setProductLabel] = useState("");
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [socialUrl, setSocialUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
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

  useEffect(() => {
    if (!productKind) {
      setProductOptions([]);
      return;
    }
    let cancelled = false;
    setLoadingProducts(true);
    const endpoint =
      productKind === "dress"
        ? "/api/dresses"
        : productKind === "veil"
          ? "/api/veils"
          : "/api/bridal-robes";
    void fetch(endpoint, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : [];
        setProductOptions(
          rows
            .map((row: { id?: string; name_ar?: string; name?: string }) => ({
              id: String(row.id ?? ""),
              label: String(row.name_ar || row.name || row.id || ""),
            }))
            .filter((o: ProductOption) => o.id)
            .slice(0, 200)
        );
      })
      .catch(() => {
        if (!cancelled) setProductOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productKind]);

  const visibleItems = useMemo(
    () => filterLifecycleRows(items, visibility),
    [items, visibility]
  );

  const reset = () => {
    setEditing(null);
    setMediaType("image");
    setImages([]);
    setImageUrl("");
    setVideoUrl("");
    setCustomerName("");
    setCaption("");
    setAltText("");
    setProductKind("");
    setProductId("");
    setProductLabel("");
    setSocialUrl("");
    setIsActive(true);
    setSortOrder("0");
    setError("");
  };

  const openCreate = () => {
    reset();
    setOpen(true);
  };

  const openEdit = (item: WornByYouItem) => {
    setEditing(item);
    setMediaType(item.media_type === "video" ? "video" : "image");
    setImages(item.image_url ? [item.image_url] : []);
    setImageUrl("");
    setVideoUrl(item.video_url ?? "");
    setCustomerName(item.customer_name ?? "");
    setCaption(item.caption ?? "");
    setAltText(item.alt_text ?? "");
    setProductKind(item.product_kind ?? "");
    setProductId(item.product_id ?? "");
    setProductLabel(item.product_label ?? "");
    setSocialUrl(item.social_url ?? "");
    setIsActive(item.is_active !== false);
    setSortOrder(String(item.sort_order ?? 0));
    setError("");
    setOpen(true);
  };

  const save = async () => {
    const image_url = images[0] || imageUrl.trim();
    if (mediaType === "image" && !image_url) {
      setError(w.imageRequiredError);
      return;
    }
    if (mediaType === "video" && !videoUrl.trim()) {
      setError(w.videoRequiredError);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const body = {
        media_type: mediaType,
        image_url: image_url || "",
        video_url: mediaType === "video" ? videoUrl.trim() : null,
        customer_name: customerName.trim() || null,
        caption: caption.trim() || null,
        alt_text: altText.trim() || null,
        product_kind: productKind || null,
        product_id: productId.trim() || null,
        product_label: productLabel.trim() || null,
        social_url: socialUrl.trim() || null,
        is_active: isActive,
        sort_order: Number(sortOrder) || 0,
      };
      const res = await fetch("/api/worn-by-you", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...body } : body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? w.saveFailed);

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
      setError(e instanceof Error ? e.message : w.genericError);
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
          {w.addItem}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleItems.length === 0 ? (
          <p className="col-span-full rounded-2xl border border-beige-dark bg-white py-12 text-center text-muted">
            {w.empty}
          </p>
        ) : (
          visibleItems.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-beige-dark bg-white shadow-sm"
            >
              <div className="relative aspect-[3/4] bg-beige">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.alt_text || item.customer_name || w.itemFallback}
                    fill
                    className="object-cover"
                    sizes="(max-width:768px) 50vw, 25vw"
                  />
                ) : item.media_type === "video" && item.video_url ? (
                  <video
                    src={item.video_url}
                    className="absolute inset-0 h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : null}
                {!item.is_active ? (
                  <span className="absolute start-2 top-2 rounded bg-charcoal/70 px-2 py-0.5 text-[10px] tracking-wide text-ivory uppercase">
                    {w.inactive}
                  </span>
                ) : null}
                {item.media_type === "video" ? (
                  <span className="absolute end-2 top-2 rounded bg-charcoal/70 px-2 py-0.5 text-[10px] tracking-wide text-ivory uppercase">
                    {w.video}
                  </span>
                ) : null}
              </div>
              <div className="flex items-start justify-between gap-2 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-charcoal">
                    {item.customer_name || item.caption || w.untitled}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {item.product_label ||
                      (item.media_type === "video" ? w.video : w.image)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="rounded-lg p-2 text-gold hover:bg-gold/10"
                    aria-label={w.editItem}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <RowLifecycleActions
                    module="worn_by_you"
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

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 p-4 sm:items-center">
          <div
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            dir={dir}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editing ? w.editItem : w.addItemTitle}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                aria-label={t.common.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <Select
                label={w.mediaType}
                value={mediaType}
                onChange={(e) => {
                  const next =
                    e.target.value === "video" ? "video" : "image";
                  setMediaType(next);
                  if (next === "video") {
                    setImages([]);
                    setImageUrl("");
                  } else {
                    setVideoUrl("");
                  }
                }}
                options={[
                  { value: "image", label: w.image },
                  { value: "video", label: w.video },
                ]}
              />

              {mediaType === "video" ? (
                <div>
                  <p className="mb-2 text-sm font-medium">{w.videoUrl} *</p>
                  <VideoUpload
                    value={videoUrl}
                    onChange={setVideoUrl}
                    uploadLabel={w.uploadVideo}
                    uploadingLabel={w.uploadingVideo}
                    pastePlaceholder={w.videoUrlPlaceholder}
                    pasteAddLabel={w.addVideoUrl}
                    removeLabel={w.removeVideo}
                  />
                </div>
              ) : (
                <div>
                  <p className="mb-2 text-sm font-medium">{w.imageRequired}</p>
                  <ImageUpload
                    value={images}
                    onChange={setImages}
                    multiple={false}
                  />
                  <Input
                    className="mt-3"
                    placeholder={w.imageUrlPlaceholder}
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    dir="ltr"
                  />
                </div>
              )}

              <Input
                label={w.customerName}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <Input
                label={w.caption}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
              <Input
                label={w.altText}
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
              />

              <Select
                label={w.productKind}
                value={productKind}
                onChange={(e) => {
                  const v = e.target.value as "" | WornByYouProductKind;
                  setProductKind(v);
                  setProductId("");
                  setProductLabel("");
                }}
                options={[
                  { value: "", label: w.noProduct },
                  { value: "dress", label: w.kindDress },
                  { value: "veil", label: w.kindVeil },
                  { value: "bridal_robe", label: w.kindRobe },
                ]}
              />

              {productKind ? (
                <>
                  <Select
                    label={
                      loadingProducts ? w.loadingProducts : w.selectProduct
                    }
                    value={productId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setProductId(id);
                      const match = productOptions.find((o) => o.id === id);
                      if (match) setProductLabel(match.label);
                    }}
                    options={[
                      { value: "", label: w.selectProduct },
                      ...productOptions.map((o) => ({
                        value: o.id,
                        label: o.label,
                      })),
                    ]}
                  />
                  <Input
                    label={w.productLabel}
                    value={productLabel}
                    onChange={(e) => setProductLabel(e.target.value)}
                  />
                </>
              ) : null}

              <Input
                label={w.socialUrl}
                placeholder={w.socialUrlPlaceholder}
                value={socialUrl}
                onChange={(e) => setSocialUrl(e.target.value)}
                dir="ltr"
              />

              <Input
                label={w.sortOrder}
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />

              <label className="flex items-center gap-3 text-sm text-charcoal">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-beige-dark text-gold focus:ring-gold/40"
                />
                {w.enabled}
              </label>
            </div>

            {error ? (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            ) : null}

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
      ) : null}
    </div>
  );
}
