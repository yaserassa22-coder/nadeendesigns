import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/commerce/rate-limit";
import { processPaymentWebhook } from "@/lib/payments/service";
import { ensurePaymentProvidersRegistered } from "@/lib/payments/providers";
import { getPaymentProvider } from "@/lib/payments/registry";

type Ctx = { params: Promise<{ provider: string }> };

/**
 * POST /api/webhooks/payments/[provider]
 * Signature verification + idempotent processing per provider plugin.
 */
export async function POST(request: NextRequest, ctx: Ctx) {
  const { provider: providerId } = await ctx.params;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const rl = rateLimit({
    key: `wh:${providerId}:${ip}`,
    limit: 120,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }

  ensurePaymentProvidersRegistered();
  if (!getPaymentProvider(providerId)) {
    return NextResponse.json({ error: "unknown_provider" }, { status: 404 });
  }

  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const result = await processPaymentWebhook({
    providerId,
    rawBody,
    headers,
  });

  return NextResponse.json(result.body, { status: result.status });
}
