"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { Dress, DressCategory } from "@/types";
import { DRESS_CATEGORY_LABELS } from "@/types";
import { DRESS_COLORS, DRESS_SIZES, DRESS_STYLES } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ImageUpload } from "@/components/admin/ImageUpload";

type DressFormState = {
  name_ar: string;
  description_ar: string;
  category: DressCategory;
  price: string;
  rental_price: string;
  size: string;
  color: string;
  style: string;
  is_featured: boolean;
  is_available: boolean;
  images: string[];
  imageUrlInput: string;
};

const emptyForm = (): DressFormState => ({
  name_ar: "",
  description_ar: "",
  category: "wedding",
  price: "",
  rental_price: "",
  size: "",
  color: "",
  style: "",
  is_featured: false,
  is_available: true,
  images: [],
  imageUrlInput: "",
});

function toForm(dress: Dress): DressFormState {
  return {
    name_ar: dress.name_ar,
    description_ar: dress.description_ar,
    category: dress.category,
    price: dress.price?.toString() ?? "",
    rental_price: dress.rental_price?.toString() ?? "",
    size: dress.size ?? "",
    color: dress.color ?? "",
    style: dress.style ?? "",
    is_featured: dress.is_featured,
    is_available: dress.is_available,
    images: dress.images ?? [],
    imageUrlInput: "",
  };
}

interface DressesManagerProps {
  initialDresses: Dress[];
}

export function DressesManager({ initialDresses }: DressesManagerProps) {
  const [dresses, setDresses] = useState(initialDresses);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Dress | null>(null);
  const [form, setForm] = useState<DressFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dresses;
    return dresses.filter(
      (d) =>
        d.name_ar.toLowerCase().includes(q) ||
        DRESS_CATEGORY_LABELS[d.category].includes(search) ||
        (d.style?.toLowerCase().includes(q) ?? false)
    );
  }, [dresses, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setError("");
    setOpen(true);
  };

  const openEdit = (dress: Dress) => {
    setEditing(dress);
    setForm(toForm(dress));
    setError("");
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditing(null);
    setError("");
  };

  const payload = () => ({
    name_ar: form.name_ar.trim(),
    description_ar: form.description_ar.trim(),
    category: form.category,
    price: form.price ? Number(form.price) : null,
    rental_price: form.rental_price ? Number(form.rental_price) : null,
    size: form.size || null,
    color: form.color || null,
    style: form.style || null,
    is_featured: form.is_featured,
    is_available: form.is_available,
    images: form.images,
  });

  const save = async () => {
    if (!form.name_ar.trim()) {
      setError("اسم الفستان مطلوب");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dresses", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...payload() } : payload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل الحفظ");

      if (editing) {
        setDresses((prev) => prev.map((d) => (d.id === editing.id ? data : d)));
      } else {
        setDresses((prev) => [data, ...prev]);
      }
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("هل تريدين حذف هذا الفستان؟")) return;
    const res = await fetch(`/api/dresses?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "فشل الحذف");
      return;
    }
    setDresses((prev) => prev.filter((d) => d.id !== id));
  };

  const addImageUrl = () => {
    const url = form.imageUrlInput.trim();
    if (!url) return;
    setForm((f) => ({
      ...f,
      images: [...f.images, url],
      imageUrlInput: "",
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="بحث عن فستان..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-sm"
        />
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          إضافة فستان
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-beige-dark bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-beige/50 text-muted">
              <tr>
                <th className="px-4 py-3 text-right font-medium">الفستان</th>
                <th className="px-4 py-3 text-right font-medium">التصنيف</th>
                <th className="px-4 py-3 text-right font-medium">السعر</th>
                <th className="px-4 py-3 text-right font-medium">الحالة</th>
                <th className="px-4 py-3 text-right font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    لا توجد فساتين
                  </td>
                </tr>
              ) : (
                filtered.map((dress) => (
                  <tr key={dress.id} className="border-t border-beige-dark">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-beige">
                          {dress.images[0] && (
                            <Image
                              src={dress.images[0]}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-charcoal">{dress.name_ar}</p>
                          {dress.style && (
                            <p className="text-xs text-muted">{dress.style}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {DRESS_CATEGORY_LABELS[dress.category]}
                    </td>
                    <td className="px-4 py-3">
                      {dress.price
                        ? formatPrice(dress.price)
                        : dress.rental_price
                          ? `${formatPrice(dress.rental_price)} / إيجار`
                          : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          dress.is_available
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {dress.is_available ? "متوفر" : "غير متوفر"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(dress)}
                          className="rounded-lg p-2 text-gold hover:bg-gold/10"
                          aria-label="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(dress.id)}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                          aria-label="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editing ? "تعديل الفستان" : "إضافة فستان"}
              </h2>
              <button type="button" onClick={close} aria-label="إغلاق">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="الاسم *"
                value={form.name_ar}
                onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
              />
              <Select
                label="التصنيف"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as DressCategory })
                }
                options={Object.entries(DRESS_CATEGORY_LABELS).map(
                  ([value, label]) => ({ value, label })
                )}
              />
              <Input
                label="السعر"
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
              <Input
                label="سعر الإيجار"
                type="number"
                value={form.rental_price}
                onChange={(e) =>
                  setForm({ ...form, rental_price: e.target.value })
                }
              />
              <Select
                label="النمط"
                value={form.style}
                onChange={(e) => setForm({ ...form, style: e.target.value })}
                options={[
                  { value: "", label: "—" },
                  ...DRESS_STYLES.map((s) => ({ value: s, label: s })),
                ]}
              />
              <Select
                label="اللون"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                options={[
                  { value: "", label: "—" },
                  ...DRESS_COLORS.map((c) => ({ value: c, label: c })),
                ]}
              />
              <Select
                label="المقاس"
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
                options={[
                  { value: "", label: "—" },
                  ...DRESS_SIZES.map((s) => ({ value: s, label: s })),
                ]}
              />
              <div className="flex items-end gap-4 pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) =>
                      setForm({ ...form, is_featured: e.target.checked })
                    }
                  />
                  مميز
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_available}
                    onChange={(e) =>
                      setForm({ ...form, is_available: e.target.checked })
                    }
                  />
                  متوفر
                </label>
              </div>
              <div className="sm:col-span-2">
                <Textarea
                  label="الوصف"
                  rows={4}
                  value={form.description_ar}
                  onChange={(e) =>
                    setForm({ ...form, description_ar: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <p className="mb-2 text-sm font-medium">الصور</p>
                <ImageUpload
                  value={form.images}
                  onChange={(images) => setForm({ ...form, images })}
                />
                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder="أو الصقي رابط صورة"
                    value={form.imageUrlInput}
                    onChange={(e) =>
                      setForm({ ...form, imageUrlInput: e.target.value })
                    }
                    dir="ltr"
                  />
                  <Button type="button" variant="outline" onClick={addImageUrl}>
                    إضافة
                  </Button>
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={close}>
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
