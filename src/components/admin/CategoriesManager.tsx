"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { resolveCategoryLabel } from "@/lib/i18n/category-labels";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Eye, EyeOff, Pencil, Plus, X } from "lucide-react";
import {
  buildCategoryTree,
  slugifyCategory,
  type Category,
} from "@/types/category";
import type { ListVisibility } from "@/lib/admin/lifecycle-types";
import { filterLifecycleRows } from "@/lib/admin/query-lifecycle";
import type { LifecycleCapabilities } from "@/lib/admin/permissions";
import { notifyAdminCategoriesChanged } from "@/lib/admin/category-events";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { RowLifecycleActions } from "@/components/admin/lifecycle/RowLifecycleActions";
import { VisibilityFilter } from "@/components/admin/lifecycle/VisibilityFilter";

type CategoryRow = Category & {
  is_deleted?: boolean | null;
  archived_at?: string | null;
};

interface CategoriesManagerProps {
  initialCategories: Category[];
}

const emptyForm = {
  name_ar: "",
  name_en: "",
  name_he: "",
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

/** accessories_group is container-only; leaf rows stay product-assignable. */
function coerceLeafProductKind(
  productKind: string,
  parentId: string
): string {
  if (productKind === "accessories_group" && parentId) return "dress";
  return productKind || "dress";
}

export function CategoriesManager({ initialCategories }: CategoriesManagerProps) {
  const { t, locale, dir } = useLocale();
  const c = t.admin.categoriesUi;
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryRow[]>(initialCategories);
  const [categoriesProp, setCategoriesProp] = useState(initialCategories);
  if (initialCategories !== categoriesProp) {
    setCategoriesProp(initialCategories);
    setCategories(initialCategories);
  }
  const [visibility, setVisibility] = useState<ListVisibility>("active");
  const [caps, setCaps] = useState<LifecycleCapabilities | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
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

  const visibleCategories = useMemo(
    () => filterLifecycleRows(categories, visibility),
    [categories, visibility]
  );

  const tree = useMemo(
    () => buildCategoryTree(visibleCategories),
    [visibleCategories]
  );

  const parentOptions = useMemo(() => {
    const opts = [{ value: "", label: c.noParent }];
    for (const cat of categories) {
      if (editing && cat.id === editing.id) continue;
      opts.push({ value: cat.id, label: resolveCategoryLabel(cat, locale) });
    }
    return opts;
  }, [categories, editing, c.noParent, locale]);

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
      name_en: item.name_en ?? "",
      name_he: item.name_he ?? "",
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
      setError(c.nameSlugRequired);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const body = {
        name_ar: form.name_ar.trim(),
        name_en: form.name_en.trim() || null,
        name_he: form.name_he.trim() || null,
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
        product_kind: coerceLeafProductKind(
          form.product_kind,
          form.parent_id
        ),
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
      if (!res.ok) throw new Error(data.error ?? c.saveFailed);

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
      setError(e instanceof Error ? e.message : c.genericError);
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
      alert(data.error ?? c.visibilityFailed);
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === item.id ? data : c)));
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
              <p className="font-medium text-charcoal">
                {resolveCategoryLabel(node, locale)}
              </p>
              <p className="text-xs text-muted" dir="ltr">
                {node.slug}
                {node.href ? ` · ${node.href}` : ""}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-muted">
          {node.parent_id
            ? (() => {
                const parent = categories.find((cat) => cat.id === node.parent_id);
                return parent
                  ? resolveCategoryLabel(parent, locale)
                  : "—";
              })()
            : c.root}
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
            {node.is_visible ? c.visible : c.hidden}
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
              aria-label={c.edit}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <RowLifecycleActions
              module="categories"
              id={node.id}
              archived={Boolean(
                (node as CategoryRow).archived_at
              )}
              allowArchive={caps?.canArchive ?? false}
              allowRestore={caps?.canRestore ?? false}
              allowSoftDelete={caps?.canSoftDelete ?? false}
              onChanged={(kind) => {
                if (kind === "soft_delete") {
                  setCategories((prev) =>
                    prev.filter((cat) => cat.id !== node.id)
                  );
                  notifyAdminCategoriesChanged();
                  return;
                }
                setCategories((prev) =>
                  prev.map((cat) =>
                    cat.id === node.id
                      ? {
                          ...cat,
                          archived_at:
                            kind === "archive"
                              ? new Date().toISOString()
                              : null,
                        }
                      : cat
                  )
                );
                notifyAdminCategoriesChanged();
              }}
              onError={(msg) => alert(msg)}
            />
          </div>
        </td>
      </tr>,
      ...renderRows(node.children, depth + 1),
    ]);

  return (
    <div className="space-y-6" dir={dir}>
      <div>
        <h1 className="text-3xl font-bold text-charcoal">{c.pageTitle}</h1>
        <p className="mt-2 text-muted">{c.pageSubtitle}</p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-sm text-muted">
            {t.admin.productsUi.visibility}
          </p>
          <VisibilityFilter value={visibility} onChange={setVisibility} />
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {c.addCategory}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-beige-dark bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-right">
          <thead className="bg-beige/60 text-sm text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{c.colCategory}</th>
              <th className="px-4 py-3 font-medium">{c.colParent}</th>
              <th className="px-4 py-3 font-medium">{c.colOrder}</th>
              <th className="px-4 py-3 font-medium">{c.colVisibility}</th>
              <th className="px-4 py-3 font-medium">{c.colCover}</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {visibleCategories.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                  {c.empty}
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
                {editing ? c.editCategory : c.newCategory}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                className="rounded-lg p-2 hover:bg-beige"
                aria-label={c.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <Input
                label={c.nameAr}
                value={form.name_ar}
                onChange={(e) => setName(e.target.value)}
                placeholder={c.namePlaceholder}
              />
              <Input
                label={c.nameHe}
                value={form.name_he}
                onChange={(e) => setForm((p) => ({ ...p, name_he: e.target.value }))}
                placeholder="קולקציה חדשה"
              />
              <Input
                label={c.nameEn}
                value={form.name_en}
                onChange={(e) => setForm((p) => ({ ...p, name_en: e.target.value }))}
                placeholder="New collection"
                dir="ltr"
              />
              <Input
                label={c.slug}
                value={form.slug}
                dir="ltr"
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((p) => ({ ...p, slug: e.target.value }));
                }}
                placeholder="veils"
              />
              <Select
                label={c.parent}
                options={parentOptions}
                value={form.parent_id}
                onChange={(e) => setForm((p) => ({ ...p, parent_id: e.target.value }))}
              />
              <Input
                label={c.sortOrder}
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))}
              />
              <Input
                label={c.href}
                value={form.href}
                dir="ltr"
                onChange={(e) => setForm((p) => ({ ...p, href: e.target.value }))}
                placeholder="/veils"
              />
              <Select
                label={c.productKind}
                value={form.product_kind}
                onChange={(e) =>
                  setForm((p) => ({ ...p, product_kind: e.target.value }))
                }
                options={[
                  { value: "dress", label: c.kindDress },
                  { value: "veil", label: c.kindVeil },
                  { value: "bridal_robe", label: c.kindRobe },
                  { value: "accessories_group", label: c.kindAccessories },
                ]}
              />
              <div className="space-y-3 rounded-xl border border-beige-dark/70 bg-beige/30 p-4">
                <p className="text-sm font-medium text-charcoal">{c.displaySettings}</p>
                <label className="flex items-center gap-3 text-sm text-charcoal">
                  <input
                    type="checkbox"
                    checked={form.is_visible}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, is_visible: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-beige-dark text-gold focus:ring-gold"
                  />
                  {c.published}
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
                  {c.inNav}
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
                  {c.onHomepage}
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
                  {c.featuredCollection}
                </label>
              </div>
              <Textarea
                label={c.description}
                rows={4}
                value={form.description_ar}
                onChange={(e) => setForm((p) => ({ ...p, description_ar: e.target.value }))}
                placeholder={c.descriptionPlaceholder}
                className="min-h-[96px] resize-y whitespace-pre-wrap"
              />
              <Input
                label={c.seoTitle}
                value={form.seo_title_ar}
                onChange={(e) =>
                  setForm((p) => ({ ...p, seo_title_ar: e.target.value }))
                }
                placeholder={c.seoTitlePlaceholder}
              />
              <Textarea
                label={c.seoDescription}
                rows={3}
                value={form.seo_description_ar}
                onChange={(e) =>
                  setForm((p) => ({ ...p, seo_description_ar: e.target.value }))
                }
                placeholder={c.seoDescriptionPlaceholder}
                className="min-h-[72px] resize-y"
              />
              <div>
                <p className="mb-2 text-sm font-medium text-charcoal">{c.customIcon}</p>
                <ImageUpload
                  multiple={false}
                  value={form.icon_url ? [form.icon_url] : []}
                  onChange={(urls) => setForm((p) => ({ ...p, icon_url: urls[0] ?? "" }))}
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-charcoal">{c.coverImage}</p>
                <ImageUpload
                  multiple={false}
                  value={form.cover_image_url ? [form.cover_image_url] : []}
                  onChange={(urls) =>
                    setForm((p) => ({ ...p, cover_image_url: urls[0] ?? "" }))
                  }
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-charcoal">{c.ogImage}</p>
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
                  {saving ? c.saving : c.save}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                  disabled={saving}
                >
                  {c.cancel}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
