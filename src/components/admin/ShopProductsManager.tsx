"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n";
import { resolveCatalogLabel } from "@/lib/i18n/category-labels";
import { resolveDressColorLabel } from "@/lib/i18n/attribute-labels";
import { localizedName } from "@/lib/i18n/localize";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Copy, Pencil, Plus, X } from "lucide-react";
import type { AccessoryItem, BridalRobe, Veil } from "@/types/shop";
import { VEIL_CATEGORY_OPTIONS } from "@/types/shop";
import { DRESS_COLORS, DRESS_SIZES } from "@/lib/constants";
import type { ListVisibility } from "@/lib/admin/lifecycle-types";
import { filterLifecycleRows } from "@/lib/admin/query-lifecycle";
import { postLifecycle } from "@/lib/admin/lifecycle-client";
import { formatPrice } from "@/lib/utils";
import { featuredImage } from "@/lib/products/featured-image";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { useAdminCapabilities } from "@/hooks/useAdminCapabilities";
import { RowLifecycleActions } from "@/components/admin/lifecycle/RowLifecycleActions";
import { VisibilityFilter } from "@/components/admin/lifecycle/VisibilityFilter";
import { ExperienceDesignerPanel } from "@/components/admin/product-editor/ExperienceDesignerPanel";
import { ProductFeaturesPanel } from "@/components/admin/product-editor/ProductFeaturesPanel";
import {
  defaultProductExperienceConfig,
  normalizeProductExperienceConfig,
  type ProductExperienceConfig,
} from "@/lib/products/experience-designer";
import {
  normalizeProductFeaturesConfig,
  type ProductFeaturesConfig,
} from "@/lib/products/experience-features";

type Kind = "veils" | "bridal-robes" | "accessory-item";

type ShopItem = Veil | BridalRobe | AccessoryItem;

type FormState = {
  name_ar: string;
  description_ar: string;
  price: string;
  sale_price: string;
  category: string;
  color: string;
  size: string;
  material: string;
  stock_quantity: string;
  is_featured: boolean;
  is_available: boolean;
  images: string[];
  experience_config: ProductExperienceConfig;
  features_config: ProductFeaturesConfig | null;
};

const emptyForm = (kind: Kind): FormState => ({
  name_ar: "",
  description_ar: "",
  price: "",
  sale_price: "",
  category: kind === "veils" ? VEIL_CATEGORY_OPTIONS[0] : "",
  color: "",
  size: "",
  material: "",
  stock_quantity: "1",
  is_featured: false,
  is_available: true,
  images: [],
  experience_config: defaultProductExperienceConfig(),
  features_config: null,
});

interface ShopProductsManagerProps {
  kind: Kind;
  title: string;
  initialItems: ShopItem[];
  /** Required when kind === "accessory-item" — scopes create/list to this category. */
  categoryId?: string;
}

const PAGE_SIZE = 8;

