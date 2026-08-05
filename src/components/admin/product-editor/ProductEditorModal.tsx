"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Dress } from "@/types";
import type { Category } from "@/types/category";
import { DRESS_COLORS, DRESS_SIZES, DRESS_STYLES } from "@/lib/constants";
import { getDressColorLabel } from "@/lib/colors";
import { getDressStyleLabel } from "@/lib/styles";
import {
  AUTOSAVE_STATUS_LABEL,
  productDraftStorageKey,
  type AutosaveUiStatus,
} from "@/lib/admin/product-draft";
import {
  discountPercent,
  generateProductSku,
  generateProductSlug,
} from "@/lib/products/slug-sku";
import {
  PRODUCT_STATUS_LABELS,
  deriveProductStatus,
  type ProductStatus,
} from "@/lib/products/status";
import { formatDateTimeWestern, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { X } from "lucide-react";
import {
  collectionCategoriesFrom,
  dressAssignableFrom,
  fetchAdminCategories,
} from "@/lib/admin/fetch-admin-categories";
import {
  productCommerceTypeOptions,
  resolveProductCommerceType,
  type ProductCommerceType,
} from "@/lib/products/primary-action";
import {
  DEFAULT_EXTRA_SERVICES,
  DEFAULT_ORDER_OPTIONS,
  type OrderOptionKey,
  type ProductExtraServicesConfig,
  type ProductOrderOptionsConfig,
} from "@/lib/products/order-experience";

export type ProductEditorTab =
  | "general"
  | "pricing"
  | "media"
  | "organization"
  | "experience"
  | "status";

export type DressFormState = {
  name_ar: string;
  name_en: string;
  short_description: string;
  description_ar: string;
  slug: string;
  sku: string;
  category_id: string;
  collection_id: string;
  /** Commerce type — drives storefront CTA (not category) */
  product_type: ProductCommerceType;
  price: string;
  sale_price: string;
  cost_price: string;
  rental_price: string;
  size: string;
  color: string;
  style: string;
  tags: string;
  status: ProductStatus;
  is_featured: boolean;
  is_available: boolean;
  images: string[];
  slugTouched: boolean;
  skuTouched: boolean;
  /** Phase 1 config — null inherits store defaults */
  order_options_use_custom: boolean;
  order_options: Record<
    OrderOptionKey,
    { enabled: boolean; required: boolean }
  >;
  extra_services_use_custom: boolean;
  extra_service_ids: string[];
};

const TABS: { id: ProductEditorTab; label: string }[] = [
  { id: "general", label: "عام" },
  { id: "pricing", label: "التسعير" },
  { id: "media", label: "الوسائط" },
  { id: "organization", label: "التنظيم" },
  { id: "experience", label: "تجربة المنتج" },
  { id: "status", label: "الحالة" },
];

const AUTOSAVE_MS = 1400;

function defaultOrderOptionsForm(): Record<
  OrderOptionKey,
  { enabled: boolean; required: boolean }
> {
  const out = {} as Record<
    OrderOptionKey,
    { enabled: boolean; required: boolean }
  >;
  for (const opt of DEFAULT_ORDER_OPTIONS) {
    out[opt.key] = { enabled: opt.enabled, required: opt.required };
  }
  return out;
}

function orderOptionsFromConfig(
  config: ProductOrderOptionsConfig | null | undefined
): Pick<DressFormState, "order_options_use_custom" | "order_options"> {
  const base = defaultOrderOptionsForm();
  if (!config?.use_custom) {
    return { order_options_use_custom: false, order_options: base };
  }
  const merged = { ...base };
  for (const key of Object.keys(base) as OrderOptionKey[]) {
    const o = config.options?.[key];
    if (!o) continue;
    merged[key] = {
      enabled: typeof o.enabled === "boolean" ? o.enabled : base[key].enabled,
      required:
        typeof o.required === "boolean" ? o.required : base[key].required,
    };
  }
  return { order_options_use_custom: true, order_options: merged };
}

function extraServicesFromConfig(
  config: ProductExtraServicesConfig | null | undefined
): Pick<DressFormState, "extra_services_use_custom" | "extra_service_ids"> {
  if (!config?.use_custom) {
    return {
      extra_services_use_custom: false,
      extra_service_ids: DEFAULT_EXTRA_SERVICES.filter((s) => s.enabled).map(
        (s) => s.id
      ),
    };
  }
  return {
    extra_services_use_custom: true,
    extra_service_ids: [...(config.enabled_ids ?? [])],
  };
}

export function emptyDressForm(categoryId = ""): DressFormState {
  return {
    name_ar: "",
    name_en: "",
    short_description: "",
    description_ar: "",
    slug: "",
    sku: "",
    category_id: categoryId,
    collection_id: "",
    product_type: "ready_to_buy",
    price: "",
    sale_price: "",
    cost_price: "",
    rental_price: "",
    size: "",
    color: "",
    style: "",
    tags: "",
    status: "draft",
    is_featured: false,
    is_available: false,
    images: [],
    slugTouched: false,
    skuTouched: false,
    order_options_use_custom: false,
    order_options: defaultOrderOptionsForm(),
    extra_services_use_custom: false,
    extra_service_ids: [],
  };
}

export function resolveDressCategoryId(
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

export function dressToForm(
  dress: Dress,
  categories: Category[]
): DressFormState {
  const status = deriveProductStatus({
    status: dress.status,
    is_available: dress.is_available,
  });
  return {
    name_ar: dress.name_ar,
    name_en: dress.name_en ?? "",
    short_description: dress.short_description ?? "",
    description_ar: dress.description_ar,
    slug: dress.slug ?? "",
    sku: dress.sku ?? "",
    category_id: resolveDressCategoryId(dress, categories),
    collection_id: dress.collection_id ?? "",
    product_type: resolveProductCommerceType(dress.product_type),
    price: dress.price?.toString() ?? "",
    sale_price: dress.sale_price?.toString() ?? "",
    cost_price: dress.cost_price?.toString() ?? "",
    rental_price: dress.rental_price?.toString() ?? "",
    size: dress.size ?? "",
    color: getDressColorLabel(dress.color) || "",
    style: getDressStyleLabel(dress.style) || "",
    tags: (dress.tags ?? []).join("، "),
    status,
    is_featured: dress.is_featured,
    is_available: dress.is_available,
    images: dress.images ?? [],
    slugTouched: Boolean(dress.slug),
    skuTouched: Boolean(dress.sku),
    ...orderOptionsFromConfig(dress.order_options_config),
    ...extraServicesFromConfig(dress.extra_services_config),
  };
}

export function buildDressPayload(
  form: DressFormState,
  categoryId: string
) {
  const status = form.status;
  const order_options_config: ProductOrderOptionsConfig | null =
    form.order_options_use_custom
      ? {
          use_custom: true,
          options: form.order_options,
        }
      : null;
  const extra_services_config: ProductExtraServicesConfig | null =
    form.extra_services_use_custom
      ? {
          use_custom: true,
          enabled_ids: form.extra_service_ids,
        }
      : null;
  return {
    name_ar: form.name_ar.trim(),
    name_en: form.name_en.trim() || null,
    description_ar: form.description_ar.replace(/^\s+|\s+$/g, ""),
    short_description: form.short_description.trim() || null,
    slug: form.slug.trim() || null,
    sku: form.sku.trim() || null,
    category_id: categoryId,
    collection_id: form.collection_id || null,
    product_type: form.product_type,
    order_options_config,
    extra_services_config,
    price: form.price ? Number(form.price) : null,
    sale_price: form.sale_price ? Number(form.sale_price) : null,
    cost_price: form.cost_price ? Number(form.cost_price) : null,
    rental_price: form.rental_price ? Number(form.rental_price) : null,
    size: form.size || null,
    color: form.color || null,
    style: form.style || null,
    tags: form.tags
      .split(/[,،]/)
      .map((t) => t.trim())
      .filter(Boolean),
    status,
    is_featured: form.is_featured,
    is_available: status === "published",
    images: form.images,
  };
}

function readLocalDraft(key: string): DressFormState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { form?: DressFormState; savedAt?: string };
    if (parsed?.form && typeof parsed.form.name_ar === "string") {
      const form = parsed.form;
      return {
        ...form,
        product_type: resolveProductCommerceType(form.product_type),
        order_options_use_custom: Boolean(form.order_options_use_custom),
        order_options: form.order_options ?? defaultOrderOptionsForm(),
        extra_services_use_custom: Boolean(form.extra_services_use_custom),
        extra_service_ids: Array.isArray(form.extra_service_ids)
          ? form.extra_service_ids
          : [],
      };
    }
  } catch {
    /* ignore corrupt drafts */
  }
  return null;
}

