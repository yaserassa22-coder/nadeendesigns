"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import type { Dress } from "@/types";
import type { Category } from "@/types/category";
import { isDressProductCategory } from "@/types/category";
import { DRESS_COLORS, DRESS_SIZES, DRESS_STYLES } from "@/lib/constants";
import { getDressColorLabel } from "@/lib/colors";
import { getDressStyleLabel } from "@/lib/styles";
import type { ListVisibility } from "@/lib/admin/lifecycle-types";
import { filterLifecycleRows } from "@/lib/admin/query-lifecycle";
import { formatPrice } from "@/lib/utils";
import { featuredImage } from "@/lib/products/featured-image";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { RowLifecycleActions } from "@/components/admin/lifecycle/RowLifecycleActions";
import { VisibilityFilter } from "@/components/admin/lifecycle/VisibilityFilter";

type DressFormState = {
  name_ar: string;
  description_ar: string;
  category_id: string;
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

const emptyForm = (categoryId = ""): DressFormState => ({
  name_ar: "",
  description_ar: "",
  category_id: categoryId,
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

function resolveDressCategoryId(
  dress: Dress,
  categories: Category[]
): string {
  if (dress.category_id) {
    const byId = categories.find((c) => c.id === dress.category_id);
    if (byId) return byId.id;
  }
  const key = dress.category?.trim().toLowerCase();
  if (!key) return categories[0]?.id ?? "";
  const match = categories.find(
    (c) =>
      c.legacy_key?.toLowerCase() === key ||
      c.slug?.toLowerCase() === key ||
      (key === "wedding_dress" && c.legacy_key === "wedding") ||
      (key === "nouf_dress" && c.legacy_key === "nouf_dresses")
  );
  return match?.id ?? categories[0]?.id ?? "";
}

function toForm(dress: Dress, categories: Category[]): DressFormState {
  return {
    name_ar: dress.name_ar,
    description_ar: dress.description_ar,
    category_id: resolveDressCategoryId(dress, categories),
    price: dress.price?.toString() ?? "",
    rental_price: dress.rental_price?.toString() ?? "",
    size: dress.size ?? "",
    color: getDressColorLabel(dress.color) || "",
    style: getDressStyleLabel(dress.style) || "",
    is_featured: dress.is_featured,
    is_available: dress.is_available,
    images: dress.images ?? [],
    imageUrlInput: "",
  };
}

function labelForCategory(
  dress: Dress,
  categories: Category[]
): string {
  const id = resolveDressCategoryId(dress, categories);
  return categories.find((c) => c.id === id)?.name_ar ?? dress.category ?? "—";
}

interface DressesManagerProps {
  initialDresses: Dress[];
  initialCategories: Category[];
  /** Filter / lock by category id (preferred) */
  initialCategoryFilter?: string | "all";
  lockedCategoryId?: string;
  /** @deprecated legacy_key lock — resolved against initialCategories */
  lockedCategory?: string;
}

export function DressesManager({
  initialDresses,
  initialCategories,
  initialCategoryFilter = "all",
  lockedCategoryId,
  lockedCategory,
}: DressesManagerProps) {
  const [dresses, setDresses] = useState(initialDresses);
  const [categories, setCategories] = useState(initialCategories);
  const [search, setSearch] = useState("");

  const dressCategories = useMemo(
    () =>
      categories.filter(
        (c) => isDressProductCategory(c) && c.is_visible !== false
      ),
    [categories]
  );

  const resolvedLockId = useMemo(() => {
    if (lockedCategoryId) return lockedCategoryId;
    if (!lockedCategory) return undefined;
    return (
      dressCategories.find(
        (c) =>
          c.legacy_key === lockedCategory ||
          c.slug === lockedCategory ||
          c.id === lockedCategory
      )?.id ?? undefined
    );
  }, [lockedCategoryId, lockedCategory, dressCategories]);

  const [categoryFilter, setCategoryFilter] = useState<string | "all">(
    resolvedLockId ?? initialCategoryFilter
  );
  const [availabilityFilter, setAvailabilityFilter] = useState<
    "all" | "yes" | "no"
  >("all");
  const [featuredFilter, setFeaturedFilter] = useState<"all" | "yes" | "no">(
    "all"
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Dress | null>(null);
  const [form, setForm] = useState<DressFormState>(
    emptyForm(resolvedLockId ?? dressCategories[0]?.id ?? "")
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [visibility, setVisibility] = useState<ListVisibility>("active");

  const refetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) return;
      const data = (await res.json()) as Category[];
      if (Array.isArray(data)) setCategories(data);
    } catch {
      /* keep current */
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visible = filterLifecycleRows(
      dresses as Array<
        Dress & { is_deleted?: boolean | null; archived_at?: string | null }
      >,
      visibility
    );
    return visible.filter((d) => {
      const effectiveCategory = resolvedLockId ?? categoryFilter;
      if (effectiveCategory !== "all") {
        const dressCatId = resolveDressCategoryId(d, dressCategories);
        if (dressCatId !== effectiveCategory && d.category !== effectiveCategory) {
          return false;
        }
      }
      if (availabilityFilter === "yes" && !d.is_available) return false;
      if (availabilityFilter === "no" && d.is_available) return false;
      if (featuredFilter === "yes" && !d.is_featured) return false;
      if (featuredFilter === "no" && d.is_featured) return false;
      if (!q) return true;
      const label = labelForCategory(d, dressCategories).toLowerCase();
      return (
        d.name_ar.toLowerCase().includes(q) ||
        label.includes(q) ||
        (d.style?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [
    dresses,
    visibility,
    search,
    categoryFilter,
    resolvedLockId,
    availabilityFilter,
    featuredFilter,
    dressCategories,
  ]);

  const openCreate = () => {
    setEditing(null);
    const defaultCategory =
      resolvedLockId ??
      (categoryFilter !== "all" ? categoryFilter : dressCategories[0]?.id ?? "");
    setForm(emptyForm(defaultCategory));
    setError("");
    void refetchCategories();
    setOpen(true);
  };

  const openEdit = (dress: Dress) => {
    setEditing(dress);
    setForm(toForm(dress, dressCategories));
    setError("");
    void refetchCategories();
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditing(null);
    setError("");
  };

  const payload = () => ({
    name_ar: form.name_ar.trim(),
    description_ar: form.description_ar.replace(/^\s+|\s+$/g, ""),
    category_id: resolvedLockId ?? form.category_id,
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
    if (!(resolvedLockId ?? form.category_id)) {
      setError("التصنيف مطلوب");
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
      if (!res.ok) {
        console.error("[DressesManager] save failed", {
          status: res.status,
          data,
        });
        throw new Error(data.error ?? "فشل الحفظ");
      }

      if (editing) {
        setDresses((prev) => prev.map((d) => (d.id === editing.id ? data : d)));
      } else {
        setDresses((prev) => [data, ...prev]);
      }
      close();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "فشل حفظ الفستان. راجعي اتصال Supabase ورفع الصور."
      );
    } finally {
      setSaving(false);
    }
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

  const lockedLabel =
    dressCategories.find((c) => c.id === resolvedLockId)?.name_ar ?? "تصنيف مقفل";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Input
            label="بحث"
            placeholder="بحث عن فستان..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {!resolvedLockId && (
            <Select
              label="تصفية حسب التصنيف"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as string | "all")
              }
              options={[
                { value: "all", label: "كل التصنيفات" },
                ...dressCategories.map((c) => ({
                  value: c.id,
                  label: c.name_ar,
                })),
              ]}
            />
          )}
          <Select
            label="التوفر"
            value={availabilityFilter}
            onChange={(e) =>
              setAvailabilityFilter(e.target.value as "all" | "yes" | "no")
            }
            options={[
              { value: "all", label: "الكل" },
              { value: "yes", label: "متوفر" },
              { value: "no", label: "غير متوفر" },
            ]}
          />
          <Select
            label="مميز"
            value={featuredFilter}
            onChange={(e) =>
              setFeaturedFilter(e.target.value as "all" | "yes" | "no")
            }
            options={[
              { value: "all", label: "الكل" },
              { value: "yes", label: "مميز" },
              { value: "no", label: "غير مميز" },
            ]}
          />
          <div>
            <p className="mb-1.5 text-sm text-muted">العرض</p>
            <VisibilityFilter value={visibility} onChange={setVisibility} />
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {resolvedLockId && lockedCategory === "nouf_dresses"
            ? "إضافة فستان نوف"
            : "إضافة منتج"}
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
                          {featuredImage(dress.images) && (
                            <Image
                              src={featuredImage(dress.images)!}
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
                            <p className="text-xs text-muted">
                              {getDressStyleLabel(dress.style)}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {labelForCategory(dress, dressCategories)}
                    </td>
                    <td className="px-4 py-3" dir="ltr">
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
                        <RowLifecycleActions
                          module="dresses"
                          id={dress.id}
                          archived={Boolean(
                            (dress as Dress & { archived_at?: string | null })
                              .archived_at
                          )}
                          onChanged={(kind) => {
                            if (kind === "soft_delete") {
                              setDresses((prev) =>
                                prev.filter((d) => d.id !== dress.id)
                              );
                              return;
                            }
                            setDresses((prev) =>
                              prev.map((d) =>
                                d.id === dress.id
                                  ? ({
                                      ...d,
                                      archived_at:
                                        kind === "archive"
                                          ? new Date().toISOString()
                                          : null,
                                    } as Dress)
                                  : d
                              )
                            );
                          }}
                          onError={(msg) => alert(msg)}
                        />
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
              {resolvedLockId ? (
                <Input label="التصنيف" value={lockedLabel} disabled />
              ) : (
                <Select
                  label="التصنيف"
                  value={form.category_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      category_id: e.target.value,
                    })
                  }
                  options={dressCategories.map((c) => ({
                    value: c.id,
                    label: c.name_ar,
                  }))}
                />
              )}
              <Input
                label="السعر (₪)"
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                dir="ltr"
              />
              <Input
                label="سعر الإيجار (₪)"
                type="number"
                value={form.rental_price}
                onChange={(e) =>
                  setForm({ ...form, rental_price: e.target.value })
                }
                dir="ltr"
              />
              <Select
                label="النمط"
                value={form.style}
                onChange={(e) => setForm({ ...form, style: e.target.value })}
                dir="rtl"
                options={[
                  { value: "", label: "— اختاري النمط —" },
                  ...DRESS_STYLES.map((s) => ({ value: s, label: s })),
                ]}
              />
              <Select
                label="اللون"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                dir="rtl"
                options={[
                  { value: "", label: "— اختاري اللون —" },
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
                  rows={10}
                  value={form.description_ar}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description_ar: e.target.value }))
                  }
                  placeholder="وصف المنتج… Enter لسطر جديد (عربي / English) — بدون حد للطول"
                  className="min-h-[12rem] resize-y whitespace-pre-wrap font-normal"
                />
                <p className="mt-1 text-xs text-muted">
                  وصف غير محدود الطول. يُحفظ التنسيق (الأسطر الجديدة) ويظهر كما هو
                  في صفحة المنتج.
                </p>
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
