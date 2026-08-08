"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Pencil, Plus } from "lucide-react";
import type { Dress } from "@/types";
import type { Category } from "@/types/category";
import {
  dressAssignableFrom,
  fetchAdminCategories,
} from "@/lib/admin/fetch-admin-categories";
import type { ListVisibility } from "@/lib/admin/lifecycle-types";
import { filterLifecycleRows } from "@/lib/admin/query-lifecycle";
import { formatPrice } from "@/lib/utils";
import { featuredImage } from "@/lib/products/featured-image";
import { getDressStyleLabel } from "@/lib/styles";
import {
  getProductStatusLabel,
  deriveProductStatus,
} from "@/lib/products/status";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { RowLifecycleActions } from "@/components/admin/lifecycle/RowLifecycleActions";
import { VisibilityFilter } from "@/components/admin/lifecycle/VisibilityFilter";
import {
  ProductEditorModal,
  dressToForm,
  emptyDressForm,
  loadDressFormDraft,
  resolveDressCategoryId,
  type DressFormState,
} from "@/components/admin/product-editor/ProductEditorModal";
import { DEFAULT_STORE_SETTINGS } from "@/types/store";

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

function DressesManagerInner({
  initialDresses,
  initialCategories,
  initialCategoryFilter = "all",
  lockedCategoryId,
  lockedCategory,
}: DressesManagerProps) {
  const { t, locale } = useLocale();
  const p = t.admin.productsUi;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const collectionParam = searchParams.get("collection");

  const [dresses, setDresses] = useState(initialDresses);
  const [categories, setCategories] = useState(initialCategories);
  const [search, setSearch] = useState("");
  const [currencyCode, setCurrencyCode] = useState(
    DEFAULT_STORE_SETTINGS.general.currency
  );

  // Dresses may refresh from RSC; categories always come from /api/categories
  // after mount — never clobber live refetch with a stale initialCategories snapshot.
  const [dressesProp, setDressesProp] = useState(initialDresses);
  if (initialDresses !== dressesProp) {
    setDressesProp(initialDresses);
    setDresses(initialDresses);
  }

  const dressCategories = useMemo(
    () => dressAssignableFrom(categories),
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

  const categoryFilter: string | "all" = useMemo(() => {
    if (resolvedLockId) return resolvedLockId;
    if (categoryParam) {
      const match = dressCategories.find(
        (c) =>
          c.id === categoryParam ||
          c.slug === categoryParam ||
          c.legacy_key === categoryParam
      );
      return match?.id ?? "all";
    }
    return initialCategoryFilter;
  }, [
    resolvedLockId,
    categoryParam,
    dressCategories,
    initialCategoryFilter,
  ]);

  const setCategoryFilterAndUrl = (value: string | "all") => {
    if (resolvedLockId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("collection");
    if (value === "all") params.delete("category");
    else params.set("category", value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const featuredCollectionIds = useMemo(() => {
    if (collectionParam !== "1") return null;
    return new Set(
      categories
        .filter((c) => c.featured_collection === true)
        .map((c) => c.id)
    );
  }, [collectionParam, categories]);
  const [availabilityFilter, setAvailabilityFilter] = useState<
    "all" | "yes" | "no"
  >("all");
  const [featuredFilter, setFeaturedFilter] = useState<"all" | "yes" | "no">(
    "all"
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | "published" | "draft" | "hidden"
  >("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Dress | null>(null);
  const [form, setForm] = useState<DressFormState>(
    emptyDressForm(resolvedLockId ?? dressCategories[0]?.id ?? "")
  );
  const [error, setError] = useState("");
  const [visibility, setVisibility] = useState<ListVisibility>("active");

  const refetchCategories = useCallback(async (): Promise<Category[]> => {
    try {
      const data = await fetchAdminCategories();
      setCategories(data);
      return data;
    } catch {
      return await new Promise<Category[]>((resolve) => {
        setCategories((prev) => {
          resolve(prev);
          return prev;
        });
      });
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refetchCategories();
      fetch("/api/admin/store-settings")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const code = data?.general?.currency;
          if (typeof code === "string" && code.trim()) {
            setCurrencyCode(code.trim());
          }
        })
        .catch(() => {
          /* keep default */
        });
    }, 0);
    const onFocus = () => {
      void refetchCategories();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [refetchCategories]);

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
      } else if (featuredCollectionIds) {
        const dressCatId = resolveDressCategoryId(d, dressCategories);
        if (!dressCatId || !featuredCollectionIds.has(dressCatId)) {
          return false;
        }
      }
      if (availabilityFilter === "yes" && !d.is_available) return false;
      if (availabilityFilter === "no" && d.is_available) return false;
      if (featuredFilter === "yes" && !d.is_featured) return false;
      if (featuredFilter === "no" && d.is_featured) return false;
      if (statusFilter !== "all") {
        const st = deriveProductStatus({
          status: d.status,
          is_available: d.is_available,
        });
        if (st !== statusFilter) return false;
      }
      if (!q) return true;
      const label = labelForCategory(d, dressCategories).toLowerCase();
      const nameEn = (d.name_en ?? "").toLowerCase();
      const sku = (d.sku ?? "").toLowerCase();
      return (
        d.name_ar.toLowerCase().includes(q) ||
        nameEn.includes(q) ||
        sku.includes(q) ||
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
    featuredCollectionIds,
    availabilityFilter,
    featuredFilter,
    statusFilter,
    dressCategories,
  ]);

  const openCreate = async () => {
    setEditing(null);
    setError("");
    // Same query as Edit / ProductEditorModal — GET /api/categories
    const fresh = dressAssignableFrom(await refetchCategories());
    const defaultCategory =
      resolvedLockId ??
      (categoryFilter !== "all" ? categoryFilter : fresh[0]?.id ?? "");
    const base = emptyDressForm(defaultCategory);
    setForm(loadDressFormDraft("new") ?? base);
    setOpen(true);
  };

  const openEdit = async (dress: Dress) => {
    setEditing(dress);
    setError("");
    // Same query as Create / ProductEditorModal — GET /api/categories
    const fresh = dressAssignableFrom(await refetchCategories());
    const base = dressToForm(dress, fresh);
    setForm(loadDressFormDraft(dress.id) ?? base);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditing(null);
    setError("");
  };

  const handleSaved = useCallback((dress: Dress) => {
    setDresses((prev) => {
      const exists = prev.some((d) => d.id === dress.id);
      if (exists) {
        return prev.map((d) => (d.id === dress.id ? dress : d));
      }
      return [dress, ...prev];
    });
  }, []);

  const handleCreated = useCallback((dress: Dress) => {
    setEditing(dress);
    setForm((prev) => {
      // Prefer current form category; resolve against live state list
      const next = dressToForm(dress, dressAssignableFrom(categories));
      return { ...next, category_id: prev.category_id || next.category_id };
    });
  }, [categories]);

  const lockedLabel =
    dressCategories.find((c) => c.id === resolvedLockId)?.name_ar ?? p.lockedCategory;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Input
            label={p.search}
            placeholder={p.searchSkuPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {!resolvedLockId && (
            <Select
              label={p.filterCategory}
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilterAndUrl(e.target.value as string | "all")
              }
              options={[
                { value: "all", label: p.allCategories },
                ...dressCategories.map((c) => ({
                  value: c.id,
                  label: c.name_ar,
                })),
              ]}
            />
          )}
          <Select
            label={p.status}
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as "all" | "published" | "draft" | "hidden"
              )
            }
            options={[
              { value: "all", label: p.all },
              { value: "published", label: getProductStatusLabel("published", locale) },
              { value: "draft", label: getProductStatusLabel("draft", locale) },
              { value: "hidden", label: getProductStatusLabel("hidden", locale) },
            ]}
          />
          <Select
            label={p.availability}
            value={availabilityFilter}
            onChange={(e) =>
              setAvailabilityFilter(e.target.value as "all" | "yes" | "no")
            }
            options={[
              { value: "all", label: p.all },
              { value: "yes", label: p.available },
              { value: "no", label: p.unavailable },
            ]}
          />
          <Select
            label={p.featured}
            value={featuredFilter}
            onChange={(e) =>
              setFeaturedFilter(e.target.value as "all" | "yes" | "no")
            }
            options={[
              { value: "all", label: p.all },
              { value: "yes", label: p.featured },
              { value: "no", label: p.notFeatured },
            ]}
          />
          <div>
            <p className="mb-1.5 text-sm text-muted">{p.visibility}</p>
            <VisibilityFilter value={visibility} onChange={setVisibility} />
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {resolvedLockId && lockedCategory === "nouf_dresses"
            ? p.addNouf
            : p.addProduct}
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-beige-dark bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-beige/50 text-muted">
              <tr>
                <th className="px-4 py-3 text-right font-medium">{p.colProduct}</th>
                <th className="px-4 py-3 text-right font-medium">{p.colCategory}</th>
                <th className="px-4 py-3 text-right font-medium">{p.colPrice}</th>
                <th className="px-4 py-3 text-right font-medium">{p.colStatus}</th>
                <th className="px-4 py-3 text-right font-medium">{p.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    {p.empty}
                  </td>
                </tr>
              ) : (
                filtered.map((dress) => {
                  const status = deriveProductStatus({
                    status: dress.status,
                    is_available: dress.is_available,
                  });
                  const displayPrice =
                    dress.sale_price != null &&
                    dress.price != null &&
                    dress.sale_price < dress.price
                      ? dress.sale_price
                      : dress.price;
                  return (
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
                            <p className="font-medium text-charcoal">
                              {dress.name_ar}
                            </p>
                            <p className="text-xs text-muted">
                              {[
                                dress.sku,
                                dress.style
                                  ? getDressStyleLabel(dress.style)
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ") || null}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {labelForCategory(dress, dressCategories)}
                      </td>
                      <td className="px-4 py-3" dir="ltr">
                        {displayPrice != null ? (
                          <span className="inline-flex flex-col gap-0.5">
                            {dress.sale_price != null &&
                            dress.price != null &&
                            dress.sale_price < dress.price ? (
                              <>
                                <span className="text-xs text-muted line-through">
                                  {formatPrice(dress.price)}
                                </span>
                                <span>{formatPrice(dress.sale_price)}</span>
                              </>
                            ) : (
                              formatPrice(displayPrice)
                            )}
                          </span>
                        ) : dress.rental_price ? (
                          `${formatPrice(dress.rental_price)} ${p.rentalSuffix}`
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            status === "published"
                              ? "bg-emerald-50 text-emerald-700"
                              : status === "draft"
                                ? "bg-amber-50 text-amber-800"
                                : "bg-red-50 text-red-600"
                          }`}
                        >
                          {getProductStatusLabel(status, locale)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(dress)}
                            className="rounded-lg p-2 text-gold hover:bg-gold/10"
                            aria-label={p.edit}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open ? (
        <ProductEditorModal
          key={editing?.id ?? "new"}
          open={open}
          editing={editing}
          form={form}
          setForm={setForm}
          lockedCategoryId={resolvedLockId}
          lockedLabel={lockedLabel}
          currencyCode={currencyCode}
          error={error}
          setError={setError}
          onClose={close}
          onSaved={handleSaved}
          onCreated={handleCreated}
        />
      ) : null}
    </div>
  );
}

export function DressesManager(props: DressesManagerProps) {
  const { t } = useLocale();
  const p = t.admin.productsUi;
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-beige-dark bg-white p-8 text-sm text-muted">
          {p.loading}
        </div>
      }
    >
      <DressesManagerInner {...props} />
    </Suspense>
  );
}
