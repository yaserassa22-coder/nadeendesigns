import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/commerce/rate-limit";
import { processPaymentWebhook } from "@/lib/payments/service";
import { ensurePaymentProvidersRegistered } from "@/lib/payments/providers";
import { getPaymentProvider } from "@/lib/payments/registry";

type Ctx = { params: Promise<{ provider: string }> };

async function handleWebhook(request: NextRequest, providerId: string) {
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

  let rawBody = "";
  if (request.method === "GET") {
    const entries: Record<string, string> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      entries[key] = value;
    });
    rawBody = JSON.stringify(entries);
  } else {
    rawBody = await request.text();
  }

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

/**
 * POST /api/webhooks/payments/[provider]
 * Signature verification + idempotent processing per provider plugin.
 */
export async function POST(request: NextRequest, ctx: Ctx) {
  const { provider: providerId } = await ctx.params;
  return handleWebhook(request, providerId);
}

/**
 * GET — PayPlus (and similar) may deliver IPN/callback as GET with query params.
 */
export async function GET(request: NextRequest, ctx: Ctx) {
  const { provider: providerId } = await ctx.params;
  return handleWebhook(request, providerId);
}