export function ShopProductsManager({
  kind,
  title,
  initialItems,
  categoryId,
}: ShopProductsManagerProps) {
  const { t, locale } = useLocale();
  const p = t.admin.productsUi;
  const { caps } = useAdminCapabilities();
  const apiPath =
    kind === "veils"
      ? "/api/veils"
      : kind === "bridal-robes"
        ? "/api/bridal-robes"
        : "/api/accessory-items";
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState<"all" | "yes" | "no">("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"general" | "experience" | "features">(
    "general"
  );
  const [editing, setEditing] = useState<ShopItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(kind));
  const [saving, setSaving] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [visibility, setVisibility] = useState<ListVisibility>("active");
  const lifecycleModule =
    kind === "veils"
      ? "veils"
      : kind === "bridal-robes"
        ? "bridal_robes"
        : "accessory_items";
  const duplicateApiPath = `${apiPath}/duplicate`;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visible = filterLifecycleRows(
      items as Array<
        ShopItem & {
          is_deleted?: boolean | null;
          archived_at?: string | null;
        }
      >,
      visibility
    );
    return visible.filter((item) => {
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
  }, [items, search, availability, visibility]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(kind));
    setError("");
    setNotice("");
    setTab("general");
    setOpen(true);
  };

  const openEdit = (item: ShopItem) => {
    setEditing(item);
    setForm({
      name_ar: item.name_ar,
      description_ar: item.description_ar,
      price: String(item.price ?? ""),
      sale_price:
        item.sale_price != null && item.sale_price !== undefined
          ? String(item.sale_price)
          : "",
      category: "category" in item ? String(item.category) : "",
      color: item.color ?? "",
      size: "size" in item ? (item.size ?? "") : "",
      material: item.material ?? "",
      stock_quantity: String(item.stock_quantity ?? 0),
      is_featured: item.is_featured,
      is_available: item.is_available,
      images: item.images ?? [],
      experience_config: normalizeProductExperienceConfig(item.experience_config),
      features_config: normalizeProductFeaturesConfig(item.features_config),
    });
    setError("");
    setNotice("");
    setTab("general");
    setOpen(true);
  };

  const applyItemToForm = (item: ShopItem) => {
    setForm({
      name_ar: item.name_ar,
      description_ar: item.description_ar,
      price: String(item.price ?? ""),
      sale_price:
        item.sale_price != null && item.sale_price !== undefined
          ? String(item.sale_price)
          : "",
      category: "category" in item ? String(item.category) : "",
      color: item.color ?? "",
      size: "size" in item ? (item.size ?? "") : "",
      material: item.material ?? "",
      stock_quantity: String(item.stock_quantity ?? 0),
      is_featured: item.is_featured,
      is_available: item.is_available,
      images: [...(item.images ?? [])],
      experience_config: normalizeProductExperienceConfig(item.experience_config),
      features_config: normalizeProductFeaturesConfig(item.features_config),
    });
  };

  const duplicateProduct = async (item: ShopItem) => {
    setDuplicatingId(item.id);
    setError("");
    try {
      const res = await fetch(duplicateApiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const data = (await res.json()) as {
        product?: ShopItem;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.product) {
        throw new Error(data.error ?? p.duplicateFailed);
      }
      const product = data.product;
      setItems((prev) => [product, ...prev.filter((i) => i.id !== product.id)]);
      setEditing(product);
      applyItemToForm(product);
      setNotice(data.message || p.duplicateSuccess);
      setOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : p.duplicateFailed;
      setError(msg);
      if (!open) alert(msg);
    } finally {
      setDuplicatingId(null);
    }
  };

  const deleteProduct = async (item: ShopItem) => {
    const confirmed = window.confirm(
      formatMessage(p.deleteConfirm, { name: item.name_ar })
    );
    if (!confirmed) return;
    setDeleting(true);
    setError("");
    try {
      const result = await postLifecycle({
        action: "soft_delete",
        module: lifecycleModule,
        id: item.id,
      });
      if (!result.ok) {
        throw new Error(result.error || p.deleteFailed);
      }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      if (editing?.id === item.id) {
        setOpen(false);
        setEditing(null);
        setNotice("");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : p.deleteFailed;
      setError(msg);
      alert(msg);
    } finally {
      setDeleting(false);
    }
  };

  const payload = () => {
    // Trim ends only — preserve internal newlines / blank lines in descriptions
    const description_ar = form.description_ar.replace(/^\s+|\s+$/g, "");
    const saleRaw = form.sale_price.trim();
    const saleNum = saleRaw === "" ? null : Number(saleRaw);
    const base = {
      name_ar: form.name_ar.trim(),
      description_ar,
      price: Number(form.price || 0),
      sale_price:
        saleNum != null && Number.isFinite(saleNum) ? saleNum : null,
      images: form.images,
      color: form.color || null,
      material: form.material || null,
      stock_quantity: Number(form.stock_quantity || 0),
      is_featured: form.is_featured,
      is_available: form.is_available,
      experience_config: form.experience_config,
      features_config: form.features_config,
    };
    if (kind === "veils") {
      return { ...base, category: form.category || "كلاسيكي" };
    }
    if (kind === "accessory-item") {
      return { ...base, size: form.size || null, category_id: categoryId };
    }
    return { ...base, size: form.size || null };
  };

  const save = async () => {
    if (!form.name_ar.trim()) {
      setError(p.nameRequired);
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
      if (!res.ok) throw new Error(data.error ?? p.saveFailed);
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
          : p.saveFailedHint
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">{title}</h1>
          <p className="mt-1 text-sm text-muted">
            {p.manageSubtitle}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {p.addNew}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Input
          label={p.search}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={p.searchPlaceholder}
        />
        <div>
          <p className="mb-1.5 text-sm text-muted">{p.visibility}</p>
          <VisibilityFilter
            value={visibility}
            onChange={(v) => {
              setVisibility(v);
              setPage(1);
            }}
          />
        </div>
        <Select
          label={p.availability}
          value={availability}
          onChange={(e) => {
            setAvailability(e.target.value as "all" | "yes" | "no");
            setPage(1);
          }}
          options={[
            { value: "all", label: p.all },
            { value: "yes", label: p.available },
            { value: "no", label: p.unavailable },
          ]}
        />
        <div className="flex items-end text-sm text-muted">
          {formatMessage(p.productCount, { count: filtered.length })}
        </div>
      </div>

      <div className="admin-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-beige/50 text-muted">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{p.colProduct}</th>
                <th className="px-4 py-3 text-start font-medium">{p.colPrice}</th>
                <th className="px-4 py-3 text-start font-medium">{p.colStock}</th>
                <th className="px-4 py-3 text-start font-medium">{p.colStatus}</th>
                <th className="px-4 py-3 text-start font-medium">{p.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    {items.length === 0
                      ? p.emptyYet
                      : p.emptyFiltered}
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
                              alt={localizedName(item, locale, item.name_ar)}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-charcoal">
                            {localizedName(item, locale, item.name_ar)}
                          </p>
                          <p className="text-xs text-muted">
                            {item.color
                              ? resolveDressColorLabel(item.color, locale)
                              : "—"}
                            {"category" in item && item.category
                              ? ` · ${resolveCatalogLabel(item.category, locale)}`
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
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {item.is_available ? p.available : p.unavailable}
                      </span>
                      {item.is_featured && (
                        <span className="mr-2 rounded-full bg-gold/10 px-2.5 py-1 text-xs text-gold">
                          {p.featured}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="rounded-lg p-2 text-gold hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                          aria-label={`${p.edit} ${item.name_ar}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void duplicateProduct(item)}
                          disabled={duplicatingId === item.id}
                          className="rounded-lg p-2 text-gold hover:bg-gold/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                          aria-label={`${p.duplicateProduct} ${item.name_ar}`}
                          title={p.duplicateProduct}
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <RowLifecycleActions
                          module={lifecycleModule}
                          id={item.id}
                          archived={Boolean(
                            (
                              item as ShopItem & {
                                archived_at?: string | null;
                              }
                            ).archived_at
                          )}
                          allowArchive={caps.canArchive}
                          allowRestore={caps.canRestore}
                          allowSoftDelete={caps.canSoftDelete}
                          confirmSoftDelete={formatMessage(p.deleteConfirm, {
                            name: item.name_ar,
                          })}
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
                                  ? ({
                                      ...i,
                                      archived_at:
                                        kind === "archive"
                                          ? new Date().toISOString()
                                          : null,
                                    } as unknown as ShopItem)
                                  : i
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

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {p.prev}
          </Button>
          <span className="text-sm text-muted">
            {formatMessage(p.pageOf, { page: safePage, pages: pageCount })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            {p.next}
          </Button>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={editing ? p.editProduct : p.addProductTitle}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">
                {editing ? p.editProduct : p.addProductTitle}
              </h2>
              <div className="flex items-center gap-2">
                {editing ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={duplicatingId === editing.id}
                    disabled={
                      saving ||
                      deleting ||
                      duplicatingId === editing.id
                    }
                    onClick={() => void duplicateProduct(editing)}
                  >
                    {duplicatingId === editing.id
                      ? p.duplicating
                      : p.duplicateProduct}
                  </Button>
                ) : null}
                {editing && caps.canSoftDelete ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={deleting}
                    disabled={
                      saving ||
                      deleting ||
                      duplicatingId === editing.id
                    }
                    onClick={() => void deleteProduct(editing)}
                    className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                  >
                    {deleting ? p.deleting : p.deleteProduct}
                  </Button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setNotice("");
                    setError("");
                  }}
                  aria-label={p.close}
                  className="rounded-lg p-1 text-charcoal hover:bg-beige focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {notice ? (
              <p
                className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                role="status"
              >
                {notice}
              </p>
            ) : null}

            <div className="mb-4 flex gap-2 border-b border-beige-dark/40">
              {(
                [
                  {
                    key: "general" as const,
                    label:
                      locale === "en"
                        ? "General"
                        : locale === "he"
                          ? "כללי"
                          : "عام",
                  },
                  {
                    key: "experience" as const,
                    label:
                      locale === "en"
                        ? "Experience"
                        : locale === "he"
                          ? "חוויית מוצר"
                          : "تجربة المنتج",
                  },
                  {
                    key: "features" as const,
                    label:
                      locale === "en"
                        ? "Features"
                        : locale === "he"
                          ? "תכונות"
                          : "الميزات",
                  },
                ]
              ).map((t2) => (
                <button
                  key={t2.key}
                  type="button"
                  onClick={() => setTab(t2.key)}
                  className={`rounded-t-lg px-3 py-2 text-sm font-medium transition ${
                    tab === t2.key
                      ? "border-b-2 border-gold text-charcoal"
                      : "text-muted hover:text-charcoal"
                  }`}
                >
                  {t2.label}
                </button>
              ))}
            </div>

            {tab === "general" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label={p.nameAr}
                  value={form.name_ar}
                  onChange={(e) =>
                    setForm({ ...form, name_ar: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Textarea
                  label={p.description}
                  rows={10}
                  value={form.description_ar}
                  onChange={(e) =>
                    setForm({ ...form, description_ar: e.target.value })
                  }
                  placeholder={p.descriptionPlaceholder}
                  className="min-h-[12rem] resize-y whitespace-pre-wrap font-normal"
                />
                <p className="mt-1 text-xs text-muted">
                  {p.descriptionHint}
                </p>
              </div>
              <Input
                label={p.price}
                type="number"
                dir="ltr"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
              <Input
                label={p.salePrice}
                type="number"
                dir="ltr"
                value={form.sale_price}
                onChange={(e) =>
                  setForm({ ...form, sale_price: e.target.value })
                }
              />
              <Input
                label={p.stock}
                type="number"
                dir="ltr"
                value={form.stock_quantity}
                onChange={(e) =>
                  setForm({ ...form, stock_quantity: e.target.value })
                }
              />
              {kind === "veils" ? (
                <Select
                  label={p.category}
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  options={VEIL_CATEGORY_OPTIONS.map((c) => ({
                    value: c,
                    label: resolveCatalogLabel(c, locale),
                  }))}
                />
              ) : (
                <Select
                  label={p.size}
                  value={form.size}
                  onChange={(e) => setForm({ ...form, size: e.target.value })}
                  options={[
                    { value: "", label: "—" },
                    ...DRESS_SIZES.map((s) => ({ value: s, label: s })),
                  ]}
                />
              )}
              <Select
                label={p.color}
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                options={[
                  { value: "", label: "—" },
                  ...DRESS_COLORS.map((c) => ({
                    value: c,
                    label: resolveDressColorLabel(c, locale),
                  })),
                ]}
              />
              <Input
                label={p.material}
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
                {p.available}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) =>
                    setForm({ ...form, is_featured: e.target.checked })
                  }
                />
                {p.featured}
              </label>
            </div>
            )}

            {tab === "experience" && (
              <ExperienceDesignerPanel
                value={form.experience_config}
                onChange={(next) =>
                  setForm({ ...form, experience_config: next })
                }
                productNameAr={form.name_ar}
                productType="bridal_accessory"
                featuresConfig={form.features_config}
              />
            )}

            {tab === "features" && (
              <ProductFeaturesPanel
                value={form.features_config}
                onChange={(next) =>
                  setForm({ ...form, features_config: next })
                }
                productType="bridal_accessory"
              />
            )}

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <Button loading={saving} onClick={save}>
                {p.save}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {p.cancel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