/** Public helper — restore draft after unexpected refresh. */
export function loadDressFormDraft(
  productId: string | "new"
): DressFormState | null {
  if (typeof window === "undefined") return null;
  return readLocalDraft(productDraftStorageKey(productId));
}

function writeLocalDraft(key: string, form: DressFormState) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ form, savedAt: new Date().toISOString() })
    );
  } catch {
    /* quota / private mode */
  }
}

function clearLocalDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

interface ProductEditorModalProps {
  open: boolean;
  editing: Dress | null;
  form: DressFormState;
  setForm: Dispatch<SetStateAction<DressFormState>>;
  lockedCategoryId?: string;
  lockedLabel: string;
  currencyCode: string;
  error: string;
  setError: (msg: string) => void;
  onClose: () => void;
  onSaved: (dress: Dress) => void;
  /** Promote create → edit after first server draft save */
  onCreated: (dress: Dress) => void;
}

export function ProductEditorModal({
  open,
  editing,
  form,
  setForm,
  lockedCategoryId,
  lockedLabel,
  currencyCode,
  error,
  setError,
  onClose,
  onSaved,
  onCreated,
}: ProductEditorModalProps) {
  const [tab, setTab] = useState<ProductEditorTab>("general");
  const [saving, setSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] =
    useState<AutosaveUiStatus>("idle");
  const [liveCategories, setLiveCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const skipFirstAutosave = useRef(true);
  const formRef = useRef(form);
  const editingRef = useRef(editing);
  const liveCategoriesRef = useRef(liveCategories);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);

  useEffect(() => {
    liveCategoriesRef.current = liveCategories;
  }, [liveCategories]);

  // Always reload categories from /api/categories when the editor opens
  // (Create and Edit share this exact path — no parent snapshots).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setCategoriesLoading(true);
    });
    void (async () => {
      try {
        const rows = await fetchAdminCategories();
        if (cancelled) return;
        setLiveCategories(rows);
      } catch {
        if (!cancelled) setLiveCategories([]);
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, editing?.id]);

  const dressCategories = dressAssignableFrom(liveCategories);
  const collectionCategories = collectionCategoriesFrom(liveCategories);

  const draftId = editing?.id ?? "new";
  const storageKey = productDraftStorageKey(draftId);

  const persistServer = useCallback(
    async (opts?: { closeOnSuccess?: boolean; force?: boolean }) => {
      const current = formRef.current;
      const currentEditing = editingRef.current;
      if (!current.name_ar.trim()) {
        if (opts?.force) setError("اسم الفستان مطلوب");
        return null;
      }
      const categoryId = lockedCategoryId ?? current.category_id;
      if (!categoryId) {
        if (opts?.force) setError("التصنيف مطلوب");
        return null;
      }

      const payload = buildDressPayload(current, categoryId);
      const isCreate = !currentEditing;
      // Autosave: always localStorage; server only while status=draft
      if (!opts?.force && current.status !== "draft") {
        writeLocalDraft(storageKey, current);
        setAutosaveStatus("saved");
        return null;
      }

      setAutosaveStatus("saving");
      if (opts?.force) setSaving(true);
      setError("");

      try {
        const res = await fetch("/api/dresses", {
          method: isCreate ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isCreate ? payload : { id: currentEditing!.id, ...payload }
          ),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "فشل الحفظ");
        }
        const dress = data as Dress;
        writeLocalDraft(
          productDraftStorageKey(dress.id),
          dressToForm(dress, dressAssignableFrom(liveCategoriesRef.current))
        );
        if (isCreate) {
          clearLocalDraft(productDraftStorageKey("new"));
          onCreated(dress);
        }
        onSaved(dress);
        setAutosaveStatus("saved");
        if (opts?.closeOnSuccess) {
          clearLocalDraft(productDraftStorageKey(dress.id));
          onClose();
        }
        return dress;
      } catch (e) {
        writeLocalDraft(storageKey, current);
        setAutosaveStatus("failed");
        const msg =
          e instanceof Error
            ? e.message
            : "فشل حفظ الفستان. راجعي اتصال Supabase ورفع الصور.";
        if (opts?.force) setError(msg);
        return null;
      } finally {
        if (opts?.force) setSaving(false);
      }
    },
    [
      lockedCategoryId,
      storageKey,
      onCreated,
      onSaved,
      onClose,
      setError,
    ]
  );

  // Debounced autosave
  useEffect(() => {
    if (!open) return;
    writeLocalDraft(storageKey, form);
    const timer = window.setTimeout(() => {
      if (skipFirstAutosave.current) {
        skipFirstAutosave.current = false;
        setAutosaveStatus("saved");
        return;
      }
      setAutosaveStatus("saving");
      void persistServer({ force: false });
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [form, open, storageKey, persistServer]);

  const patch = useCallback(
    (partial: Partial<DressFormState>) => {
      setForm((prev) => {
        const next = { ...prev, ...partial };
        // Auto slug / SKU when not manually overridden
        if (
          !next.slugTouched &&
          (partial.name_ar !== undefined || partial.name_en !== undefined)
        ) {
          next.slug = generateProductSlug(next.name_en, next.name_ar);
        }
        if (
          !next.skuTouched &&
          !next.sku.trim() &&
          (partial.name_ar !== undefined ||
            partial.name_en !== undefined ||
            partial.slug !== undefined)
        ) {
          const slug =
            next.slug || generateProductSlug(next.name_en, next.name_ar);
          if (slug) next.sku = generateProductSku(slug);
        }
        if (partial.status !== undefined) {
          next.is_available = partial.status === "published";
        }
        return next;
      });
    },
    [setForm]
  );

  if (!open) return null;

  const regular = form.price ? Number(form.price) : null;
  const sale = form.sale_price ? Number(form.sale_price) : null;
  const pct = discountPercent(regular, sale);
  const statusLabel = AUTOSAVE_STATUS_LABEL[autosaveStatus];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[92vh] sm:rounded-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-beige-dark px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-semibold text-charcoal">
              {editing ? "تعديل المنتج" : "إضافة منتج"}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {statusLabel ||
                (form.status === "draft"
                  ? "مسودة — يُحفظ تلقائياً"
                  : "احفظي عند الانتهاء أو غيّري الحالة إلى مسودة للحفظ التلقائي على الخادم")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-lg p-2 text-muted hover:bg-beige/60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="shrink-0 overflow-x-auto border-b border-beige-dark px-3 sm:px-4">
          <div className="flex min-w-max gap-1 py-2" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-xl px-3.5 py-2 text-sm transition-colors ${
                  tab === t.id
                    ? "bg-gold text-white"
                    : "text-muted hover:bg-beige/70 hover:text-charcoal"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
          {tab === "general" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="الاسم بالعربية *"
                value={form.name_ar}
                onChange={(e) => patch({ name_ar: e.target.value })}
              />
              <Input
                label="الاسم بالإنجليزية"
                value={form.name_en}
                onChange={(e) => patch({ name_en: e.target.value })}
                dir="ltr"
              />
              <div className="sm:col-span-2">
                <Textarea
                  label="وصف قصير"
                  rows={2}
                  value={form.short_description}
                  onChange={(e) =>
                    patch({ short_description: e.target.value })
                  }
                  placeholder="سطر أو سطران يظهران في القوائم…"
                />
              </div>
              <div className="sm:col-span-2">
                <Textarea
                  label="الوصف الكامل"
                  rows={8}
                  value={form.description_ar}
                  onChange={(e) =>
                    patch({ description_ar: e.target.value })
                  }
                  placeholder="وصف المنتج… Enter لسطر جديد — بدون حد للطول"
                  className="min-h-[10rem] resize-y whitespace-pre-wrap font-normal"
                />
              </div>
              <div>
                <Input
                  label="المعرّف (Slug)"
                  value={form.slug}
                  onChange={(e) =>
                    patch({ slug: e.target.value, slugTouched: true })
                  }
                  dir="ltr"
                />
                <button
                  type="button"
                  className="mt-1 text-xs text-gold hover:underline"
                  onClick={() =>
                    patch({
                      slug: generateProductSlug(form.name_en, form.name_ar),
                      slugTouched: false,
                    })
                  }
                >
                  إعادة توليد تلقائي
                </button>
              </div>
              <div>
                <Input
                  label="SKU"
                  value={form.sku}
                  onChange={(e) =>
                    patch({ sku: e.target.value, skuTouched: true })
                  }
                  dir="ltr"
                />
                <button
                  type="button"
                  className="mt-1 text-xs text-gold hover:underline"
                  onClick={() =>
                    patch({
                      sku: generateProductSku(
                        form.slug ||
                          generateProductSlug(form.name_en, form.name_ar)
                      ),
                      skuTouched: false,
                    })
                  }
                >
                  إعادة توليد تلقائي
                </button>
              </div>
              <Select
                label="النمط"
                value={form.style}
                onChange={(e) => patch({ style: e.target.value })}
                dir="rtl"
                options={[
                  { value: "", label: "— اختاري النمط —" },
                  ...DRESS_STYLES.map((s) => ({ value: s, label: s })),
                ]}
              />
              <Select
                label="اللون"
                value={form.color}
                onChange={(e) => patch({ color: e.target.value })}
                dir="rtl"
                options={[
                  { value: "", label: "— اختاري اللون —" },
                  ...DRESS_COLORS.map((c) => ({ value: c, label: c })),
                ]}
              />
              <Select
                label="المقاس"
                value={form.size}
                onChange={(e) => patch({ size: e.target.value })}
                options={[
                  { value: "", label: "—" },
                  ...DRESS_SIZES.map((s) => ({ value: s, label: s })),
                ]}
              />
            </div>
          )}

          {tab === "pricing" && (
            <div className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <Input
                  label="السعر العادي"
                  type="number"
                  value={form.price}
                  onChange={(e) => patch({ price: e.target.value })}
                  dir="ltr"
                />
                <Input
                  label="سعر التخفيض"
                  type="number"
                  value={form.sale_price}
                  onChange={(e) => patch({ sale_price: e.target.value })}
                  dir="ltr"
                />
                <Input
                  label="سعر التكلفة (للإدارة فقط)"
                  type="number"
                  value={form.cost_price}
                  onChange={(e) => patch({ cost_price: e.target.value })}
                  dir="ltr"
                />
                <Input
                  label="سعر الإيجار"
                  type="number"
                  value={form.rental_price}
                  onChange={(e) => patch({ rental_price: e.target.value })}
                  dir="ltr"
                />
                <Input
                  label="العملة"
                  value={currencyCode === "ILS" ? "₪ ILS" : currencyCode}
                  disabled
                  dir="ltr"
                />
              </div>

              <div className="rounded-2xl border border-beige-dark bg-beige/30 px-5 py-6">
                <p className="mb-3 text-sm font-medium text-muted">
                  معاينة السعر
                </p>
                <div className="flex flex-wrap items-baseline gap-3" dir="ltr">
                  {sale != null &&
                  Number.isFinite(sale) &&
                  regular != null &&
                  sale < regular ? (
                    <>
                      <span className="text-lg text-muted line-through">
                        {formatPrice(regular)}
                      </span>
                      <span className="text-2xl font-semibold text-charcoal">
                        {formatPrice(sale)}
                      </span>
                      {pct != null && (
                        <span className="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-medium text-gold">
                          {pct}% OFF
                        </span>
                      )}
                    </>
                  ) : regular != null && Number.isFinite(regular) ? (
                    <span className="text-2xl font-semibold text-charcoal">
                      {formatPrice(regular)}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "media" && (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                الصورة الأولى هي الرئيسية (المميزة). اسحبي لإعادة الترتيب أو
                اضغطي النجمة.
              </p>
              <ImageUpload
                value={form.images}
                onChange={(images) => patch({ images })}
              />
            </div>
          )}

          {tab === "organization" && (
            <div className="grid gap-5 sm:grid-cols-2">
              {lockedCategoryId ? (
                <Input label="التصنيف" value={lockedLabel} disabled />
              ) : (
                <Select
                  label="التصنيف"
                  value={form.category_id}
                  onChange={(e) => patch({ category_id: e.target.value })}
                  disabled={categoriesLoading && dressCategories.length === 0}
                  options={
                    dressCategories.length > 0
                      ? dressCategories.map((c) => ({
                          value: c.id,
                          label: c.name_ar,
                        }))
                      : [
                          {
                            value: form.category_id || "",
                            label: categoriesLoading
                              ? "جاري تحميل التصنيفات…"
                              : "— لا توجد تصنيفات —",
                          },
                        ]
                  }
                />
              )}
              <Select
                label="نوع المنتج"
                value={form.product_type}
                onChange={(e) =>
                  patch({
                    product_type: e.target.value as ProductCommerceType,
                  })
                }
                options={productCommerceTypeOptions()}
              />
              <p className="sm:col-span-2 text-xs text-muted">
                يحدد زر الواجهة (أضف إلى السلة / احجزي موعد / احجز الآن) —
                مستقل عن التصنيف.
              </p>
              <Select
                label="المجموعة"
                value={form.collection_id}
                onChange={(e) => patch({ collection_id: e.target.value })}
                options={[
                  { value: "", label: "— بدون مجموعة —" },
                  ...collectionCategories.map((c) => ({
                    value: c.id,
                    label: c.name_ar,
                  })),
                ]}
              />
              {collectionCategories.length === 0 && (
                <p className="sm:col-span-2 text-xs text-muted">
                  لا توجد مجموعات مميزة بعد. فعّلي «مجموعة مميزة» من إدارة
                  التصنيفات.
                </p>
              )}
              <div className="sm:col-span-2">
                <Input
                  label="الوسوم (افصلي بفاصلة)"
                  value={form.tags}
                  onChange={(e) => patch({ tags: e.target.value })}
                  placeholder="عروس، كلاسيك، دانتيل"
                />
              </div>
              <Select
                label="الظهور"
                value={form.status}
                onChange={(e) =>
                  patch({ status: e.target.value as ProductStatus })
                }
                options={(
                  Object.keys(PRODUCT_STATUS_LABELS) as ProductStatus[]
                ).map((s) => ({
                  value: s,
                  label: PRODUCT_STATUS_LABELS[s],
                }))}
              />
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="accent-gold"
                    checked={form.is_featured}
                    onChange={(e) =>
                      patch({ is_featured: e.target.checked })
                    }
                  />
                  منتج مميز في الواجهة
                </label>
              </div>
            </div>
          )}

          {tab === "experience" && (
            <div className="space-y-8">
              <p className="text-sm text-muted">
                إعدادات خيارات الطلب والخدمات الإضافية لهذا المنتج فقط.
                الافتراضيات تُدار من إعدادات المتجر. لن تُطبَّق على الدفع
                حتى المرحلة التالية.
              </p>

              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-medium text-foreground">خيارات الطلب</h3>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-gold"
                      checked={form.order_options_use_custom}
                      onChange={(e) =>
                        patch({
                          order_options_use_custom: e.target.checked,
                        })
                      }
                    />
                    تخصيص لهذا المنتج
                  </label>
                </div>
                {!form.order_options_use_custom ? (
                  <p className="text-xs text-muted">
                    يُستخدم إعداد المتجر الافتراضي.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {DEFAULT_ORDER_OPTIONS.map((opt) => {
                      const row = form.order_options[opt.key];
                      return (
                        <div
                          key={opt.key}
                          className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3"
                        >
                          <span className="text-sm">{opt.label_ar}</span>
                          <div className="flex items-center gap-4 text-sm">
                            <label className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                className="accent-gold"
                                checked={row.enabled}
                                onChange={(e) =>
                                  patch({
                                    order_options: {
                                      ...form.order_options,
                                      [opt.key]: {
                                        ...row,
                                        enabled: e.target.checked,
                                      },
                                    },
                                  })
                                }
                              />
                              مفعّل
                            </label>
                            <label className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                className="accent-gold"
                                checked={row.required}
                                disabled={!row.enabled}
                                onChange={(e) =>
                                  patch({
                                    order_options: {
                                      ...form.order_options,
                                      [opt.key]: {
                                        ...row,
                                        required: e.target.checked,
                                      },
                                    },
                                  })
                                }
                              />
                              إلزامي
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-medium text-foreground">
                    خدمات إضافية
                  </h3>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-gold"
                      checked={form.extra_services_use_custom}
                      onChange={(e) =>
                        patch({
                          extra_services_use_custom: e.target.checked,
                        })
                      }
                    />
                    تخصيص لهذا المنتج
                  </label>
                </div>
                {!form.extra_services_use_custom ? (
                  <p className="text-xs text-muted">
                    تُستخدم الخدمات المفعّلة في إعدادات المتجر.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {DEFAULT_EXTRA_SERVICES.map((svc) => {
                      const checked = form.extra_service_ids.includes(svc.id);
                      return (
                        <label
                          key={svc.id}
                          className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 text-sm"
                        >
                          <span>{svc.name_ar}</span>
                          <input
                            type="checkbox"
                            className="accent-gold"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...form.extra_service_ids, svc.id]
                                : form.extra_service_ids.filter(
                                    (id) => id !== svc.id
                                  );
                              patch({ extra_service_ids: next });
                            }}
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}

          {tab === "status" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Select
                label="الحالة"
                value={form.status}
                onChange={(e) =>
                  patch({ status: e.target.value as ProductStatus })
                }
                options={(
                  Object.keys(PRODUCT_STATUS_LABELS) as ProductStatus[]
                ).map((s) => ({
                  value: s,
                  label: PRODUCT_STATUS_LABELS[s],
                }))}
              />
              <div className="rounded-xl border border-beige-dark bg-beige/20 px-4 py-3 text-sm">
                <p className="text-muted">التوفر في المتجر</p>
                <p className="mt-1 font-medium text-charcoal">
                  {form.status === "published"
                    ? "متاح للعرض والشراء"
                    : "غير ظاهر للعملاء"}
                </p>
              </div>
              <div className="rounded-xl border border-beige-dark px-4 py-3 text-sm">
                <p className="text-muted">تاريخ الإنشاء</p>
                <p className="mt-1 font-medium text-charcoal" dir="ltr">
                  {editing?.created_at
                    ? formatDateTimeWestern(editing.created_at)
                    : "— عند الحفظ لأول مرة"}
                </p>
              </div>
              <div className="rounded-xl border border-beige-dark px-4 py-3 text-sm">
                <p className="text-muted">آخر تحديث</p>
                <p className="mt-1 font-medium text-charcoal" dir="ltr">
                  {editing?.updated_at
                    ? formatDateTimeWestern(editing.updated_at)
                    : "—"}
                </p>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        {/* Sticky save bar */}
        <div className="sticky bottom-0 shrink-0 border-t border-beige-dark bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p
              className={`text-xs ${
                autosaveStatus === "failed"
                  ? "text-red-600"
                  : autosaveStatus === "saved"
                    ? "text-emerald-700"
                    : "text-muted"
              }`}
              aria-live="polite"
            >
              {statusLabel || " "}
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={onClose}>
                إلغاء
              </Button>
              <Button
                loading={saving}
                onClick={() =>
                  void persistServer({ force: true, closeOnSuccess: true })
                }
              >
                حفظ
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
