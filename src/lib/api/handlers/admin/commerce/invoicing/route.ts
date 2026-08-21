import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { auditSettingsChange } from "@/lib/commerce/logging";
import { rateLimit } from "@/lib/commerce/rate-limit";
import {
  getMaskedSecrets,
  getSecrets,
  hasAnySecret,
  setSecrets,
} from "@/lib/commerce/secrets/store";
import {
  getCommerceSettings,
  saveCommerceSettings,
} from "@/lib/commerce/settings";
import { ensureInvoiceProvidersRegistered } from "@/lib/invoicing/providers";
import {
  getInvoiceProvider,
  listInvoiceProviders,
} from "@/lib/invoicing/registry";
import { getStoreSettings } from "@/lib/store/settings";
import {
  PAYPLUS_INVOICE_NOT_CONFIGURED,
  PAYPLUS_PROVIDER_ID,
  isPayPlusInvoiceModuleEnabled,
} from "@/lib/payplus/client";
import {
  payplusAuthConfigured,
  resolvePayPlusAuth,
} from "@/lib/payplus/secrets";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  ensureInvoiceProvidersRegistered();
  const settings = await getCommerceSettings(true);

  const providers = await Promise.all(
    listInvoiceProviders().map(async (reg) => {
      const row = settings.invoicing.providers.find((p) => p.id === reg.id);
      const secretKeys = reg.credentialFields
        .filter((f) => f.kind === "secret")
        .map((f) => f.key);
      const masked = await getMaskedSecrets(
        "invoice_provider",
        reg.id,
        secretKeys
      );
      let configured =
        reg.id === "internal" ||
        (reg.requiredSecretKeys.length
          ? await hasAnySecret(
              "invoice_provider",
              reg.id,
              reg.requiredSecretKeys
            )
          : true);

      let selectable = true;
      let capability_warning: string | null = null;

      if (reg.id === PAYPLUS_PROVIDER_ID) {
        const auth = await resolvePayPlusAuth();
        const moduleOn = isPayPlusInvoiceModuleEnabled(row?.public_config || {});
        configured = payplusAuthConfigured(auth) && moduleOn;
        selectable = configured;
        if (!selectable) {
          capability_warning = PAYPLUS_INVOICE_NOT_CONFIGURED;
        }
      }

      return {
        id: reg.id,
        label: reg.label,
        active: settings.invoicing.active_provider_id === reg.id,
        implementation_ready: reg.implementationReady,
        connection_status: row?.connection_status ?? "unknown",
        last_tested_at: row?.last_tested_at ?? null,
        last_error: row?.last_error ?? null,
        public_config: row?.public_config ?? {},
        credential_fields: reg.credentialFields,
        secrets_masked: masked,
        configured,
        selectable,
        capability_warning,
        supports_test: reg.supportsTestConnection,
        supports_test_document: reg.supportsTestDocument,
      };
    })
  );

  return NextResponse.json({
    invoicing: {
      active_provider_id: settings.invoicing.active_provider_id,
      auto_issue_on_payment: settings.invoicing.auto_issue_on_payment,
      auto_email_on_issue: settings.invoicing.auto_email_on_issue,
      retry_max_attempts: settings.invoicing.retry_max_attempts,
      retry_backoff_seconds: settings.invoicing.retry_backoff_seconds,
      company_name: settings.invoicing.company_name,
      company_name_he: settings.invoicing.company_name_he,
      vat_number: settings.invoicing.vat_number,
      logo_url: settings.invoicing.logo_url,
      email_subject: settings.invoicing.email_subject,
      email_body_html: settings.invoicing.email_body_html,
    },
    providers,
  });
}

const putSchema = z.object({
  active_provider_id: z.string().optional(),
  auto_issue_on_payment: z.boolean().optional(),
  auto_email_on_issue: z.boolean().optional(),
  retry_max_attempts: z.number().int().min(1).max(20).optional(),
  retry_backoff_seconds: z.number().int().min(30).max(86400).optional(),
  company_name: z.string().max(200).optional(),
  company_name_he: z.string().max(200).optional(),
  vat_number: z.string().max(64).optional(),
  logo_url: z.string().max(500).optional(),
  email_subject: z.string().max(300).optional(),
  email_body_html: z.string().max(20000).optional(),
  provider: z
    .object({
      id: z.string(),
      public_config: z.record(z.string(), z.string()).optional(),
      secrets: z.record(z.string(), z.string()).optional(),
      clear_secret_keys: z.array(z.string()).optional(),
    })
    .optional(),
});

