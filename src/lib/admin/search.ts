import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isMissingColumnError, isMissingTableError } from "@/lib/supabase/errors";

export type AdminSearchGroupId =
  | "products"
  | "orders"
  | "customers"
  | "bookings"
  | "messages"
  | "pages";

export type AdminSearchHit = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export type AdminSearchGroup = {
  id: AdminSearchGroupId;
  hits: AdminSearchHit[];
};

const PAGE_HITS: AdminSearchHit[] = [
  { id: "page-home", title: "Homepage CMS", subtitle: "Hero, post grid, visual layout", href: "/admin/content/home" },
  { id: "page-about", title: "About", href: "/admin/content/about" },
  { id: "page-worn", title: "Worn by You", href: "/admin/content/worn-by-you" },
  { id: "page-gallery", title: "Gallery", href: "/admin/gallery" },
  { id: "page-settings", title: "Store settings", subtitle: "Announcement, shipping, SEO", href: "/admin/settings" },
  { id: "page-visual", title: "Visual layout editor", href: "/admin/content/home#visual-layout" },
];

function sanitizeQuery(raw: string): string {
  return raw.replace(/[%_,"'\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function matchesPage(hit: AdminSearchHit, q: string): boolean {
  const hay = `${hit.title} ${hit.subtitle ?? ""} ${hit.href} homepage hero announcement editorial custom design post grid visual isolation`.toLowerCase();
  const ar = "رئيسية هيرو إعلان معرض إعدادات تصميم شبكة";
  const he = "בית גלריה הגדרות עיצוב";
  return `${hay} ${ar} ${he}`.includes(q.toLowerCase());
}

async function searchTable(options: {
  table: string;
  columns: string;
  orFilter: string;
  fallbackOr?: string;
  fallbackColumns?: string;
  map: (row: Record<string, unknown>) => AdminSearchHit | null;
}): Promise<AdminSearchHit[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createPrivilegedClient();
    let { data, error } = await supabase
      .from(options.table)
      .select(options.columns)
      .or(options.orFilter)
      .limit(8);
    if (error && (isMissingColumnError(error) || isMissingTableError(error, options.table))) {
      if (!options.fallbackColumns || !options.fallbackOr) return [];
      const retry = await supabase
        .from(options.table)
        .select(options.fallbackColumns)
        .or(options.fallbackOr)
        .limit(8);
      data = retry.data;
      error = retry.error;
    }
    if (error) return [];
    return ((data ?? []) as unknown as Record<string, unknown>[])
      .map(options.map)
      .filter((hit): hit is AdminSearchHit => Boolean(hit));
  } catch {
    return [];
  }
}

export async function searchAdminEntities(rawQuery: string): Promise<AdminSearchGroup[]> {
  const q = sanitizeQuery(rawQuery);
  if (q.length < 2) return [];

  const like = `%${q}%`;

  const [dresses, veils, robes, orders, bookings, messages] = await Promise.all([
    searchTable({
      table: "dresses",
      columns: "id, name_ar, name_en, sku",
      orFilter: `name_ar.ilike.${like},name_en.ilike.${like},sku.ilike.${like}`,
      fallbackColumns: "id, name_ar",
      fallbackOr: `name_ar.ilike.${like}`,
      map: (row) => ({
        id: `dress-${row.id}`,
        title: String(row.name_ar || row.name_en || row.sku || row.id),
        subtitle: row.sku ? String(row.sku) : undefined,
        href: "/admin/dresses",
      }),
    }),
    searchTable({
      table: "veils",
      columns: "id, name_ar",
      orFilter: `name_ar.ilike.${like}`,
      map: (row) => ({
        id: `veil-${row.id}`,
        title: String(row.name_ar || row.id),
        href: "/admin/veils",
      }),
    }),
    searchTable({
      table: "bridal_robes",
      columns: "id, name_ar",
      orFilter: `name_ar.ilike.${like}`,
      map: (row) => ({
        id: `robe-${row.id}`,
        title: String(row.name_ar || row.id),
        href: "/admin/bridal-robes",
      }),
    }),
    searchTable({
      table: "shop_orders",
      columns: "id, name, email, phone, total",
      orFilter: `name.ilike.${like},email.ilike.${like},phone.ilike.${like},id.ilike.${like}`,
      map: (row) => ({
        id: `order-${row.id}`,
        title: `#${String(row.id).slice(0, 8)} · ${String(row.name || "")}`.trim(),
        subtitle: String(row.email || row.phone || ""),
        href: `/admin/orders?focus=${encodeURIComponent(String(row.id))}`,
      }),
    }),
    searchTable({
      table: "bookings",
      columns: "id, name, email, phone, service_type, status",
      orFilter: `name.ilike.${like},email.ilike.${like},phone.ilike.${like}`,
      map: (row) => ({
        id: `booking-${row.id}`,
        title: String(row.name || row.id),
        subtitle: [row.service_type, row.status].filter(Boolean).join(" · "),
        href: "/admin/bookings",
      }),
    }),
    searchTable({
      table: "contact_messages",
      columns: "id, name, subject, email",
      orFilter: `name.ilike.${like},subject.ilike.${like},email.ilike.${like}`,
      map: (row) => ({
        id: `msg-${row.id}`,
        title: String(row.subject || row.name || row.id),
        subtitle: String(row.name || row.email || ""),
        href: "/admin/messages",
      }),
    }),
  ]);

  const productHits = [...dresses, ...veils, ...robes].slice(0, 8);

  const customerMap = new Map<string, AdminSearchHit>();
  for (const order of orders) {
    const key = order.subtitle?.includes("@")
      ? `e:${order.subtitle.toLowerCase()}`
      : order.subtitle
        ? `p:${order.subtitle}`
        : "";
    if (!key || customerMap.has(key)) continue;
    customerMap.set(key, {
      id: `cust-${key}`,
      title: order.title.replace(/^#\S+\s·\s/, "") || order.subtitle || key,
      subtitle: order.subtitle,
      href: `/admin/customers/${encodeURIComponent(key)}`,
    });
  }

  const pages = PAGE_HITS.filter((hit) => matchesPage(hit, q)).slice(0, 6);

  return [
    { id: "products" as const, hits: productHits },
    { id: "orders" as const, hits: orders.slice(0, 6) },
    { id: "customers" as const, hits: [...customerMap.values()].slice(0, 6) },
    { id: "bookings" as const, hits: bookings.slice(0, 6) },
    { id: "messages" as const, hits: messages.slice(0, 6) },
    { id: "pages" as const, hits: pages },
  ].filter((group) => group.hits.length > 0);
}
