import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import {
  getCustomerAuthSettings,
  mergeCustomerAuthSettings,
  saveCustomerAuthSettings,
  getAuthEnvFlags,
} from "@/lib/customer-auth/settings";
import type { CustomerAuthSettings } from "@/types/customer-auth";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  const settings = await getCustomerAuthSettings(true);
  return NextResponse.json({ settings, flags: getAuthEnvFlags() });
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAdminApi("canMutateSettings");
  if (error) return error;

  const body = (await request.json().catch(() => ({}))) as Partial<CustomerAuthSettings>;
  const current = await getCustomerAuthSettings(true);
  const merged = mergeCustomerAuthSettings({ ...current, ...body });
  const saved = await saveCustomerAuthSettings(merged);
  return NextResponse.json({ settings: saved, flags: getAuthEnvFlags() });
}
