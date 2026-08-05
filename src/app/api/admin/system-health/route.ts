import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { getSystemHealthReport } from "@/lib/store/health";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const report = await getSystemHealthReport();
    return NextResponse.json(report);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "فشل فحص صحة النظام";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