export async function PUT(request: NextRequest) {
  const gate = await requireAdminApi("canMutateSettings");
  if (gate.error) return gate.error;

  const rl = rateLimit({
    key: `admin-invoicing:${gate.user?.id}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
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

  ensureInvoiceProvidersRegistered();
  const current = await getCommerceSettings(true);
  const next = structuredClone(current);
  const d = parsed.data;

  if (d.active_provider_id) {
    if (!getInvoiceProvider(d.active_provider_id)) {
      return NextResponse.json(
        { error: "Unknown invoice provider" },
        { status: 400 }
      );
    }
    if (d.active_provider_id === PAYPLUS_PROVIDER_ID) {
      const payplusRow =
        d.provider?.id === PAYPLUS_PROVIDER_ID
          ? {
              ...(next.invoicing.providers.find((p) => p.id === PAYPLUS_PROVIDER_ID)
                ?.public_config || {}),
              ...(d.provider.public_config || {}),
            }
          : next.invoicing.providers.find((p) => p.id === PAYPLUS_PROVIDER_ID)
              ?.public_config || {};
      const auth = await resolvePayPlusAuth({
        invoiceSecrets: d.provider?.id === PAYPLUS_PROVIDER_ID
          ? d.provider.secrets
          : undefined,
      });
      if (
        !isPayPlusInvoiceModuleEnabled(payplusRow) ||
        !payplusAuthConfigured(auth)
      ) {
        return NextResponse.json(
          { error: PAYPLUS_INVOICE_NOT_CONFIGURED },
          { status: 400 }
        );
      }
    }
    next.invoicing.active_provider_id = d.active_provider_id;
  }
  if (d.auto_issue_on_payment !== undefined) {
    next.invoicing.auto_issue_on_payment = d.auto_issue_on_payment;
  }
  if (d.auto_email_on_issue !== undefined) {
    next.invoicing.auto_email_on_issue = d.auto_email_on_issue;
  }
  if (d.retry_max_attempts !== undefined) {
    next.invoicing.retry_max_attempts = d.retry_max_attempts;
  }
  if (d.retry_backoff_seconds !== undefined) {
    next.invoicing.retry_backoff_seconds = d.retry_backoff_seconds;
  }
  if (d.company_name !== undefined) next.invoicing.company_name = d.company_name;
  if (d.company_name_he !== undefined) {
    next.invoicing.company_name_he = d.company_name_he;
  }
  if (d.vat_number !== undefined) next.invoicing.vat_number = d.vat_number;
  if (d.logo_url !== undefined) next.invoicing.logo_url = d.logo_url;
  if (d.email_subject !== undefined) {
    next.invoicing.email_subject = d.email_subject;
  }
  if (d.email_body_html !== undefined) {
    next.invoicing.email_body_html = d.email_body_html;
  }

  if (d.provider) {
    const reg = getInvoiceProvider(d.provider.id);
    if (!reg) {
      return NextResponse.json(
        { error: "Unknown invoice provider" },
        { status: 400 }
      );
    }
    let row = next.invoicing.providers.find((p) => p.id === d.provider!.id);
    if (!row) {
      row = {
        id: d.provider.id,
        public_config: {},
        connection_status: "not_configured",
      };
      next.invoicing.providers.push(row);
    }
    if (d.provider.public_config) {
      row.public_config = {
        ...row.public_config,
        ...d.provider.public_config,
      };
    }
    const secretPatch: Record<string, string | undefined> = {};
    if (d.provider.secrets) {
      for (const field of reg.credentialFields) {
        const val = d.provider.secrets[field.key];
        if (val === undefined) continue;
        if (field.kind === "secret") secretPatch[field.key] = val;
        else {
          row.public_config[field.key] = val;
        }
      }
    }
    if (
      Object.keys(secretPatch).length ||
      d.provider.clear_secret_keys?.length
    ) {
      await setSecrets("invoice_provider", d.provider.id, secretPatch, {
        clearKeys: d.provider.clear_secret_keys,
        updatedBy: gate.user?.id,
      });
    }
  }

  await saveCommerceSettings(next);
  await auditSettingsChange({
    actorId: gate.user?.id,
    actorEmail: gate.user?.email,
    area: "invoicing",
    message: "Invoicing settings updated",
    details: { active: next.invoicing.active_provider_id },
  });

  return NextResponse.json({ ok: true });
}

/** Test connection or test invoice document */
export async function POST(request: NextRequest) {
  const gate = await requireAdminApi("canMutateSettings");
  if (gate.error) return gate.error;

  const rl = rateLimit({
    key: `inv-test:${gate.user?.id}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let raw: { provider_id?: string; action?: "connection" | "document" };
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const providerId = raw.provider_id || "internal";
  const action = raw.action || "connection";
  ensureInvoiceProvidersRegistered();
  const provider = getInvoiceProvider(providerId);
  if (!provider) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  const commerce = await getCommerceSettings(true);
  const row = commerce.invoicing.providers.find((p) => p.id === providerId);
  const secrets = await getSecrets("invoice_provider", providerId);
  const store = await getStoreSettings(true);

  if (action === "document") {
    if (!provider.testDocument) {
      return NextResponse.json(
        { error: "Test document not supported" },
        { status: 400 }
      );
    }
    const result = await provider.testDocument({
      secrets,
      publicConfig: row?.public_config || {},
      invoicing: commerce.invoicing,
      store,
    });
    return NextResponse.json(result);
  }

  if (!provider.testConnection) {
    return NextResponse.json(
      { error: "Test connection not supported" },
      { status: 400 }
    );
  }
  const result = await provider.testConnection({
    secrets,
    publicConfig: row?.public_config || {},
  });

  const next = structuredClone(commerce);
  const target = next.invoicing.providers.find((p) => p.id === providerId);
  if (target) {
    target.connection_status = result.ok ? "ok" : "error";
    target.last_tested_at = new Date().toISOString();
    target.last_error = result.ok ? null : result.message;
  }
  await saveCommerceSettings(next);

  return NextResponse.json(result);
}
