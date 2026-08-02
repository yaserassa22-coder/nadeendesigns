"use client";

import Image from "next/image";
import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { GalleryItem } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ImageUpload } from "@/components/admin/ImageUpload";

const CATEGORIES = [
  { value: "wedding", label: "زفاف" },
  { value: "details", label: "تفاصيل" },
  { value: "boutique", label: "البوتيك" },
  { value: "events", label: "فعاليات" },
];

interface GalleryManagerProps {
  initialItems: GalleryItem[];
}

export function GalleryManager({ initialItems }: GalleryManagerProps) {
  const [items, setItems] = useState(initialItems);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("wedding");
  const [sortOrder, setSortOrder] = useState("0");
  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
      setError("العنوان والصورة مطلوبان");
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
      if (!res.ok) throw new Error(data.error ?? "فشل الحفظ");

      if (editing) {
        setItems((prev) => prev.map((i) => (i.id === editing.id ? data : i)));
      } else {
        setItems((prev) => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      }
      setOpen(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذه الصورة من المعرض؟")) return;
    const res = await fetch(`/api/gallery?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "فشل الحذف");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          إضافة صورة
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.length === 0 ? (
          <p className="col-span-full rounded-2xl border border-beige-dark bg-white py-12 text-center text-muted">
            لا توجد صور في المعرض
          </p>
        ) : (
          items.map((item) => (
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
                  <p className="text-xs text-muted">{item.category}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="rounded-lg p-2 text-gold hover:bg-gold/10"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editing ? "تعديل الصورة" : "إضافة صورة"}
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
                label="العنوان *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Select
                label="التصنيف"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={CATEGORIES}
              />
              <Input
                label="ترتيب العرض"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
              <div>
                <p className="mb-2 text-sm font-medium">الصورة *</p>
                <ImageUpload
                  value={images}
                  onChange={setImages}
                  multiple={false}
                />
                <Input
                  className="mt-3"
                  placeholder="أو الصقي رابط الصورة"
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
                إلغاء
              </Button>
              <Button loading={saving} onClick={save}>
                حفظ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
