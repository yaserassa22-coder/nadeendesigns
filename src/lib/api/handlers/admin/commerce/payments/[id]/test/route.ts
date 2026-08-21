import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { rateLimit } from "@/lib/commerce/rate-limit";
import { getSecrets } from "@/lib/commerce/secrets/store";
import {
  getCommerceMode,
  getCommerceSettings,
  getPaymentRow,
  saveCommerceSettings,
} from "@/lib/commerce/settings";
import { ensurePaymentProvidersRegistered } from "@/lib/payments/providers";
import { getPaymentProvider } from "@/lib/payments/registry";
import { auditSettingsChange } from "@/lib/commerce/logging";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const gate = await requireAdminApi("canMutateSettings");
  if (gate.error) return gate.error;

  const { id } = await ctx.params;
  const rl = rateLimit({
    key: `pay-test:${gate.user?.id}:${id}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many test attempts" },
      { status: 429 }
    );
  }

  ensurePaymentProvidersRegistered();
  const provider = getPaymentProvider(id);
  if (!provider?.testConnection) {
    return NextResponse.json(
      { error: "Provider does not support test connection" },
      { status: 400 }
    );
  }

  const commerce = await getCommerceSettings(true);
  const row = getPaymentRow(commerce, id);
  const secrets = await getSecrets("payment_provider", id);
  const result = await provider.testConnection({
    secrets,
    publicConfig: row?.public_config || {},
    mode: getCommerceMode(commerce),
  });

  const next = structuredClone(commerce);
  const target = next.payments.providers.find((p) => p.id === id);
  if (target) {
    target.connection_status = result.ok ? "ok" : "error";
    target.last_tested_at = new Date().toISOString();
    target.last_error = result.ok ? null : result.message;
  }
  await saveCommerceSettings(next);

  await auditSettingsChange({
    actorId: gate.user?.id,
    actorEmail: gate.user?.email,
    area: "payments",
    message: `Test connection ${id}: ${result.ok ? "ok" : "failed"}`,
    details: { message: result.message },
  });

  return NextResponse.json(result);
}
