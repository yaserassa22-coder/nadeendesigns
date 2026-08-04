"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  buildCategoryTree,
  slugifyCategory,
  type Category,
} from "@/types/category";
import { notifyAdminCategoriesChanged } from "@/lib/admin/category-events";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface CategoriesManagerProps {
  initialCategories: Category[];
}

const emptyForm = {
  name_ar: "",
  slug: "",
  parent_id: "" as string,
  sort_order: "0",
  is_visible: true,
  visible_in_navigation: true,
  show_on_homepage: true,
  featured_collection: false,
  icon_url: "" as string,
  cover_image_url: "" as string,
  description_ar: "",
  href: "",
  product_kind: "dress" as string,
  seo_title_ar: "",
  seo_description_ar: "",
  seo_og_image_url: "" as string,
};

export function CategoriesManager({ initialCategories }: CategoriesManagerProps) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [categoriesProp, setCategoriesProp] = useState(initialCategories);
  if (initialCategories !== categoriesProp) {
    setCategoriesProp(initialCategories);
    setCategories(initialCategories);
  }
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const tree = useMemo(() => buildCategoryTree(categories), [categories]);

  const parentOptions = useMemo(() => {
    const opts = [{ value: "", label: "— بدون أب (تصنيف رئيسي) —" }];
    for (const c of categories) {
      if (editing && c.id === editing.id) continue;
      opts.push({ value: c.id, label: c.name_ar });
    }
    return opts;
  }, [categories, editing]);

  const reset = () => {
    setEditing(null);
    setForm(emptyForm);
    setSlugTouched(false);
    setError("");
  };

  const openCreate = () => {
    reset();
    setOpen(true);
  };

  const openEdit = (item: Category) => {
    setEditing(item);
    setForm({
      name_ar: item.name_ar,
      slug: item.slug,
      parent_id: item.parent_id ?? "",
      sort_order: String(item.sort_order),
      is_visible: item.is_visible,
      visible_in_navigation: item.visible_in_navigation !== false,
      show_on_homepage: item.show_on_homepage !== false,
      featured_collection: item.featured_collection === true,
      icon_url: item.icon_url ?? "",
      cover_image_url: item.cover_image_url ?? "",
      description_ar: item.description_ar ?? "",
      href: item.href ?? "",
      product_kind: item.product_kind ?? "dress",
      seo_title_ar: item.seo_title_ar ?? "",
      seo_description_ar: item.seo_description_ar ?? "",
      seo_og_image_url: item.seo_og_image_url ?? "",
    });
    setSlugTouched(true);
    setError("");
    setOpen(true);
  };

  const setName = (name_ar: string) => {
    setForm((prev) => ({
      ...prev,
      name_ar,
      slug: slugTouched ? prev.slug : slugifyCategory(name_ar) || prev.slug,
    }));
  };

  const save = async () => {
    if (!form.name_ar.trim() || !form.slug.trim()) {
      setError("الاسم والمعرّف مطلوبان");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const body = {
        name_ar: form.name_ar.trim(),
        slug: form.slug.trim().toLowerCase(),
        parent_id: form.parent_id || null,
        sort_order: Number(form.sort_order) || 0,
        is_visible: form.is_visible,
        visible_in_navigation: form.visible_in_navigation,
        show_on_homepage: form.show_on_homepage,
        featured_collection: form.featured_collection,
        icon_url: form.icon_url || null,
        cover_image_url: form.cover_image_url || null,
        description_ar: form.description_ar,
        href: form.href.trim() || `/${form.slug.trim().toLowerCase()}`,
        product_kind: form.product_kind || "dress",
        seo_title_ar: form.seo_title_ar.trim() || null,
        seo_description_ar: form.seo_description_ar.trim() || null,
        seo_og_image_url: form.seo_og_image_url || null,
      };
      const res = await fetch("/api/categories", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...body } : body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل الحفظ");

      if (editing) {
        setCategories((prev) => prev.map((c) => (c.id === editing.id ? data : c)));
      } else {
        setCategories((prev) => [...prev, data]);
      }
      setOpen(false);
      reset();
      // Refresh RSC payloads so Admin → Products Create sees the new category.
      router.refresh();
      notifyAdminCategoriesChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (item: Category) => {
    const res = await fetch("/api/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, is_visible: !item.is_visible }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "فشل تحديث الظهور");
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === item.id ? data : c)));
    notifyAdminCategoriesChanged();
  };

  const remove = async (item: Category) => {
    if (!confirm(`نقل التصنيف «${item.name_ar}» إلى سلة المحذوفات؟`)) return;
    const res = await fetch(`/api/categories?id=${item.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "فشل الحذف");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== item.id));
    notifyAdminCategoriesChanged();
  };

  const renderRows = (
    nodes: ReturnType<typeof buildCategoryTree>,
    depth = 0
  ): ReactNode[] =>
    nodes.flatMap((node) => [
      <tr key={node.id} className="border-t border-beige-dark/60">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3" style={{ paddingInlineStart: depth * 20 }}>
            {node.icon_url ? (
              <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-beige-dark bg-beige">
                <Image src={node.icon_url} alt="" fill className="object-cover" sizes="36px" />
              </span>
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-beige-dark text-xs text-muted">
                —
              </span>
            )}
            <div>
              <p className="font-medium text-charcoal">{node.name_ar}</p>
              <p className="text-xs text-muted" dir="ltr">
                {node.slug}
                {node.href ? ` · ${node.href}` : ""}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-muted">
          {node.parent_id
            ? categories.find((c) => c.id === node.parent_id)?.name_ar ?? "—"
            : "رئيسي"}
        </td>
        <td className="px-4 py-3 text-sm text-charcoal">{node.sort_order}</td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => toggleVisibility(node)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
              node.is_visible
                ? "bg-emerald-50 text-emerald-700"
                : "bg-stone-100 text-stone-500"
            }`}
          >
            {node.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {node.is_visible ? "ظاهر" : "مخفي"}
          </button>
        </td>
        <td className="px-4 py-3">
          {node.cover_image_url ? (
            <span className="relative inline-block h-10 w-16 overflow-hidden rounded-md border border-beige-dark">
              <Image
                src={node.cover_image_url}
                alt=""
                fill
                className="object-cover"
                sizes="64px"
              />
            </span>
          ) : (
            <span className="text-xs text-muted">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => openEdit(node)}
              className="rounded-lg p-2 text-gold hover:bg-gold/10"
              aria-label="تعديل"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => remove(node)}
              className="rounded-lg p-2 text-red-500 hover:bg-red-50"
              aria-label="حذف"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>,
      ...renderRows(node.children, depth + 1),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          إضافة تصنيف
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-beige-dark bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-right">
          <thead className="bg-beige/60 text-sm text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">التصنيف</th>
              <th className="px-4 py-3 font-medium">الأب</th>
              <th className="px-4 py-3 font-medium">الترتيب</th>
              <th className="px-4 py-3 font-medium">الظهور</th>
              <th className="px-4 py-3 font-medium">الغلاف</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                  لا توجد تصنيفات بعد
                </td>
              </tr>
            ) : (
              renderRows(tree)
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-charcoal">
                {editing ? "تعديل التصنيف" : "تصنيف جديد"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                className="rounded-lg p-2 hover:bg-beige"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <Input
                label="الاسم"
                value={form.name_ar}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: طرحة العروس"
              />
              <Input
                label="المعرّف (slug)"
                value={form.slug}
                dir="ltr"
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((p) => ({ ...p, slug: e.target.value }));
                }}
                placeholder="veils"
              />
              <Select
                label="التصنيف الأب"
                options={parentOptions}
                value={form.parent_id}
                onChange={(e) => setForm((p) => ({ ...p, parent_id: e.target.value }))}
              />
              <Input
                label="ترتيب العرض"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))}
              />
              <Input
                label="مسار الصفحة (اختياري)"
                value={form.href}
                dir="ltr"
                onChange={(e) => setForm((p) => ({ ...p, href: e.target.value }))}
                placeholder="/veils"
              />
              <Select
                label="نوع المنتج"
                value={form.product_kind}
                onChange={(e) =>
                  setForm((p) => ({ ...p, product_kind: e.target.value }))
                }
                options={[
                  { value: "dress", label: "فساتين" },
                  { value: "veil", label: "طرحة العروس" },
                  { value: "bridal_robe", label: "برنص العروس" },
                  { value: "accessories_group", label: "مجموعة اكسسوارات" },
                ]}
              />
              <div className="space-y-3 rounded-xl border border-beige-dark/70 bg-beige/30 p-4">
                <p className="text-sm font-medium text-charcoal">إعدادات العرض</p>
                <label className="flex items-center gap-3 text-sm text-charcoal">
                  <input
                    type="checkbox"
                    checked={form.is_visible}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, is_visible: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-beige-dark text-gold focus:ring-gold"
                  />
                  منشور (ظاهر في الموقع)
                </label>
                <label className="flex items-center gap-3 text-sm text-charcoal">
                  <input
                    type="checkbox"
                    checked={form.visible_in_navigation}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        visible_in_navigation: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-beige-dark text-gold focus:ring-gold"
                  />
                  ظاهر في قائمة التنقل
                </label>
                <label className="flex items-center gap-3 text-sm text-charcoal">
                  <input
                    type="checkbox"
                    checked={form.show_on_homepage}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        show_on_homepage: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-beige-dark text-gold focus:ring-gold"
                  />
                  ظاهر في الصفحة الرئيسية
                </label>
                <label className="flex items-center gap-3 text-sm text-charcoal">
                  <input
                    type="checkbox"
                    checked={form.featured_collection}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        featured_collection: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-beige-dark text-gold focus:ring-gold"
                  />
                  مجموعة مميزة (تمييز في الرئيسية)
                </label>
              </div>
              <Textarea
                label="الوصف"
                rows={4}
                value={form.description_ar}
                onChange={(e) => setForm((p) => ({ ...p, description_ar: e.target.value }))}
                placeholder="وصف اختياري للتصنيف…"
                className="min-h-[96px] resize-y whitespace-pre-wrap"
              />
              <Input
                label="عنوان SEO (اختياري)"
                value={form.seo_title_ar}
                onChange={(e) =>
                  setForm((p) => ({ ...p, seo_title_ar: e.target.value }))
                }
                placeholder="يُستخدم في عنوان الصفحة إن وُجد"
              />
              <Textarea
                label="وصف SEO (اختياري)"
                rows={3}
                value={form.seo_description_ar}
                onChange={(e) =>
                  setForm((p) => ({ ...p, seo_description_ar: e.target.value }))
                }
                placeholder="وصف محركات البحث / Open Graph"
                className="min-h-[72px] resize-y"
              />
              <div>
                <p className="mb-2 text-sm font-medium text-charcoal">أيقونة مخصصة</p>
                <ImageUpload
                  multiple={false}
                  value={form.icon_url ? [form.icon_url] : []}
                  onChange={(urls) => setForm((p) => ({ ...p, icon_url: urls[0] ?? "" }))}
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-charcoal">صورة الغلاف</p>
                <ImageUpload
                  multiple={false}
                  value={form.cover_image_url ? [form.cover_image_url] : []}
                  onChange={(urls) =>
                    setForm((p) => ({ ...p, cover_image_url: urls[0] ?? "" }))
                  }
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-charcoal">صورة Open Graph (اختياري)</p>
                <ImageUpload
                  multiple={false}
                  value={form.seo_og_image_url ? [form.seo_og_image_url] : []}
                  onChange={(urls) =>
                    setForm((p) => ({ ...p, seo_og_image_url: urls[0] ?? "" }))
                  }
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3 pt-2">
                <Button onClick={save} disabled={saving} className="flex-1">
                  {saving ? "جارٍ الحفظ…" : "حفظ"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                  disabled={saving}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
