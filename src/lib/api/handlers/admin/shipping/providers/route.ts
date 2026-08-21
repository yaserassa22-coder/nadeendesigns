import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { hasAdminCapability } from "@/lib/admin/permissions";
import { rateLimit } from "@/lib/commerce/rate-limit";
import { ensureShippingCarriersRegistered } from "@/lib/shipping/carriers";
import {
  createCustomProvider,
  listAdapterTemplates,
  listPublicProviders,
  listShippingRates,
  loadProviderRow,
  resolveAdapterForRow,
  saveProviderPatch,
} from "@/lib/shipping/providers/store";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET() {
  const gate = await requireAdminApi();
  if (gate.error) return gate.error;

  const canManage = hasAdminCapability(
    { id: gate.user?.id ?? "", email: gate.user?.email, role: gate.role },
    "canMutateSettings"
  );

  ensureShippingCarriersRegistered();
  const providers = await listPublicProviders({
    includeSecretsMasked: canManage,
  });
  const rates = await listShippingRates();
  const adapters = listAdapterTemplates().map((a) => ({
    code: a.code,
    label: a.label,
  }));

  return NextResponse.json({
    can_manage: canManage,
    providers,
    rates,
    adapters,
  });
}

const putSchema = z.object({
  providers: z
    .array(
      z.object({
        code: z.string().min(1).max(64),
        enabled: z.boolean().optional(),
        environment: z.enum(["test", "production"]).optional(),
        public_config: z.record(z.string(), z.string()).optional(),
        enabled_services: z.array(z.string()).optional(),
        is_active_provider: z.boolean().optional(),
        secrets: z.record(z.string(), z.string()).optional(),
      })
    )
    .optional(),
});

const postSchema = z.object({
  code: z.string().min(1).max(64),
  label_ar: z.string().min(1).max(120),
  label_he: z.string().max(120).optional(),
  label_en: z.string().max(120).optional(),
  adapter_code: z.string().max(64).optional(),
});

export async function POST(request: NextRequest) {
  const gate = await requireAdminApi("canMutateSettings");
  if (gate.error) return gate.error;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid payload" },
      { status: 400 }
    );
  }

  try {
    const provider = await createCustomProvider(parsed.data);
    const providers = await listPublicProviders({ includeSecretsMasked: true });
    const rates = await listShippingRates();
    return NextResponse.json({
      ok: true,
      provider,
      providers,
      rates,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Create failed";
    const status =
      message === "Provider already exists"
        ? 409
        : message === "Invalid provider code" || message === "Unknown adapter"
          ? 400
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  const gate = await requireAdminApi("canMutateSettings");
  if (gate.error) return gate.error;

  const rl = rateLimit({
    key: `admin-shipping-providers:${gate.user?.id || "anon"}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = putSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid payload" },
      { status: 400 }
    );
  }

  ensureShippingCarriersRegistered();
  const supabase = isSupabaseConfigured()
    ? await createPrivilegedClient()
    : null;

  for (const patch of parsed.data.providers ?? []) {
    const row = await loadProviderRow(supabase, patch.code);
    const adapter = resolveAdapterForRow(row);

    const publicFromFields: Record<string, string> = {};
    const secretPatch: Record<string, string | undefined> = {};
    if (patch.secrets) {
      for (const field of adapter.credentialFields) {
        const val = patch.secrets[field.key];
        if (val === undefined) continue;
        if (field.kind === "secret") secretPatch[field.key] = val;
        else publicFromFields[field.key] = val;
      }
    }
    if (patch.public_config) {
      Object.assign(publicFromFields, patch.public_config);
    }

    await saveProviderPatch({
      code: patch.code,
      enabled: patch.enabled,
      environment: patch.environment,
      public_config: Object.keys(publicFromFields).length
        ? publicFromFields
        : undefined,
      enabled_services: patch.enabled_services,
      is_active_provider: patch.is_active_provider,
      secrets: secretPatch,
    });
  }

  const providers = await listPublicProviders({ includeSecretsMasked: true });
  const rates = await listShippingRates();
  return NextResponse.json({ ok: true, can_manage: true, providers, rates });
}
