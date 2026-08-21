import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { searchAdminEntities } from "@/lib/admin/search";

export async function GET(request: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ groups: [] });
  }

  const groups = await searchAdminEntities(q);
  return NextResponse.json({ groups });
}
