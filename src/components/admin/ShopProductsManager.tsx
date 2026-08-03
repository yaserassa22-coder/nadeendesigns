"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { BridalRobe, Veil } from "@/types/shop";
import { VEIL_CATEGORY_OPTIONS } from "@/types/shop";
import { DRESS_COLORS, DRESS_SIZES } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { featuredImage } from "@/lib/products/featured-image";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ImageUpload } from "@/components/admin/ImageUpload";

type Kind = "veils" | "bridal-robes";

type FormState = {
  name_ar: string;
  description_ar: string;
  price: string;
  category: string;
  color: string;
  size: string;
  material: string;
  stock_quantity: string;
  is_featured: boolean;
  is_available: boolean;
  images: string[];
};

const emptyForm = (kind: Kind): FormState => ({
  name_ar: "",
  description_ar: "",
  price: "",
  category: kind === "veils" ? VEIL_CATEGORY_OPTIONS[0] : "",
  color: "",
  size: "",
  material: "",
  stock_quantity: "1",
  is_featured: false,
  is_available: true,
  images: [],
});

interface ShopProductsManagerProps {
  kind: Kind;
  title: string;
  initialItems: (Veil | BridalRobe)[];
}

const PAGE_SIZE = 8;

export function ShopProductsManager({
  kind,
  title,
  initialItems,
}: ShopProductsManagerProps) {
  const apiPath = kind === "veils" ? "/api/veils" : "/api/bridal-robes";
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState<"all" | "yes" | "no">("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Veil | BridalRobe | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(kind));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (availability === "yes" && !item.is_available) return false;
      if (availability === "no" && item.is_available) return false;
      if (!q) return true;
      return (
        item.name_ar.toLowerCase().includes(q) ||
        (item.color?.toLowerCase().includes(q) ?? false) ||
        (item.material?.toLowerCase().includes(q) ?? false) ||
        ("category" in item &&
          String(item.category).toLowerCase().includes(q))
      );
    });
  }, [items, search, availability]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(kind));
    setError("");
    setOpen(true);
  };

  const openEdit = (item: Veil | BridalRobe) => {
    setEditing(item);
    setForm({
      name_ar: item.name_ar,
      description_ar: item.description_ar,
      price: String(item.price ?? ""),
      category: "category" in item ? String(item.category) : "",
      color: item.color ?? "",
      size: "size" in item ? (item.size ?? "") : "",
      material: item.material ?? "",
      stock_quantity: String(item.stock_quantity ?? 0),
      is_featured: item.is_featured,
      is_available: item.is_available,
      images: item.images ?? [],
    });
    setError("");
    setOpen(true);
  };

  const payload = () => {
    const base = {
      name_ar: form.name_ar.trim(),
      description_ar: form.description_ar.trim(),
      price: Number(form.price || 0),
      images: form.images,
      color: form.color || null,
      material: form.material || null,
      stock_quantity: Number(form.stock_quantity || 0),
      is_featured: form.is_featured,
      is_available: form.is_available,
    };
    if (kind === "veils") {
      return { ...base, category: form.category || "كلاسيكي" };
    }
    return { ...base, size: form.size || null };
  };

  const save = async () => {
    if (!form.name_ar.trim()) {
      setError("الاسم مطلوب");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(apiPath, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editing ? { id: editing.id, ...payload() } : payload()
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل الحفظ");
      if (editing) {
        setItems((prev) => prev.map((i) => (i.id === editing.id ? data : i)));
      } else {
        setItems((prev) => [data, ...prev]);
      }
      setOpen(false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "فشل حفظ المنتج. راجعي اتصال Supabase وجداول المتجر."
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا المنتج؟")) return;
    const res = await fetch(`${apiPath}?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "فشل الحذف");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">{title}</h1>
          <p className="mt-1 text-sm text-muted">
            إدارة كاملة — إضافة، تعديل، حذف، بحث وتصفية
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          إضافة جديد
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Input
          label="بحث"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="الاسم، اللون، الخامة..."
        />
        <Select
          label="التوفر"
          value={availability}
          onChange={(e) => {
            setAvailability(e.target.value as "all" | "yes" | "no");
            setPage(1);
          }}
          options={[
            { value: "all", label: "الكل" },
            { value: "yes", label: "متوفر" },
            { value: "no", label: "غير متوفر" },
          ]}
        />
        <div className="flex items-end text-sm text-muted">
          {filtered.length} منتج
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-beige-dark bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-beige/50 text-muted">
              <tr>
                <th className="px-4 py-3 text-right font-medium">المنتج</th>
                <th className="px-4 py-3 text-right font-medium">السعر</th>
                <th className="px-4 py-3 text-right font-medium">المخزون</th>
                <th className="px-4 py-3 text-right font-medium">الحالة</th>
                <th className="px-4 py-3 text-right font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    لا توجد منتجات
                  </td>
                </tr>
              ) : (
                pageItems.map((item) => (
                  <tr key={item.id} className="border-t border-beige-dark">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-beige">
                          {featuredImage(item.images) && (
                            <Image
                              src={featuredImage(item.images)!}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-charcoal">
                            {item.name_ar}
                          </p>
                          <p className="text-xs text-muted">
                            {item.color || "—"}
                            {"category" in item
                              ? ` · ${item.category}`
                              : "size" in item && item.size
                                ? ` · ${item.size}`
                                : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3" dir="ltr">
                      {formatPrice(Number(item.price))}
                    </td>
                    <td className="px-4 py-3">{item.stock_quantity}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          item.is_available
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {item.is_available ? "متوفر" : "غير متوفر"}
                      </span>
                      {item.is_featured && (
                        <span className="mr-2 rounded-full bg-gold/10 px-2.5 py-1 text-xs text-gold">
                          مميز
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            السابق
          </Button>
          <span className="text-sm text-muted">
            صفحة {page} من {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            التالي
          </Button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editing ? "تعديل المنتج" : "إضافة منتج"}
              </h2>
              <button type="button" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="الاسم *"
                  value={form.name_ar}
                  onChange={(e) =>
                    setForm({ ...form, name_ar: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Textarea
                  label="الوصف"
                  rows={3}
                  value={form.description_ar}
                  onChange={(e) =>
                    setForm({ ...form, description_ar: e.target.value })
                  }
                />
              </div>
              <Input
                label="السعر (₪) *"
                type="number"
                dir="ltr"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
              <Input
                label="الكمية في المخزون"
                type="number"
                dir="ltr"
                value={form.stock_quantity}
                onChange={(e) =>
                  setForm({ ...form, stock_quantity: e.target.value })
                }
              />
              {kind === "veils" ? (
                <Select
                  label="التصنيف"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  options={VEIL_CATEGORY_OPTIONS.map((c) => ({
                    value: c,
                    label: c,
                  }))}
                />
              ) : (
                <Select
                  label="المقاس"
                  value={form.size}
                  onChange={(e) => setForm({ ...form, size: e.target.value })}
                  options={[
                    { value: "", label: "—" },
                    ...DRESS_SIZES.map((s) => ({ value: s, label: s })),
                  ]}
                />
              )}
              <Select
                label="اللون"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                options={[
                  { value: "", label: "—" },
                  ...DRESS_COLORS.map((c) => ({ value: c, label: c })),
                ]}
              />
              <Input
                label="الخامة / Material"
                value={form.material}
                onChange={(e) =>
                  setForm({ ...form, material: e.target.value })
                }
              />
              <div className="sm:col-span-2">
                <ImageUpload
                  value={form.images}
                  onChange={(images) => setForm({ ...form, images })}
                />
              </div>
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
            </div>

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <Button loading={saving} onClick={save}>
                حفظ
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
