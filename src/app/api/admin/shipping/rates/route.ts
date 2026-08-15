import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import {
  deleteShippingRate,
  listShippingRates,
  upsertShippingRate,
} from "@/lib/shipping/providers/store";
import { getShippingCarrierAdapter } from "@/lib/shipping/carriers/registry";
import { ensureShippingCarriersRegistered } from "@/lib/shipping/carriers";

export async function GET(request: NextRequest) {
  const gate = await requireAdminApi();
  if (gate.error) return gate.error;
  const provider = request.nextUrl.searchParams.get("provider") ?? undefined;
  const rates = await listShippingRates(provider || undefined);
  return NextResponse.json({ rates });
}

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  provider_code: z.string().min(1).max(64),
  service_code: z.string().min(1).max(80),
  service_name: z.string().max(120).nullable().optional(),
  price: z.number().nonnegative(),
  free_shipping_threshold: z.number().nonnegative().nullable().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export async function PUT(request: NextRequest) {
  const gate = await requireAdminApi("canMutateSettings");
  if (gate.error) return gate.error;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = upsertSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid payload" },
      { status: 400 }
    );
  }

  ensureShippingCarriersRegistered();
  if (!getShippingCarrierAdapter(parsed.data.provider_code)) {
    return NextResponse.json(
      { error: "Unknown shipping provider" },
      { status: 400 }
    );
  }

  const rate = await upsertShippingRate(parsed.data);
  return NextResponse.json({ ok: true, rate });
}

export async function DELETE(request: NextRequest) {
  const gate = await requireAdminApi("canMutateSettings");
  if (gate.error) return gate.error;
  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await deleteShippingRate(id);
  return NextResponse.json({ ok: true });
}
