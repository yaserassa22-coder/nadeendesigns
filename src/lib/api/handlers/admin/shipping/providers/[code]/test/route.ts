import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { rateLimit } from "@/lib/commerce/rate-limit";
import { ensureShippingCarriersRegistered } from "@/lib/shipping/carriers";
import {
  bindCarrierForCode,
  saveProviderPatch,
} from "@/lib/shipping/providers/store";

type Ctx = { params: Promise<{ code: string }> };

export async function POST(_request: NextRequest, ctx: Ctx) {
  const gate = await requireAdminApi("canMutateSettings");
  if (gate.error) return gate.error;

  const { code: raw } = await ctx.params;
  const code = decodeURIComponent(raw ?? "").trim().toLowerCase();

  const rl = rateLimit({
    key: `ship-test:${gate.user?.id}:${code}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many test attempts" },
      { status: 429 }
    );
  }

  ensureShippingCarriersRegistered();
  const carrier = await bindCarrierForCode(code);
  if (carrier.code === "noop") {
    return NextResponse.json(
      { error: "Unknown shipping provider" },
      { status: 404 }
    );
  }

  const result = await carrier.testConnection();
  const message = result.ok
    ? result.message
    : result.error || "Connection test failed";

  await saveProviderPatch({
    code,
    last_test_at: new Date().toISOString(),
    last_test_ok: result.ok,
    last_test_message: message,
  });

  return NextResponse.json({
    ok: result.ok,
    message,
    reason: result.ok ? undefined : result.reason,
    services: result.ok ? result.services ?? [] : [],
  });
}
