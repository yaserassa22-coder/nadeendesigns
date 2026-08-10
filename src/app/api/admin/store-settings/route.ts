import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth";
import { getAuthEnvFlags } from "@/lib/customer-auth/settings";
import {
  getStoreSettings,
  mergeStoreSettingsPatch,
  saveStoreSettings,
} from "@/lib/store/settings";
import { isCloudinaryConfigured } from "@/lib/supabase/env";
import type { StoreSettings, StoreSettingsSection } from "@/types/store";

const SECTIONS: StoreSettingsSection[] = [
  "general",
  "announcement",
  "payments",
  "shipping",
  "contact",
  "social",
  "homepage",
  "authentication",
  "notifications",
  "order_options",
  "extra_services",
  "legal",
  "tax",
  "seo",
  "security",
  "integrations",
];

function parseSections(raw: unknown): StoreSettingsSection[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out = raw.filter(
    (s): s is StoreSettingsSection =>
      typeof s === "string" &&
      (SECTIONS as string[]).includes(s)
  );
  return out.length ? out : undefined;
}

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  const settings = await getStoreSettings(true);
  return NextResponse.json({
    settings,
    flags: {
      ...getAuthEnvFlags(),
      cloudinaryConfigured: isCloudinaryConfigured(),
    },
  });
}

/**
 * Merge-safe PUT. Body may be:
 *   { settings: Partial<StoreSettings>, sections?: StoreSettingsSection[] }
 * or a partial StoreSettings (full replace of provided top-level bags only).
 * Syncs shipping/contact into `site` and auth into `customer_auth`.
 * Revalidates storefront layout so Header/Footer/checkout update immediately.
 */
export async function PUT(request: NextRequest) {
  const { error } = await requireAdminApi("canMutateSettings");
  if (error) return error;

  try {
    const body = (await request.json().catch(() => ({}))) as
      | Partial<StoreSettings>
      | {
          settings?: Partial<StoreSettings>;
          sections?: StoreSettingsSection[];
        };

    const wrapped =
      body &&
      typeof body === "object" &&
      "settings" in body &&
      body.settings &&
      typeof body.settings === "object";

    const patch = (
      wrapped
        ? (body as { settings: Partial<StoreSettings> }).settings
        : (body as Partial<StoreSettings>)
    ) as Partial<StoreSettings>;

    const sections = wrapped
      ? parseSections((body as { sections?: unknown }).sections)
      : undefined;

    const current = await getStoreSettings(true);
    const merged = mergeStoreSettingsPatch(current, patch);
    const saved = await saveStoreSettings(merged, sections);

    revalidatePath("/", "layout");
    revalidatePath("/checkout");
    revalidatePath("/contact");
    revalidatePath("/legal/terms");
    revalidatePath("/legal/privacy");
    revalidatePath("/legal/returns");
    revalidatePath("/legal/shipping");
    revalidatePath("/admin/settings");
    revalidatePath("/maintenance");

    return NextResponse.json({
      success: true,
      settings: saved,
      flags: {
        ...getAuthEnvFlags(),
        cloudinaryConfigured: isCloudinaryConfigured(),
      },
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "فشل حفظ إعدادات المتجر";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
