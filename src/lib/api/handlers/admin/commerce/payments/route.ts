import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { auditSettingsChange } from "@/lib/commerce/logging";
import { rateLimit } from "@/lib/commerce/rate-limit";
import {
  getMaskedSecrets,
  hasAnySecret,
  setSecrets,
} from "@/lib/commerce/secrets/store";
import {
  getCommerceSettings,
  saveCommerceSettings,
} from "@/lib/commerce/settings";
import { ensurePaymentProvidersRegistered } from "@/lib/payments/providers";
import {
  getPaymentProvider,
  listPaymentProviders,
} from "@/lib/payments/registry";
import { isPayPlusInvoiceModuleEnabled } from "@/lib/payplus/client";

function siteOrigin(request: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env) return env;
  return new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  ensurePaymentProvidersRegistered();
  const settings = await getCommerceSettings(true);
  const origin = siteOrigin(request);

  const providers = await Promise.all(
    listPaymentProviders().map(async (reg) => {
      const row = settings.payments.providers.find((p) => p.id === reg.id);
      const secretKeys = reg.credentialFields
        .filter((f) => f.kind === "secret")
        .map((f) => f.key);
      const masked = await getMaskedSecrets(
        "payment_provider",
        reg.id,
        secretKeys
      );
      const configured = await hasAnySecret(
        "payment_provider",
        reg.id,
        reg.requiredSecretKeys
      );

      return {
        id: reg.id,
        label: reg.label,
        enabled: row?.enabled ?? reg.id === "cod",
        sort_order: row?.sort_order ?? reg.defaultSortOrder,
        implementation_ready: reg.implementationReady,
        coming_soon: !reg.implementationReady,
        supports_webhook: reg.supportsWebhook,
        supports_refund: reg.supportsRefund,
        supports_test: reg.supportsTestConnection,
        connection_status: row?.connection_status ?? "unknown",
        last_tested_at: row?.last_tested_at ?? null,
        last_error: row?.last_error ?? null,
        public_config: row?.public_config ?? {},
        credential_fields: reg.credentialFields,
        secrets_masked: masked,
        configured: reg.id === "cod" ? true : configured,
        webhook_url: reg.supportsWebhook
          ? `${origin}/api/webhooks/payments/${reg.id}`
          : null,
        invoice_capability:
          reg.id === "payplus"
            ? {
                module_enabled: isPayPlusInvoiceModuleEnabled(
                  settings.invoicing.providers.find((p) => p.id === "payplus")
                    ?.public_config || {}
                ),
              }
            : null,
      };
    })
  );

  providers.sort((a, b) => a.sort_order - b.sort_order);

  return NextResponse.json({
    mode: settings.mode,
    providers,
  });
}

const putSchema = z.object({
  mode: z.enum(["test", "live"]).optional(),
  providers: z
    .array(
      z.object({
        id: z.string(),
        enabled: z.boolean().optional(),
        sort_order: z.number().int().optional(),
        public_config: z.record(z.string(), z.string()).optional(),
        secrets: z.record(z.string(), z.string()).optional(),
        clear_secret_keys: z.array(z.string()).optional(),
      })
    )
    .optional(),
});

export async function PUT(request: NextRequest) {
  const gate = await requireAdminApi("canMutateSettings");
  if (gate.error) return gate.error;

  const rl = rateLimit({
    key: `admin-payments:${gate.user?.id || "anon"}`,
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

  ensurePaymentProvidersRegistered();
  const current = await getCommerceSettings(true);
  const next = structuredClone(current);

  if (parsed.data.mode) next.mode = parsed.data.mode;

  for (const patch of parsed.data.providers ?? []) {
    const reg = getPaymentProvider(patch.id);
    if (!reg) continue;
    let row = next.payments.providers.find((p) => p.id === patch.id);
    if (!row) {
      row = {
        id: patch.id,
        enabled: patch.id === "cod",
        sort_order: reg.defaultSortOrder,
        public_config: {},
        connection_status: "not_configured",
      };
      next.payments.providers.push(row);
    }
    if (patch.enabled !== undefined) row.enabled = patch.enabled;
    if (patch.sort_order !== undefined) row.sort_order = patch.sort_order;
    if (patch.public_config) {
      row.public_config = { ...row.public_config, ...patch.public_config };
    }

    const secretPatch: Record<string, string | undefined> = {};
    const publicFromFields: Record<string, string> = {};
    if (patch.secrets) {
      for (const field of reg.credentialFields) {
        const val = patch.secrets[field.key];
        if (val === undefined) continue;
        if (field.kind === "secret") {
          secretPatch[field.key] = val;
        } else {
          publicFromFields[field.key] = val;
        }
      }
    }
    if (Object.keys(publicFromFields).length) {
      row.public_config = { ...row.public_config, ...publicFromFields };
    }
    if (Object.keys(secretPatch).length || patch.clear_secret_keys?.length) {
      await setSecrets("payment_provider", patch.id, secretPatch, {
        clearKeys: patch.clear_secret_keys,
        updatedBy: gate.user?.id,
      });
    }

    const configured = await hasAnySecret(
      "payment_provider",
      patch.id,
      reg.requiredSecretKeys
    );
    if (patch.id === "cod") {
      row.connection_status = "ok";
    } else if (configured && row.connection_status === "not_configured") {
      row.connection_status = "unknown";
    }
  }

  next.payments.providers.sort((a, b) => a.sort_order - b.sort_order);
  await saveCommerceSettings(next);

  await auditSettingsChange({
    actorId: gate.user?.id,
    actorEmail: gate.user?.email,
    area: "payments",
    message: "Payment settings updated",
    details: {
      mode: next.mode,
      providerIds: (parsed.data.providers ?? []).map((p) => p.id),
    },
  });

  return NextResponse.json({ ok: true });
}
