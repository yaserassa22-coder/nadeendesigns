import { NextRequest, NextResponse } from "next/server";
import { requireAdminManagersApi } from "@/lib/auth";
import { searchPromoteCandidates } from "@/lib/admin/administrators";

/** GET — search registered customers/users eligible for promotion. */
export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireAdminManagersApi();
    if (authError) return authError;

    const q = request.nextUrl.searchParams.get("q") || "";
    if (q.trim().length < 2) {
      return NextResponse.json({ candidates: [] });
    }

    const candidates = await searchPromoteCandidates(q, 25);
    return NextResponse.json({ candidates });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
